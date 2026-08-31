import { useState, useEffect, useCallback } from 'react';
import { GroupProfile, StudentProfile, DojoMasterData, MissionRecord, GroupNote } from './types';
import { db, auth } from './firebase';
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp,
  setDoc, where, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CURRENT_SCHOOL_YEAR, MASTER_NINJAS, MASTER_SQUADS, scheduleField } from './masterRoster';
import { addMissionAttendanceToStudent, addMissionToGroup, upsertMissionRecord } from './missionArchive';
import { buildCloudMigrationPlan, teacherScopedId } from './cloudMigration';
import { RECOVERY_KEY, RecoverableSession } from './sessionRecovery';
import {
  normalizeActiveSession,
  normalizeGroupNote,
  normalizeGroupProfile,
  normalizeStoredGroupNotes,
  normalizeStoredGroups,
  normalizeStoredStudents,
  normalizeStudentProfile
} from './dataNormalization';

export type CloudStatus = 'online' | 'syncing' | 'offline' | 'unconfigured' | 'error' | 'unauthenticated';

export interface CloudCheckResult {
  ok: boolean;
  checkedAt: string;
  message: string;
}

const LOCAL_DATA_KEYS = [
  'wrs_dojo_groups',
  'wrs_dojo_students',
  'wrs_dojo_missions',
  'wrs_dojo_group_notes',
  RECOVERY_KEY
];

const localDataExists = () => (
  typeof window !== 'undefined' && LOCAL_DATA_KEYS.some(key => window.localStorage.getItem(key) !== null)
);

const errorMessage = (context: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  return `${context}: ${detail}`;
};

const hasInstructionalProfileContent = (group?: GroupProfile) => {
  const profile = group?.instructionalProfile;
  return Boolean(profile && (
    profile.currentSubstep ||
    profile.lessonFocus ||
    profile.currentCardRepository.length ||
    profile.reviewCardRepository.length ||
    profile.practicedWordElements.length ||
    profile.highFrequencyWords.length ||
    profile.troubleSpots.length ||
    profile.conceptsToWeave.length ||
    profile.nextLessonNotes
  ));
};

const mergeCurriculumScope = (existing: GroupProfile['instructionalProfile'] | undefined, baseline: GroupProfile['instructionalProfile']) => {
  if (!existing || existing.curriculumScopeVersion === 2 || existing.curriculumScopeVersion === 3 || !baseline) return baseline;
  const unique = (items: string[]) => [...new Set(items)];
  return {
    ...baseline,
    lessonFocus: existing.lessonFocus || baseline.lessonFocus,
    reviewCardRepository: unique([...baseline.reviewCardRepository, ...existing.reviewCardRepository]),
    practicedWordElements: unique([...baseline.practicedWordElements, ...existing.practicedWordElements]),
    troubleSpots: existing.troubleSpots,
    conceptsToWeave: unique([...baseline.conceptsToWeave, ...existing.conceptsToWeave]),
    nextLessonNotes: existing.nextLessonNotes || baseline.nextLessonNotes
  };
};

export const useMasterData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [groupNotes, setGroupNotes] = useState<GroupNote[]>([]);
  const [activeSession, setActiveSession] = useState<DojoMasterData['activeSession'] | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('unauthenticated');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastCloudSaveAt, setLastCloudSaveAt] = useState<string | null>(null);
  const [lastCloudCheckAt, setLastCloudCheckAt] = useState<string | null>(null);
  const [hasLocalData, setHasLocalData] = useState(localDataExists);
  const [isInitializing, setIsInitializing] = useState(true);

  const readLocalCollection = <T,>(key: string, fallback: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    try {
      return JSON.parse(stored) as T;
    } catch (error) {
      console.warn(`Ignoring unreadable local data in ${key}`, error);
      return fallback;
    }
  };

  const markCloudSuccess = useCallback((confirmedSave = true) => {
    const now = new Date().toISOString();
    setCloudStatus('online');
    setCloudError(null);
    if (confirmedSave) setLastCloudSaveAt(now);
    return now;
  }, []);

  const markCloudFailure = useCallback((context: string, error: unknown) => {
    const message = errorMessage(context, error);
    console.error(message, error);
    setCloudStatus('error');
    setCloudError(message);
    return message;
  }, []);

  // 1. Handle Authentication
  useEffect(() => {
    const enterGuestMode = () => {
      setUser({ uid: 'guest-sensei', displayName: 'Guest Sensei' } as User);
      setGroups(normalizeStoredGroups(readLocalCollection<unknown>('wrs_dojo_groups', MASTER_SQUADS), MASTER_SQUADS));
      setStudents(normalizeStoredStudents(readLocalCollection<unknown>('wrs_dojo_students', MASTER_NINJAS), MASTER_NINJAS));
      setGroupNotes(normalizeStoredGroupNotes(readLocalCollection<unknown>('wrs_dojo_group_notes', [])));
      setCloudStatus('offline');
      setCloudError(null);
      setHasLocalData(localDataExists());
      setIsInitializing(false);
    };

    const safetyTimer = window.setTimeout(() => {
      console.warn('Firebase Auth timed out. Entering Guest Mode.');
      enterGuestMode();
    }, 5000);

    try {
      const unsubscribe = onAuthStateChanged(auth, authenticatedUser => {
        window.clearTimeout(safetyTimer);
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setCloudError(null);
          setHasLocalData(localDataExists());
        } else {
          enterGuestMode();
        }
      });
      return () => {
        unsubscribe();
        window.clearTimeout(safetyTimer);
      };
    } catch (error) {
      window.clearTimeout(safetyTimer);
      console.error('Auth initialization failed', error);
      enterGuestMode();
    }
  }, []);

  // 2. Real-time Firestore listeners
  useEffect(() => {
    if (!user || user.uid === 'guest-sensei') return;

    setCloudStatus('syncing');

    const qStudents = query(collection(db, 'students'), where('teacherId', '==', user.uid));
    const unsubStudents = onSnapshot(qStudents, snapshot => {
      setStudents(snapshot.docs.map(snapshotDoc => normalizeStudentProfile(snapshotDoc.id, snapshotDoc.data())));
      markCloudSuccess(false);
      setIsInitializing(false);
    }, error => {
      markCloudFailure('Student roster sync failed', error);
      setIsInitializing(false);
    });

    const qSquads = query(collection(db, 'squads'), where('teacherId', '==', user.uid));
    const unsubSquads = onSnapshot(qSquads, snapshot => {
      setGroups(snapshot.docs.map(snapshotDoc => normalizeGroupProfile(snapshotDoc.id, snapshotDoc.data())));
      setIsInitializing(false);
    }, error => {
      markCloudFailure('Group sync failed', error);
      setIsInitializing(false);
    });

    const unsubSession = onSnapshot(doc(db, 'active_sessions', user.uid), snapshot => {
      if (!snapshot.exists()) {
        setActiveSession(null);
        return;
      }

      const data = normalizeActiveSession(snapshot.data());
      if (!data) {
        console.warn('Ignoring an incomplete unfinished lesson record.');
        setActiveSession(null);
        return;
      }
      if (data.wordDistribution && typeof data.wordDistribution !== 'string') {
        data.wordDistribution = JSON.stringify(data.wordDistribution);
      }
      setActiveSession(data);
    }, error => markCloudFailure('Unfinished lesson sync failed', error));

    const qGroupNotes = query(collection(db, 'group_notes'), where('teacherId', '==', user.uid));
    const unsubGroupNotes = onSnapshot(qGroupNotes, snapshot => {
      const nextNotes = snapshot.docs.map(snapshotDoc => normalizeGroupNote(snapshotDoc.id, snapshotDoc.data()));
      nextNotes.sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
      setGroupNotes(nextNotes);
    }, error => {
      console.error('Group notes sync failed', error);
      setGroupNotes([]);
    });

    return () => {
      unsubStudents();
      unsubSquads();
      unsubSession();
      unsubGroupNotes();
    };
  }, [markCloudFailure, markCloudSuccess, user]);

  // 3. Writes to Firestore or localStorage
  const updateSession = useCallback(async (session: DojoMasterData['activeSession'] | null): Promise<boolean> => {
    if (!user || user.uid === 'guest-sensei') {
      setActiveSession(session);
      return true;
    }

    setCloudStatus('syncing');
    try {
      const sessionRef = doc(db, 'active_sessions', user.uid);
      if (session) {
        const dataToSave = { ...session };
        if (dataToSave.wordDistribution && typeof dataToSave.wordDistribution !== 'string') {
          dataToSave.wordDistribution = JSON.stringify(dataToSave.wordDistribution);
        }
        await setDoc(sessionRef, { ...dataToSave, lastUpdated: serverTimestamp() });
      } else {
        await deleteDoc(sessionRef);
      }
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure('Unfinished lesson could not be saved', error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const saveData = useCallback(async (
    updatedGroups: GroupProfile[],
    updatedStudents: StudentProfile[],
    session: DojoMasterData['activeSession'] | null = null
  ) => {
    if (!user) return false;

    if (user.uid === 'guest-sensei') {
      setGroups(updatedGroups);
      setStudents(updatedStudents);
      setActiveSession(session);
      localStorage.setItem('wrs_dojo_groups', JSON.stringify(updatedGroups));
      localStorage.setItem('wrs_dojo_students', JSON.stringify(updatedStudents));
      setHasLocalData(true);
      return true;
    }

    return updateSession(session);
  }, [updateSession, user]);

  const updateStudent = useCallback(async (student: StudentProfile) => {
    if (!user) return false;
    if (user.uid === 'guest-sensei') {
      setStudents(current => {
        const updated = current.some(candidate => candidate.id === student.id)
          ? current.map(candidate => candidate.id === student.id ? student : candidate)
          : [...current, student];
        localStorage.setItem('wrs_dojo_students', JSON.stringify(updated));
        return updated;
      });
      setHasLocalData(true);
      return true;
    }

    setCloudStatus('syncing');
    try {
      await setDoc(doc(db, 'students', student.id), {
        ...student,
        teacherId: user.uid,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure(`Student ${student.name} could not be saved`, error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const updateSquad = useCallback(async (squad: GroupProfile) => {
    if (!user) return false;
    if (user.uid === 'guest-sensei') {
      setGroups(current => {
        const updated = current.some(candidate => candidate.id === squad.id)
          ? current.map(candidate => candidate.id === squad.id ? squad : candidate)
          : [...current, squad];
        localStorage.setItem('wrs_dojo_groups', JSON.stringify(updated));
        return updated;
      });
      setHasLocalData(true);
      return true;
    }

    setCloudStatus('syncing');
    try {
      await setDoc(doc(db, 'squads', squad.id), {
        ...squad,
        teacherId: user.uid,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure(`Group ${squad.name} could not be saved`, error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const saveGroupNote = useCallback(async (
    note: Omit<GroupNote, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    if (!user || !note.content.trim()) return false;

    const createdAt = new Date().toISOString();
    const id = globalThis.crypto?.randomUUID?.() || `group-note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record: GroupNote = {
      ...note,
      id,
      teacherId: user.uid,
      content: note.content.trim(),
      createdAt
    };

    if (user.uid === 'guest-sensei') {
      setGroupNotes(current => {
        const updated = [record, ...current];
        localStorage.setItem('wrs_dojo_group_notes', JSON.stringify(updated));
        return updated;
      });
      setHasLocalData(true);
      return true;
    }

    setCloudStatus('syncing');
    try {
      await setDoc(doc(db, 'group_notes', id), {
        ...record,
        updatedAt: serverTimestamp()
      });
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure('Group note could not be saved', error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const archiveMission = useCallback(async (mission: MissionRecord): Promise<'local' | 'cloud'> => {
    if (!user) throw new Error('No active teacher session.');

    const attendance = mission.attendance?.length
      ? mission.attendance
      : mission.results.map(result => ({
          studentId: result.studentId,
          studentName: result.studentName,
          status: 'present' as const
        }));
    const nextStudents = students.map(student => {
      const attendanceEntry = attendance.find(candidate => candidate.studentId === student.id);
      if (!attendanceEntry) return student;
      const result = mission.results.find(candidate => candidate.studentId === student.id);
      return addMissionAttendanceToStudent(student, mission, attendanceEntry.status, result);
    });
    const nextGroups = groups.map(group =>
      group.id === mission.squadId ? addMissionToGroup(group, mission) : group
    );

    if (user.uid === 'guest-sensei') {
      const existingMissions = readLocalCollection<MissionRecord[]>('wrs_dojo_missions', []);
      localStorage.setItem('wrs_dojo_missions', JSON.stringify(upsertMissionRecord(existingMissions, mission)));
      localStorage.setItem('wrs_dojo_students', JSON.stringify(nextStudents));
      localStorage.setItem('wrs_dojo_groups', JSON.stringify(nextGroups));
      setStudents(nextStudents);
      setGroups(nextGroups);
      setHasLocalData(true);
      return 'local';
    }

    setCloudStatus('syncing');
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'missions', mission.id), {
        ...mission,
        teacherId: user.uid,
        lastUpdated: serverTimestamp()
      });

      attendance.forEach(attendanceEntry => {
        const student = nextStudents.find(candidate => candidate.id === attendanceEntry.studentId);
        if (!student) return;
        batch.set(doc(db, 'students', student.id), {
          history: student.history,
          attendanceCount: student.attendanceCount,
          ...(student.lastSeen ? { lastSeen: student.lastSeen } : {}),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      const group = nextGroups.find(candidate => candidate.id === mission.squadId);
      if (group) {
        batch.set(doc(db, 'squads', group.id), {
          history: group.history,
          lastLessonDate: group.lastLessonDate,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      setStudents(nextStudents);
      setGroups(nextGroups);
      markCloudSuccess();
      return 'cloud';
    } catch (error) {
      markCloudFailure('Mission results could not be archived', error);
      throw error;
    }
  }, [groups, markCloudFailure, markCloudSuccess, students, user]);

  const deleteSquad = useCallback(async (squadId: string) => {
    if (!user) return false;
    if (user.uid === 'guest-sensei') {
      setGroups(current => {
        const updated = current.filter(group => group.id !== squadId);
        localStorage.setItem('wrs_dojo_groups', JSON.stringify(updated));
        return updated;
      });
      setHasLocalData(true);
      return true;
    }

    setCloudStatus('syncing');
    try {
      await deleteDoc(doc(db, 'squads', squadId));
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure('Group could not be deleted', error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const deleteStudent = useCallback(async (studentId: string) => {
    if (!user) return false;
    if (user.uid === 'guest-sensei') {
      setStudents(current => {
        const updated = current.filter(student => student.id !== studentId);
        localStorage.setItem('wrs_dojo_students', JSON.stringify(updated));
        return updated;
      });
      setHasLocalData(true);
      return true;
    }

    setCloudStatus('syncing');
    try {
      await deleteDoc(doc(db, 'students', studentId));
      markCloudSuccess();
      return true;
    } catch (error) {
      markCloudFailure('Student could not be deleted', error);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const migrateLocalData = useCallback(async () => {
    if (!user || user.uid === 'guest-sensei' || !localDataExists()) return false;

    const localStudents = readLocalCollection<StudentProfile[]>('wrs_dojo_students', []);
    const localGroups = readLocalCollection<GroupProfile[]>('wrs_dojo_groups', []);
    const localMissions = readLocalCollection<MissionRecord[]>('wrs_dojo_missions', []);
    const recoverable = readLocalCollection<RecoverableSession | null>(RECOVERY_KEY, null);
    const itemCount = localStudents.length + localGroups.length + localMissions.length + (recoverable ? 1 : 0);

    const shouldMigrate = window.confirm(
        `Upload ${itemCount} local Dojo record${itemCount === 1 ? '' : 's'} to this Cloud account? ` +
      'Students, groups, mission scores, notes, and the unfinished lesson will stay connected.'
    );
    if (!shouldMigrate) return false;

    setCloudStatus('syncing');
    try {
      const plan = buildCloudMigrationPlan({
        teacherId: user.uid,
        students: localStudents,
        groups: localGroups,
        missions: localMissions,
        activeSession: recoverable
      });

      const writes = [
        ...plan.students.map(student => ({ collectionName: 'students', id: student.id, data: { ...student, teacherId: user.uid } })),
        ...plan.groups.map(group => ({ collectionName: 'squads', id: group.id, data: { ...group, teacherId: user.uid } })),
        ...plan.missions.map(mission => ({ collectionName: 'missions', id: mission.id, data: mission }))
      ];

      // Firestore batches allow at most 500 writes. Local data is removed only
      // after every chunk succeeds, so retrying a partial migration remains safe.
      for (let offset = 0; offset < writes.length; offset += 400) {
        const batch = writeBatch(db);
        writes.slice(offset, offset + 400).forEach(write => {
          batch.set(doc(db, write.collectionName, write.id), {
            ...write.data,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      }

      if (plan.activeSession) {
        const dataToSave = { ...plan.activeSession };
        if (dataToSave.wordDistribution && typeof dataToSave.wordDistribution !== 'string') {
          dataToSave.wordDistribution = JSON.stringify(dataToSave.wordDistribution);
        }
        await setDoc(doc(db, 'active_sessions', user.uid), {
          ...dataToSave,
          lastUpdated: serverTimestamp()
        });
        setActiveSession(plan.activeSession);
      }

      LOCAL_DATA_KEYS.forEach(key => localStorage.removeItem(key));
      setHasLocalData(false);
      markCloudSuccess();
      window.alert(
        `Migration complete: ${plan.students.length} students, ${plan.groups.length} groups, ` +
        `${plan.missions.length} mission records${plan.activeSession ? ', and 1 unfinished lesson' : ''} are now in the Cloud.`
      );
      return true;
    } catch (error) {
      const message = markCloudFailure('Guest data migration failed', error);
      window.alert(`${message}\n\nYour browser copy was kept intact. You can safely try again.`);
      return false;
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const verifyCloudPersistence = useCallback(async (): Promise<CloudCheckResult> => {
    const checkedAt = new Date().toISOString();
    if (!user || user.uid === 'guest-sensei') {
      return { ok: false, checkedAt, message: 'Connect a Cloud account before running the save check.' };
    }

    setCloudStatus('syncing');
    try {
      const checkRef = doc(db, 'sync_checks', user.uid);
      const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
      await setDoc(checkRef, {
        teacherId: user.uid,
        token,
        checkedAt,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      const savedCheck = await getDoc(checkRef);
      if (!savedCheck.exists() || savedCheck.data().token !== token) {
        throw new Error('The verification record did not read back correctly.');
      }

      const confirmedAt = markCloudSuccess();
      setLastCloudCheckAt(confirmedAt);
      return { ok: true, checkedAt: confirmedAt, message: 'Cloud write and read-back both succeeded.' };
    } catch (error) {
      const message = markCloudFailure('Cloud save check failed', error);
      setLastCloudCheckAt(checkedAt);
      return { ok: false, checkedAt, message };
    }
  }, [markCloudFailure, markCloudSuccess, user]);

  const resetToMasterRoster = useCallback(async () => {
    if (!user || user.uid === 'guest-sensei') {
      window.alert('Please connect a Cloud account before initializing the Master Roster.');
      return false;
    }

    if (!window.confirm(
      `Apply the confirmed ${CURRENT_SCHOOL_YEAR} roster and source-based group baselines? Matching groups and student records keep their history; only retired records are archived.`
    )) {
      return false;
    }

    setCloudStatus('syncing');
    try {
      const batch = writeBatch(db);
      const studentIdMap = new Map<string, string>();
      const templatesByName = new Map(MASTER_NINJAS.map(student => [student.name.trim().toLowerCase(), student]));
      // The initial roster used Elise; the confirmed 2026–27 roster uses Ellie.
      // Treat that older record as the same student so her existing data is retained.
      templatesByName.set('elise', MASTER_NINJAS.find(student => student.id === 'student-elise')!);
      const existingByName = new Map(students.map(student => [student.name.trim().toLowerCase(), student]));
      const activatedAt = new Date().toISOString();

      MASTER_NINJAS.forEach(ninja => {
        const existing = existingByName.get(ninja.name.trim().toLowerCase()) ||
          (ninja.id === 'student-elise' ? existingByName.get('elise') : undefined);
        const uniqueId = existing?.id || teacherScopedId(ninja.id, user.uid);
        studentIdMap.set(ninja.id, uniqueId);
        batch.set(doc(db, 'students', uniqueId), {
          ...(existing ? {} : ninja),
          id: uniqueId,
          name: ninja.name,
          active: true,
          schoolYear: CURRENT_SCHOOL_YEAR,
          archivedAt: null,
          teacherId: user.uid,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      students.forEach(student => {
        if (templatesByName.has(student.name.trim().toLowerCase())) return;
        if (student.active === false) return;
        batch.set(doc(db, 'students', student.id), {
          active: false,
          archivedAt: activatedAt,
          schoolYear: student.schoolYear || '2025-26',
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      const currentGroupIds = new Set(MASTER_SQUADS.map(group => teacherScopedId(group.id, user.uid)));

      groups.forEach(group => {
        if (currentGroupIds.has(group.id) || group.active === false) return;
        batch.set(doc(db, 'squads', group.id), {
          active: false,
          archivedAt: activatedAt,
          schoolYear: group.schoolYear || '2025-26',
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      MASTER_SQUADS.forEach(squad => {
        const uniqueId = teacherScopedId(squad.id, user.uid);
        const existing = groups.find(group => group.id === uniqueId);
        batch.set(doc(db, 'squads', uniqueId), {
          ...(existing ? {} : squad),
          id: uniqueId,
          name: squad.name,
          // Group 4B does not have a confirmed schedule yet. Omitting this key
          // also preserves an existing teacher-entered schedule on a rerun.
          ...scheduleField(squad.schedule),
          active: true,
          schoolYear: CURRENT_SCHOOL_YEAR,
          archivedAt: null,
          ...(existing?.instructionalProfile?.curriculumScopeVersion === 2 || existing?.instructionalProfile?.curriculumScopeVersion === 3
            ? {}
            : { instructionalProfile: mergeCurriculumScope(existing?.instructionalProfile, squad.instructionalProfile) }),
          studentIds: squad.studentIds.map(studentId => studentIdMap.get(studentId) || studentId),
          teacherId: user.uid,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      markCloudSuccess();
      window.alert(`${CURRENT_SCHOOL_YEAR} roster and group baselines are ready. Matching records kept their history; only retired records remain archived in the Cloud.`);
      return true;
    } catch (error) {
      const message = markCloudFailure('Master Roster initialization failed', error);
      window.alert(`${message}\n\nCheck that the Firestore rules from FIREBASE_SETUP.md have been published.`);
      return false;
    }
  }, [groups, markCloudFailure, markCloudSuccess, students, user]);

  const activeGroups = groups.filter(group => group.active !== false);
  const archivedGroups = groups.filter(group => group.active === false);
  const activeStudents = students.filter(student => student.active !== false);
  const archivedStudents = students.filter(student => student.active === false);
  const currentRosterReady = MASTER_SQUADS.every(template =>
    activeGroups.some(group =>
      group.name === template.name &&
      group.schoolYear === CURRENT_SCHOOL_YEAR &&
      (group.instructionalProfile?.curriculumScopeVersion === 2 || group.instructionalProfile?.curriculumScopeVersion === 3)
    )
  );

  return {
    user,
    groups: activeGroups,
    archivedGroups,
    students: activeStudents,
    archivedStudents,
    groupNotes,
    currentRosterReady,
    activeSession,
    cloudStatus,
    cloudError,
    lastCloudSaveAt,
    lastCloudCheckAt,
    hasLocalData,
    isInitializing,
    saveData,
    updateStudent,
    updateSquad,
    deleteStudent,
    deleteSquad,
    updateSession,
    saveGroupNote,
    archiveMission,
    migrateLocalData,
    verifyCloudPersistence,
    resetToMasterRoster
  };
};
