import { DAILY_NOTE_TABS } from './planningSheetRead.js';

const SCHOOL_YEAR = '2026-27';
const STATE_VERSION = 'wrs-planning-operational-state-v1';
const HISTORY_VERSION = 'wrs-group-selection-history-v1';
const COLLECTION = 'planning_group_state';
const FINGERPRINT = /^sha256:[a-f0-9]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SUBSTEP = /^\d+\.\d+$/;

const text = value => value == null ? '' : String(value).trim();
const isoDateTime = value => {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate));
};
const plainObject = value => (
  value && typeof value === 'object' && !Array.isArray(value)
);

export const PLANNING_STATE_COLLECTION = COLLECTION;

export function assertPlanningGroupId(groupId) {
  const value = text(groupId);
  if (!DAILY_NOTE_TABS.includes(value)) {
    throw new Error(`Unsupported planning group: ${value || '(blank)'}.`);
  }
  return value;
}

export function planningStateDocId(teacherId, groupId) {
  const uid = text(teacherId);
  if (!uid) throw new Error('teacherId is required.');
  const group = assertPlanningGroupId(groupId);
  return `${uid}__${group}`;
}

export function validateSelectionHistory(history, groupId) {
  if (!plainObject(history)) throw new Error('selectionHistory must be an object.');
  if (history.schemaVersion !== HISTORY_VERSION) {
    throw new Error(`selectionHistory must use ${HISTORY_VERSION}.`);
  }
  if (history.schoolYear !== SCHOOL_YEAR) {
    throw new Error(`selectionHistory must be for ${SCHOOL_YEAR}.`);
  }
  if (text(history.groupId) !== groupId) {
    throw new Error('selectionHistory groupId does not match groupId.');
  }
  if (!isoDateTime(history.updatedAt)) {
    throw new Error('selectionHistory.updatedAt must be an ISO date-time.');
  }
  if (!Array.isArray(history.lessons)) {
    throw new Error('selectionHistory.lessons must be an array.');
  }
  if (history.lessons.length > 400) {
    throw new Error('selectionHistory exceeds the supported lesson-event limit.');
  }

  for (const event of history.lessons) {
    if (!plainObject(event)) throw new Error('selectionHistory contains an invalid lesson event.');
    if (!text(event.eventId) || !text(event.lessonId) || !DATE.test(text(event.date))) {
      throw new Error('selectionHistory contains an event with invalid identity/date fields.');
    }
    if (!SUBSTEP.test(text(event.substep))) {
      throw new Error('selectionHistory contains an event with an invalid Substep.');
    }
    if (!['introduction', 'accuracy', 'automaticity-fluency'].includes(text(event.focus))) {
      throw new Error('selectionHistory contains an event with an invalid focus.');
    }
    if (!['completed', 'partial'].includes(text(event.completionStatus))) {
      throw new Error('selectionHistory contains an event with an invalid completionStatus.');
    }
    if (!Array.isArray(event.completedParts)
      || event.completedParts.some(part => !Number.isInteger(part) || part < 1 || part > 10)) {
      throw new Error('selectionHistory contains invalid completedParts.');
    }
    if (!text(event.sourceRef) || !plainObject(event.selections)) {
      throw new Error('selectionHistory contains an event without source/selections.');
    }
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(history), 'utf8');
  if (serializedBytes > 700_000) {
    throw new Error('selectionHistory is too large for the operational state document.');
  }
  return history;
}

export function validateValidatedArtifact(artifact, plannedDate) {
  if (!DATE.test(text(plannedDate))) throw new Error('plannedDate must be YYYY-MM-DD.');
  if (!plainObject(artifact)) throw new Error('validatedArtifact must be an object.');

  const currentFingerprint = text(artifact.currentFingerprint);
  const validatedFingerprint = text(artifact.validatedFingerprint);
  if (!FINGERPRINT.test(currentFingerprint) || !FINGERPRINT.test(validatedFingerprint)) {
    throw new Error('validatedArtifact fingerprints must be sha256 values.');
  }
  if (currentFingerprint !== validatedFingerprint) {
    throw new Error('validatedArtifact fingerprints must match before persistence.');
  }
  if (!isoDateTime(artifact.lastValidatedAt)) {
    throw new Error('validatedArtifact.lastValidatedAt must be an ISO date-time.');
  }

  for (const key of ['runtimeRef', 'teacherPlanRef']) {
    const value = artifact[key];
    if (value != null && !text(value)) {
      throw new Error(`validatedArtifact.${key} must be a non-empty string or null.`);
    }
  }

  return {
    currentFingerprint,
    validatedFingerprint,
    runtimeRef: artifact.runtimeRef == null ? null : text(artifact.runtimeRef),
    teacherPlanRef: artifact.teacherPlanRef == null ? null : text(artifact.teacherPlanRef),
    lastValidatedAt: text(artifact.lastValidatedAt)
  };
}

const defaultState = ({ teacherId, groupId }) => ({
  schemaVersion: STATE_VERSION,
  schoolYear: SCHOOL_YEAR,
  teacherId,
  groupId,
  selectionHistory: null,
  validatedArtifacts: {},
  updatedAt: null
});

const normalizeStoredState = ({ data, teacherId, groupId }) => {
  if (!plainObject(data)
    || data.schemaVersion !== STATE_VERSION
    || data.schoolYear !== SCHOOL_YEAR
    || text(data.teacherId) !== teacherId
    || text(data.groupId) !== groupId) {
    return defaultState({ teacherId, groupId });
  }

  const selectionHistory = plainObject(data.selectionHistory)
    && data.selectionHistory.schemaVersion === HISTORY_VERSION
    && text(data.selectionHistory.groupId) === groupId
    ? data.selectionHistory
    : null;
  const validatedArtifacts = plainObject(data.validatedArtifacts)
    ? data.validatedArtifacts
    : {};

  return {
    schemaVersion: STATE_VERSION,
    schoolYear: SCHOOL_YEAR,
    teacherId,
    groupId,
    selectionHistory,
    validatedArtifacts,
    updatedAt: text(data.updatedAt) || null
  };
};

export async function readPlanningOperationalStates({ firestore, teacherId }) {
  const uid = text(teacherId);
  if (!uid) throw new Error('teacherId is required.');
  if (!firestore?.collection) throw new Error('A Firestore client is required.');

  const entries = await Promise.all(DAILY_NOTE_TABS.map(async groupId => {
    const ref = firestore.collection(COLLECTION).doc(planningStateDocId(uid, groupId));
    const snapshot = await ref.get();
    const state = snapshot?.exists
      ? normalizeStoredState({ data: snapshot.data(), teacherId: uid, groupId })
      : defaultState({ teacherId: uid, groupId });
    return [groupId, state];
  }));

  return Object.fromEntries(entries);
}

export async function savePlanningOperationalState({
  firestore,
  teacherId,
  groupId,
  selectionHistory,
  plannedDate,
  validatedArtifact,
  updatedAt = new Date().toISOString()
}) {
  const uid = text(teacherId);
  if (!uid) throw new Error('teacherId is required.');
  if (!firestore?.collection) throw new Error('A Firestore client is required.');
  const group = assertPlanningGroupId(groupId);
  if (!isoDateTime(updatedAt)) throw new Error('updatedAt must be an ISO date-time.');

  const hasHistory = selectionHistory !== undefined;
  const hasArtifact = validatedArtifact !== undefined;
  if (!hasHistory && !hasArtifact) {
    throw new Error('At least one planning state update is required.');
  }

  const patch = {
    schemaVersion: STATE_VERSION,
    schoolYear: SCHOOL_YEAR,
    teacherId: uid,
    groupId: group,
    updatedAt: text(updatedAt)
  };

  if (hasHistory) {
    patch.selectionHistory = validateSelectionHistory(selectionHistory, group);
  }

  if (hasArtifact) {
    const day = text(plannedDate);
    patch.validatedArtifacts = {
      [day]: validateValidatedArtifact(validatedArtifact, day)
    };
  }

  const ref = firestore.collection(COLLECTION).doc(planningStateDocId(uid, group));
  await ref.set(patch, { merge: true });

  return {
    groupId: group,
    updatedAt: patch.updatedAt,
    selectionHistorySaved: hasHistory,
    validatedArtifactDate: hasArtifact ? text(plannedDate) : null
  };
}

export function planningStateForExport(statesByGroup) {
  const groups = {};
  const validatedArtifacts = {};

  for (const groupId of DAILY_NOTE_TABS) {
    const state = statesByGroup?.[groupId];
    groups[groupId] = {
      selectionHistory: state?.selectionHistory ?? null
    };

    const artifacts = plainObject(state?.validatedArtifacts) ? state.validatedArtifacts : {};
    for (const [plannedDate, artifact] of Object.entries(artifacts)) {
      if (!DATE.test(plannedDate) || !plainObject(artifact)) continue;
      try {
        validatedArtifacts[`${groupId}:${plannedDate}`] = validateValidatedArtifact(artifact, plannedDate);
      } catch {
        // Corrupt/stale metadata never earns reuse. Omit it so the queue requires a rebuild.
      }
    }
  }

  return { groups, validatedArtifacts };
}
