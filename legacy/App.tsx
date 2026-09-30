
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import LessonForm from './components/LessonForm';
import Layout from './components/Layout';
import GroupDashboard from './components/GroupDashboard';
import SessionDossier, { UnassignedLessonCompletion } from './components/SessionDossier';
import PresenterSetupDialog from './components/PresenterSetupDialog';
import StudentScreenJoinDialog from './components/StudentScreenJoinDialog';
import { Lesson, LessonPart, GroupProfile, StudentProfile, WordCard } from './types';
import { printLessonToNewWindow } from './utils/printLesson';
import { shuffleArray } from './utils';
import { RefreshCw, Flame, AlertTriangle, X, MonitorUp, Maximize2 } from 'lucide-react';
import { useMasterData } from './useMasterData';
import { LessonLibraryProvider, useLessonLibrary } from './useLessonLibrary';
import {
  createInitialLessonSession, lessonSessionFromCloud, lessonSessionsMatch,
  lessonSessionToCloud, useLessonSession
} from './useLessonSession';
import { createMissionId } from './missionArchive';

// Modules
import MissionBriefing from './components/modules/MissionBriefing'; 
import QuickDrill from './components/modules/QuickDrill';
import { BoardSafeProvider } from './components/boardSafeContext';
import WordCards from './components/modules/WordCards';
import SentenceReading from './components/modules/SentenceReading';
import TeachConcepts from './components/modules/TeachConcepts';
import Spelling from './components/modules/Spelling';
import WordlistReading from './components/modules/WordlistReading';
import PassageReading from './components/modules/PassageReading';
import Part10Listening from './components/modules/Part10Listening';

import MissionPlayer from './components/MissionPlayer';
import {
  RecoverableSession,
  clearRecoverableSession,
  loadRecoverableSession
} from './sessionRecovery';
import { useGroupSpots } from './useGroupSpots';
import { LessonStatusProvider, useLessonStatusData } from './useLessonStatus';
import UnfinishedLessonPrompt from './components/UnfinishedLessonPrompt';
import {
  GroupSpot, buildSpot, launchDecision, migrateLegacySpots, readMigratedSessionIds,
  resolveSpotLesson, resumeSession, spotDateStarted, spotLessonSourceOf, writeMigratedSessionIds
} from './groupSpots';
import { localDateString } from './lessonLibrary';
import {
  createPresenterSnapshot,
  createPresenterCode,
  createStudentDisplayUrl,
  isPresenterCode,
  isPresenterSnapshot,
  isNewerPresenterSnapshot,
  isStudentDisplayRequest,
  normalizePresenterCode,
  PRESENTER_CHANNEL,
  PRESENTER_EVENT_KEY,
  presenterSnapshotOrder,
  presenterStateKey,
  PresenterConnectionStatus,
  PresenterMessage,
  PresenterSnapshot,
  requestedPresenterId
} from './presenterMode';
import { useCloudPresenter } from './useCloudPresenter';
import { DrawingStroke, updateDrawingSurface } from './drawingSync';
import { clearSafeBootMode, isSafeBootMode } from './safeBoot';
import {
  nextLessonSyncRevision,
  normalizeLessonSyncRevision,
  shouldApplyIncomingLessonState,
  shouldResetQuickDrillForPartChange
} from './lessonSessionSync';
import { buildWordDistribution, chartingWordCardsForLesson, hasCompleteWordDistribution, targetWordCount } from './wordDistribution';
import { part3WordCardsForLesson } from './wordCardsState';
import { chartingPlanForLesson, dealLeveledCharting, defaultDealSettings, CHARTING_WORDS_PER_STUDENT } from './chartingWordBank';

const App: React.FC = () => {
  const { 
    user, groups, archivedGroups, students, archivedStudents, groupNotes, currentRosterReady, activeSession, cloudStatus, cloudError, lastCloudSaveAt,
    lastCloudCheckAt, hasLocalData, isInitializing, updateStudent, updateSquad,
    deleteStudent, deleteSquad, updateSession, archiveMission, migrateLocalData,
    verifyCloudPersistence, resetToMasterRoster, saveGroupNote
  } = useMasterData();
  const lessonLibrary = useLessonLibrary(user);
  const groupSpots = useGroupSpots(user);
  const lessonStatus = useLessonStatusData(user, groups, groupSpots.spots);
  const { getSpot, saveSpot, clearSpot } = groupSpots;

  const [activeGroup, setActiveGroup] = useState<GroupProfile | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentPart, setCurrentPart] = useState<LessonPart>(LessonPart.Briefing);
  const [mode, setMode] = useState<'dashboard' | 'edit' | 'run' | 'mission'>('dashboard');
  const [isSessionDossierOpen, setIsSessionDossierOpen] = useState(false);
  const {
    session: lessonSession, resetLessonSession, replaceLessonSession, touchLessonSession,
    setSessionStudentIds, setSessionScores, setSessionNotes, setSessionDistribution,
    setSessionWordlistPage, setSessionQuickDrillIndex, setSessionQuickDrillRevealed,
    setSessionQuickDrillHandwriting, setSessionQuickDrillItems, setSessionWordCards, setSessionSentenceIndex,
    setSessionTeachConceptsMode, setSessionTeachConceptsBoardText, setSessionTeachConceptsBoardTitle,
    setSessionTeachConceptsBoardNotes, setSessionTeachConceptsMarks, setSessionTeachConceptsSlideIndex,
    setSessionTeachConceptsCipherIdx, setSessionTeachConceptsCipherResults,
    setSessionTeachConceptsCipherCheckResults, setSessionTeachConceptsSyllabicated,
    setSessionTeachConceptsSlideMarks, setSessionTeachConceptsSlideObjectStates,
    setSessionTeachConceptsSlideFullscreen, setSessionDictationCompletedIds, setSessionPassageIndex,
    setSessionPassageRulerEnabled, setSessionPassageRulerY,
    setSessionPassagePhase, setSessionPassageQuestionIndex,
    setSessionSpellingViewMode, setSessionSpellingSectionOrderVersion, setSessionSpellingActiveTab, setSessionSpellingRevealedItems,
    setSessionSpellingCipherWord, setSessionSpellingCipherResults, setSessionSpellingCipherCheckResult,
    setSessionSpellingGridPage, setSessionSpellingIsSyllabicated,
    setSessionSpellingMarks, setSessionDrawings
  } = useLessonSession();
  const {
    sessionId, sessionDate, studentIds: sessionStudentIds, scores: sessionScores, notes: sessionNotes,
    distribution: sessionDistribution, wordlistPage: sessionWordlistPage,
    quickDrillIndex: sessionQuickDrillIndex, quickDrillRevealed: sessionQuickDrillRevealed,
    quickDrillHandwriting: sessionQuickDrillHandwriting, quickDrillItems: sessionQuickDrillItems,
    wordCards: sessionWordCards,
    sentenceIndex: sessionSentenceIndex, teachConceptsMode: sessionTeachConceptsMode,
    teachConceptsBoardText: sessionTeachConceptsBoardText, teachConceptsBoardTitle: sessionTeachConceptsBoardTitle,
    teachConceptsBoardNotes: sessionTeachConceptsBoardNotes, teachConceptsMarks: sessionTeachConceptsMarks,
    teachConceptsSlideIndex: sessionTeachConceptsSlideIndex,
    teachConceptsCipherIdx: sessionTeachConceptsCipherIdx,
    teachConceptsCipherResults: sessionTeachConceptsCipherResults,
    teachConceptsCipherCheckResults: sessionTeachConceptsCipherCheckResults,
    teachConceptsSyllabicated: sessionTeachConceptsSyllabicated,
    teachConceptsSlideMarks: sessionTeachConceptsSlideMarks,
    teachConceptsSlideObjectStates: sessionTeachConceptsSlideObjectStates,
    teachConceptsSlideFullscreen: sessionTeachConceptsSlideFullscreen,
    dictationCompletedIds: sessionDictationCompletedIds, passageIndex: sessionPassageIndex,
    passageRulerEnabled: sessionPassageRulerEnabled, passageRulerY: sessionPassageRulerY,
    passagePhase: sessionPassagePhase, passageQuestionIndex: sessionPassageQuestionIndex,
    spellingViewMode: sessionSpellingViewMode, spellingSectionOrderVersion: sessionSpellingSectionOrderVersion,
    spellingActiveTab: sessionSpellingActiveTab,
    spellingRevealedItems: sessionSpellingRevealedItems, spellingCipherWord: sessionSpellingCipherWord,
    spellingCipherResults: sessionSpellingCipherResults,
    spellingCipherCheckResult: sessionSpellingCipherCheckResult,
    spellingGridPage: sessionSpellingGridPage, spellingIsSyllabicated: sessionSpellingIsSyllabicated,
    spellingMarks: sessionSpellingMarks, drawings: sessionDrawings
  } = lessonSession;
  const [isStudentView, setIsStudentView] = useState<boolean>(false);
  const [displayRole, setDisplayRole] = useState<'resolving' | 'teacher' | 'student'>('resolving');
  const [presenterId, setPresenterId] = useState('');
  const [presenterStatus, setPresenterStatus] = useState<PresenterConnectionStatus>('closed');
  // Board-safe: on by default whenever no student display is connected (one
  // projected screen). A manual toggle wins until the display connects/disconnects.
  const [boardSafeOverride, setBoardSafeOverride] = useState<boolean | null>(null);
  const studentDisplayConnected = presenterStatus === 'connected' || presenterStatus === 'lagging';
  const boardSafe = boardSafeOverride ?? !studentDisplayConnected;
  useEffect(() => { setBoardSafeOverride(null); }, [studentDisplayConnected]);
  const [presenterHasSnapshot, setPresenterHasSnapshot] = useState(false);
  const [presenterStudents, setPresenterStudents] = useState<StudentProfile[]>([]);
  const [isPresenterSetupOpen, setIsPresenterSetupOpen] = useState(false);
  const [isStudentScreenJoinOpen, setIsStudentScreenJoinOpen] = useState(false);
  const [cloudPresenterActive, setCloudPresenterActive] = useState(false);
  const [showPresenterDrawings, setShowPresenterDrawings] = useState(true);
  const [presenterResyncNonce, setPresenterResyncNonce] = useState(0);
  const [isGuestModeNoticeVisible, setIsGuestModeNoticeVisible] = useState<boolean>(true);
  const [safeBoot] = useState(isSafeBootMode);
  const [isSafeBootNoticeVisible, setIsSafeBootNoticeVisible] = useState(true);
  // The old single unfinished-lesson slot is only read now, once, to carry an
  // existing unfinished lesson over into that group's own saved spot.
  const [legacyRecoverable] = useState<RecoverableSession | null>(() => safeBoot ? null : loadRecoverableSession());
  const [launchPrompt, setLaunchPrompt] = useState<{ spot: GroupSpot; startNew: () => void } | null>(null);
  const spotInputsRef = useRef<{
    group: GroupProfile; lesson: Lesson; part: LessonPart; session: typeof lessonSession
  } | null>(null);
  const spotDirtyRef = useRef(false);
  // Set when the teacher has already answered "start the new lesson" for this group's
  // saved spot, so the Briefing's Start doesn't ask the same question again.
  const replaceSpotApprovedRef = useRef<{ groupId: string; sessionId: string } | null>(null);
  const presenterChannelRef = useRef<BroadcastChannel | null>(null);
  const presenterWindowRef = useRef<Window | null>(null);
  const latestPresenterSnapshotRef = useRef<PresenterSnapshot | null>(null);
  const presenterRevisionRef = useRef(0);
  const lastAppliedPresenterOrderRef = useRef(0);
  const lastLocalStudentSeenRef = useRef(0);

  const isStudentDisplayWindow = displayRole === 'student';

  /** Writes the latest unsaved spot now. Used when leaving a lesson, launching another, or closing the tab. */
  const flushSpot = useCallback(() => {
    const inputs = spotInputsRef.current;
    if (!spotDirtyRef.current || !inputs || !user) return;
    spotDirtyRef.current = false;
    const today = localDateString();
    void saveSpot(buildSpot({
      teacherId: user.uid,
      group: inputs.group,
      lesson: inputs.lesson,
      lessonSource: spotLessonSourceOf(lessonLibrary.isLibraryLesson(inputs.lesson.id), inputs.lesson, inputs.group),
      currentPart: inputs.part,
      session: inputs.session,
      dateStarted: spotDateStarted(
        getSpot(inputs.group.id), inputs.lesson.id, inputs.session.sessionId, inputs.session.sessionDate, today
      ),
      today,
      now: new Date().toISOString()
    }));
  }, [getSpot, lessonLibrary, saveSpot, user]);

  /** Nothing more to save for the lesson on screen (it was finished, discarded or replaced). */
  const dropPendingSpot = () => {
    spotDirtyRef.current = false;
    spotInputsRef.current = null;
  };

  const resumeGroupSpot = (spot: GroupSpot, lessonOverride?: Lesson) => {
    flushSpot();
    const group = groups.find(candidate => candidate.id === spot.groupId);
    const lesson = lessonOverride || resolveSpotLesson(spot, lessonLibrary.records, group);
    if (!group || !lesson) {
      window.alert(`${spot.groupName}'s unfinished lesson can't be opened because ${group ? 'the lesson is no longer loaded' : 'the group no longer exists'}. It has been kept; load the lesson again to resume it.`);
      return;
    }
    clearSafeBootMode();
    dropPendingSpot();
    const restored = resumeSession(
      spot, lesson, localDateString(),
      Math.max(lessonSession.syncRevision, normalizeLessonSyncRevision((activeSession as { syncRevision?: number } | null)?.syncRevision))
    );
    setLaunchPrompt(null);
    setActiveGroup(group);
    setCurrentLesson(lesson);
    setCurrentPart(spot.currentPart as LessonPart);
    replaceLessonSession(restored);
    setIsSessionDossierOpen(false);
    setMode('run');
  };

  const startLessonFresh = (lesson: Lesson) => {
    dropPendingSpot();
    setLaunchPrompt(null);
    setCurrentLesson(lesson);
    setMode('run');
    setCurrentPart(LessonPart.Briefing);
    resetLessonSession();
  };

  /** Launching a lesson never erases another lesson's saved spot. */
  const launchLesson = (lesson: Lesson) => {
    clearSafeBootMode();
    flushSpot();
    const spot = activeGroup ? getSpot(activeGroup.id) : null;
    const decision = launchDecision(lesson.id, spot);
    if (decision === 'resume' && spot) {
      resumeGroupSpot(spot, lesson);
    } else if (decision === 'ask' && spot) {
      setLaunchPrompt({
        spot,
        startNew: () => {
          replaceSpotApprovedRef.current = { groupId: spot.groupId, sessionId: spot.session.sessionId || '' };
          startLessonFresh(lesson);
        }
      });
    } else {
      startLessonFresh(lesson);
    }
  };

  const discardGroupSpot = (spot: GroupSpot) => {
    const sessionIdOfSpot = spot.session.sessionId || '';
    void clearSpot(spot.groupId);
    if (sessionIdOfSpot) {
      // The old copies of this same lesson must not bring the spot back.
      writeMigratedSessionIds([...readMigratedSessionIds(), sessionIdOfSpot]);
      if (activeSession?.sessionId === sessionIdOfSpot) void updateSession(null);
      if (legacyRecoverable?.sessionId === sessionIdOfSpot) clearRecoverableSession();
    }
  };

  // Memoize session students and reading cards to prevent unstable array references
  const rosterSessionStudents = useMemo(() =>
    students.filter((student): student is StudentProfile => Boolean(student && sessionStudentIds.includes(student.id))),
    [students, sessionStudentIds]
  );
  const sessionStudents = isStudentDisplayWindow && presenterStudents.length > 0
    ? presenterStudents
    : rosterSessionStudents;

  const currentPresenterSnapshot = useMemo(() => {
    if (displayRole !== 'teacher' || !presenterId) return null;
    presenterRevisionRef.current += 1;
    return createPresenterSnapshot(
      presenterId, mode, currentLesson, currentPart, activeGroup, lessonSession, rosterSessionStudents,
      showPresenterDrawings, presenterRevisionRef.current
    );
  }, [activeGroup, currentLesson, currentPart, displayRole, lessonSession, mode, presenterId, presenterResyncNonce, rosterSessionStudents, showPresenterDrawings]);
  const studentDisplayUrl = useMemo(() =>
    typeof window === 'undefined' || !presenterId
      ? ''
      : createStudentDisplayUrl(window.location.href, presenterId),
    [presenterId]
  );

  useEffect(() => {
    const studentDisplay = isStudentDisplayRequest(window.location.search);
    const nextPresenterId = studentDisplay
      ? requestedPresenterId(window.location.search)
      : (window.crypto.randomUUID?.() || `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setPresenterId(nextPresenterId);
    setDisplayRole(studentDisplay ? 'student' : 'teacher');
    if (studentDisplay) {
      setIsStudentView(true);
      setPresenterStatus('connecting');
      setCloudPresenterActive(isPresenterCode(nextPresenterId));
    }
  }, []);

  const applyPresenterSnapshot = useCallback((snapshot: PresenterSnapshot) => {
    const order = presenterSnapshotOrder(snapshot);
    if (!isNewerPresenterSnapshot(snapshot, lastAppliedPresenterOrderRef.current)) {
      return;
    }
    lastAppliedPresenterOrderRef.current = order;
    setCurrentLesson(snapshot.lesson);
    setCurrentPart(snapshot.currentPart);
    setActiveGroup(snapshot.group);
    setPresenterStudents(snapshot.students);
    replaceLessonSession(snapshot.session);
    setMode(snapshot.mode === 'run' ? 'run' : 'dashboard');
    setPresenterHasSnapshot(true);
  }, [replaceLessonSession]);

  const {
    status: cloudPresenterStatus,
    error: cloudPresenterError,
    stopSession: stopCloudPresenterSession
  } = useCloudPresenter({
    role: displayRole,
    active: cloudPresenterActive,
    presenterId,
    userId: user?.uid,
    snapshot: currentPresenterSnapshot,
    onSnapshot: applyPresenterSnapshot
  });

  useEffect(() => {
    if ((displayRole === 'teacher' && cloudPresenterActive) || (displayRole === 'student' && isPresenterCode(presenterId))) {
      setPresenterStatus(cloudPresenterStatus);
    }
  }, [cloudPresenterActive, cloudPresenterStatus, displayRole, presenterId]);

  useEffect(() => {
    if (displayRole === 'student' && cloudPresenterActive && cloudPresenterStatus === 'closed' && presenterHasSnapshot) {
      setPresenterHasSnapshot(false);
      setCurrentLesson(null);
      setMode('dashboard');
    }
  }, [cloudPresenterActive, cloudPresenterStatus, displayRole, presenterHasSnapshot]);

  useEffect(() => {
    if (displayRole === 'resolving' || !presenterId) return;
    if (isPresenterCode(presenterId)) return;

    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(PRESENTER_CHANNEL)
      : null;
    presenterChannelRef.current = channel;

    const postMessage = (message: PresenterMessage) => {
      channel?.postMessage(message);
      try {
        window.localStorage.setItem(PRESENTER_EVENT_KEY, JSON.stringify({
          ...message,
          eventNonce: `${Date.now()}-${Math.random()}`
        }));
        if (message.type === 'presenter-state') {
          window.localStorage.setItem(presenterStateKey(presenterId), JSON.stringify(message));
        }
      } catch {
        // BroadcastChannel remains the primary synchronization path.
      }
    };

    const handleMessage = (message: PresenterMessage) => {
      if (!message || message.presenterId !== presenterId) return;
      if (displayRole === 'student') {
        if (isPresenterSnapshot(message)) {
          applyPresenterSnapshot(message);
          setPresenterStatus('connected');
        }
        if (message.type === 'teacher-closing') setPresenterStatus('closed');
        return;
      }

      if (message.type === 'student-ready' || message.type === 'resync-request') {
        lastLocalStudentSeenRef.current = Date.now();
        setPresenterStatus('connected');
        if (latestPresenterSnapshotRef.current) postMessage(latestPresenterSnapshotRef.current);
      }
      if (message.type === 'student-closing') setPresenterStatus('closed');
    };

    if (channel) channel.onmessage = event => handleMessage(event.data as PresenterMessage);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PRESENTER_EVENT_KEY || !event.newValue) return;
      try {
        handleMessage(JSON.parse(event.newValue) as PresenterMessage);
      } catch {
        // Ignore malformed or stale local synchronization data.
      }
    };
    window.addEventListener('storage', handleStorage);

    if (displayRole === 'student') {
      try {
        const storedSnapshot = window.localStorage.getItem(presenterStateKey(presenterId));
        if (storedSnapshot) {
          const parsed = JSON.parse(storedSnapshot);
          if (isPresenterSnapshot(parsed)) applyPresenterSnapshot(parsed);
        }
      } catch {
        // Wait for a fresh snapshot from the teacher window.
      }
      postMessage({ type: 'student-ready', presenterId, sentAt: Date.now(), revision: lastAppliedPresenterOrderRef.current });
    }

    const heartbeat = window.setInterval(() => {
      if (displayRole === 'teacher') {
        if (latestPresenterSnapshotRef.current) postMessage(latestPresenterSnapshotRef.current);
        if (lastLocalStudentSeenRef.current && Date.now() - lastLocalStudentSeenRef.current > 7000) {
          setPresenterStatus('lagging');
        }
      } else {
        postMessage({ type: 'student-ready', presenterId, sentAt: Date.now(), revision: lastAppliedPresenterOrderRef.current });
      }
    }, 2000);

    const handleBeforeUnload = () => postMessage({
      type: displayRole === 'student' ? 'student-closing' : 'teacher-closing',
      presenterId,
      sentAt: Date.now()
    });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(heartbeat);
      channel?.close();
      if (presenterChannelRef.current === channel) presenterChannelRef.current = null;
    };
  }, [applyPresenterSnapshot, displayRole, presenterId]);

  useEffect(() => {
    if (!currentPresenterSnapshot) return;
    const snapshot = currentPresenterSnapshot;
    latestPresenterSnapshotRef.current = snapshot;
    if (isPresenterCode(presenterId)) return;
    presenterChannelRef.current?.postMessage(snapshot);
    try {
      window.localStorage.setItem(presenterStateKey(presenterId), JSON.stringify(snapshot));
      window.localStorage.setItem(PRESENTER_EVENT_KEY, JSON.stringify({
        ...snapshot,
        eventNonce: `${Date.now()}-${Math.random()}`
      }));
    } catch {
      // A live BroadcastChannel connection can continue without local storage.
    }
  }, [currentPresenterSnapshot, presenterId]);

  const openLocalStudentDisplay = useCallback(() => {
    if (displayRole !== 'teacher') return;
    const displayWindow = window.open(
      createStudentDisplayUrl(window.location.href, presenterId),
      'wrs-dojo-student-display',
      'popup=yes,width=1280,height=800'
    );
    if (!displayWindow) {
      setPresenterStatus('blocked');
      return;
    }
    presenterWindowRef.current = displayWindow;
    setPresenterStatus('connecting');
    displayWindow.focus();
  }, [displayRole, presenterId]);

  const openStudentDisplay = useCallback(() => {
    if (displayRole === 'teacher') setIsPresenterSetupOpen(true);
  }, [displayRole]);

  const startCloudPresenter = useCallback(() => {
    if (!user || user.uid === 'guest-sensei') return;
    const code = createPresenterCode();
    presenterRevisionRef.current = 0;
    setPresenterId(code);
    setCloudPresenterActive(true);
    setPresenterStatus('connecting');
  }, [user]);

  const stopCloudPresenter = useCallback(async () => {
    setCloudPresenterActive(false);
    await stopCloudPresenterSession();
    setPresenterStatus('closed');
    setPresenterId(window.crypto.randomUUID?.() || `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }, [stopCloudPresenterSession]);

  const joinCloudStudentDisplay = useCallback((codeInput: string) => {
    const code = normalizePresenterCode(codeInput);
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.set('display', 'student');
    url.searchParams.set('presenter', code);
    window.history.replaceState({}, '', url);
    setPresenterId(code);
    lastAppliedPresenterOrderRef.current = 0;
    setCloudPresenterActive(true);
    setPresenterHasSnapshot(false);
    setPresenterStudents([]);
    setIsStudentView(true);
    setDisplayRole('student');
    setPresenterStatus('connecting');
    setIsPresenterSetupOpen(false);
    setIsStudentScreenJoinOpen(false);
  }, []);

  const resyncStudentDisplay = useCallback(() => {
    setPresenterResyncNonce(value => value + 1);
    if (!isPresenterCode(presenterId) && latestPresenterSnapshotRef.current) {
      presenterChannelRef.current?.postMessage(latestPresenterSnapshotRef.current);
    }
  }, [presenterId]);

  const closeStudentDisplay = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('display');
    url.searchParams.delete('presenter');
    window.history.replaceState({}, '', url);
    setCloudPresenterActive(false);
    setPresenterHasSnapshot(false);
    setPresenterStudents([]);
    setIsStudentView(false);
    setDisplayRole('teacher');
    setPresenterStatus('closed');
    setPresenterId(window.crypto.randomUUID?.() || `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setCurrentLesson(null);
    setActiveGroup(null);
    setMode('dashboard');
  }, []);

  const updateDrawingStrokes = useCallback((surface: string, strokes: DrawingStroke[]) => {
    setSessionDrawings(previous => updateDrawingSurface(previous, surface, strokes));
  }, [setSessionDrawings]);

  const saveQuickNote = useCallback(async ({ content, studentIds }: { content: string; studentIds: string[] }) => {
    if (!activeGroup || !currentLesson || isStudentView) return false;
    const taggedStudents = students.filter(student => studentIds.includes(student.id));
    const saved = await saveGroupNote({
      groupId: activeGroup.id,
      groupName: activeGroup.name,
      studentIds: taggedStudents.map(student => student.id),
      studentNames: taggedStudents.map(student => student.name),
      content,
      lessonId: currentLesson.id,
      lessonTitle: currentLesson.title,
      step: currentLesson.step,
      substep: currentLesson.substep,
      lessonPart: currentPart,
      sessionId: lessonSession.sessionId,
      sessionDate: lessonSession.sessionDate
    });
    if (!saved) return false;

    const target = taggedStudents.length ? taggedStudents.map(student => student.name).join(', ') : 'Whole Group';
    const nextSessionNotes = [sessionNotes, `[Part ${currentPart} · ${target}] ${content.trim()}`].filter(Boolean).join('\n');
    const nextRevision = nextLessonSyncRevision(lessonSession.syncRevision);
    setSessionNotes(nextSessionNotes);
    await updateSession(lessonSessionToCloud(
      { ...lessonSession, notes: nextSessionNotes, syncRevision: nextRevision }, currentLesson, currentPart, activeGroup.id
    ));
    return true;
  }, [activeGroup, currentLesson, currentPart, isStudentView, lessonSession, saveGroupNote, sessionNotes, setSessionNotes, students, updateSession]);

  const baseReadingCards = useMemo(() => {
    if (!currentLesson) return [];
    return chartingWordCardsForLesson(currentLesson);
  }, [currentLesson]);

  const part3WordCards = useMemo(() => (
    currentLesson ? part3WordCardsForLesson(currentLesson) : []
  ), [currentLesson]);

  // A lesson that names a substep + level deals Part 4 from the Reader word bank.
  const chartingPlan = useMemo(() => chartingPlanForLesson(currentLesson), [currentLesson]);


  const setLocalLessonPart = useCallback((nextPart: LessonPart) => {
    touchLessonSession();
    if (nextPart !== LessonPart.Part10) setIsSessionDossierOpen(false);
    setCurrentPart(nextPart);
  }, [touchLessonSession]);

  const changeLessonPart = useCallback((nextPart: LessonPart) => {
    if (isStudentView) return;
    if (nextPart === LessonPart.Part4 && chartingPlan && rosterSessionStudents.length > 0) {
      if (!hasCompleteWordDistribution(sessionDistribution, rosterSessionStudents.length, CHARTING_WORDS_PER_STUDENT)) {
        setSessionDistribution(dealLeveledCharting(defaultDealSettings(chartingPlan, rosterSessionStudents)));
        setSessionWordlistPage(0);
        setSessionScores([]);
      }
    } else if (nextPart === LessonPart.Part4 && baseReadingCards.length > 0 && rosterSessionStudents.length > 0) {
      const wordsPerStudent = targetWordCount(baseReadingCards);
      if (!hasCompleteWordDistribution(sessionDistribution, rosterSessionStudents.length, wordsPerStudent)) {
        setSessionDistribution(buildWordDistribution(baseReadingCards, rosterSessionStudents.length, wordsPerStudent));
        setSessionWordlistPage(0);
        setSessionScores([]);
      }
    }
    if (shouldResetQuickDrillForPartChange(currentPart, nextPart)) {
      setSessionQuickDrillIndex(0);
      setSessionQuickDrillRevealed(0);
      setSessionQuickDrillHandwriting(false);
      setSessionQuickDrillItems([]);
    }
    setLocalLessonPart(nextPart);
  }, [
    baseReadingCards, chartingPlan, currentPart, isStudentView, rosterSessionStudents, sessionDistribution,
    setLocalLessonPart, setSessionDistribution, setSessionQuickDrillHandwriting, setSessionQuickDrillIndex,
    setSessionQuickDrillItems, setSessionQuickDrillRevealed, setSessionScores, setSessionWordlistPage
  ]);

  // Keep activeGroup in sync with the latest data from the groups array
  useEffect(() => {
    if (activeGroup) {
      const latest = groups.find(g => g.id === activeGroup.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(activeGroup)) {
        setActiveGroup(latest);
      } else if (!latest) {
        setActiveGroup(null);
      }
    }
  }, [groups, activeGroup]);

  // Sync state if an active session exists in Firestore for this user.
  // Local teacher actions advance one shared revision; only a strictly newer
  // cloud revision may replace a running local lesson.
  useEffect(() => {
    if (safeBoot || isStudentDisplayWindow) return;
    if (activeSession && activeSession.lesson) {
      console.log("Received session update from cloud:", activeSession);
      const incomingSession = lessonSessionFromCloud(activeSession);
      const hasLocalAuthority = Boolean(currentLesson) && (mode === 'run' || mode === 'mission');
      if (!shouldApplyIncomingLessonState(
        lessonSession.syncRevision,
        incomingSession.syncRevision,
        hasLocalAuthority
      )) return;

      if (!lessonSessionsMatch(incomingSession, lessonSession)) replaceLessonSession(incomingSession);

      if (activeSession.currentPart !== currentPart) setCurrentPart(activeSession.currentPart as LessonPart);
      if (JSON.stringify(activeSession.lesson) !== JSON.stringify(currentLesson)) setCurrentLesson(activeSession.lesson);
      
      const g = groups.find(group => group.id === activeSession.groupId);
      if (g && (!activeGroup || g.id !== activeGroup.id)) setActiveGroup(g);
      
      if (mode !== 'run' && mode !== 'mission') setMode('run');
    }
  }, [
    activeSession, currentLesson, currentPart, groups.length, isStudentDisplayWindow,
    lessonSession.syncRevision, mode, replaceLessonSession, safeBoot
  ]);

  // Push local changes to cloud (Debounced)
  useEffect(() => {
    if (mode !== 'run' || !user || user.uid === 'guest-sensei' || !currentLesson || isStudentView) return;

    const timer = setTimeout(() => {
      const cloudSession = activeSession ? lessonSessionFromCloud(activeSession) : null;
      const cloudMatches = activeSession && cloudSession &&
        activeSession.currentPart === currentPart &&
        activeSession.groupId === (activeGroup?.id || '') &&
        JSON.stringify(activeSession.lesson) === JSON.stringify(currentLesson) &&
        lessonSessionsMatch(cloudSession, lessonSession);

      if (!cloudMatches) {
        console.log("Pushing session update to cloud...");
        updateSession(lessonSessionToCloud(lessonSession, currentLesson, currentPart, activeGroup?.id || ''));
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [activeGroup?.id, activeSession, currentLesson, currentPart, isStudentView, lessonSession, mode, user]);

  // Keep this group's spot in the lesson. Debounced like the cloud push above; the
  // latest state is also written when leaving the lesson or closing the tab.
  useEffect(() => {
    if (mode !== 'run') return;
    const saveable = !safeBoot && !isStudentDisplayWindow && !isStudentView && user && currentLesson && activeGroup
      && currentPart !== LessonPart.Briefing && Boolean(lessonSession.sessionId);
    if (!saveable) {
      dropPendingSpot();
      return;
    }
    spotInputsRef.current = { group: activeGroup, lesson: currentLesson, part: currentPart, session: lessonSession };
    spotDirtyRef.current = true;
    const timer = window.setTimeout(flushSpot, 1000);
    return () => window.clearTimeout(timer);
  }, [activeGroup, currentLesson, currentPart, flushSpot, isStudentDisplayWindow, isStudentView, lessonSession, mode, safeBoot, user]);

  useEffect(() => {
    if (mode !== 'run') flushSpot();
  }, [flushSpot, mode]);

  useEffect(() => {
    const flushWhenHidden = () => { if (document.visibilityState === 'hidden') flushSpot(); };
    window.addEventListener('pagehide', flushSpot);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flushSpot);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [flushSpot]);

  // An unfinished lesson saved the old way (one slot per teacher) becomes that
  // group's spot, so it is still offered for resume. The old copies are kept.
  useEffect(() => {
    if (!groupSpots.ready || safeBoot || isStudentDisplayWindow || !user || groups.length === 0) return;
    const created = migrateLegacySpots({
      teacherId: user.uid,
      candidates: [activeSession as any, legacyRecoverable].map(session => ({
        session: session as any,
        lessonSource: session?.lesson && lessonLibrary.isLibraryLesson(session.lesson.id) ? 'library' as const : 'embedded' as const
      })),
      groups,
      existing: groupSpots.spots,
      migratedSessionIds: readMigratedSessionIds(),
      today: localDateString(),
      now: new Date().toISOString()
    });
    if (created.length === 0) return;
    writeMigratedSessionIds([
      ...readMigratedSessionIds(),
      ...created.map(spot => spot.session.sessionId || '').filter(Boolean)
    ]);
    created.forEach(spot => { void saveSpot(spot); });
  }, [activeSession, groupSpots.ready, groupSpots.spots, groups, isStudentDisplayWindow, legacyRecoverable, lessonLibrary, safeBoot, saveSpot, user]);

  const handleBriefingStart = async (
    data: { date: string; studentIds: string[]; isTraining?: boolean },
    startNewOverGroupSpot = false
  ): Promise<void> => {
    clearSafeBootMode();
    console.log("Mission Briefing Start:", data);
    // The group chosen on the Briefing may already have an unfinished lesson. Ask
    // before this start would replace it.
    const existingSpot = activeGroup && !data.isTraining && !startNewOverGroupSpot ? getSpot(activeGroup.id) : null;
    const approved = replaceSpotApprovedRef.current;
    replaceSpotApprovedRef.current = null;
    const alreadyApproved = Boolean(existingSpot && approved
      && approved.groupId === existingSpot.groupId && approved.sessionId === (existingSpot.session.sessionId || ''));
    if (existingSpot && !alreadyApproved) {
      setLaunchPrompt({ spot: existingSpot, startNew: () => { setLaunchPrompt(null); void handleBriefingStart(data, true); } });
      return;
    }
    const sessionIdentity = { sessionId: createMissionId(), sessionDate: data.date };
    const resetRevision = nextLessonSyncRevision(lessonSession.syncRevision);
    const nextRevision = data.isTraining ? resetRevision : nextLessonSyncRevision(resetRevision);
    const nextSession = {
      ...createInitialLessonSession(),
      ...sessionIdentity,
      studentIds: data.studentIds,
      syncRevision: nextRevision
    };
    resetLessonSession({ ...sessionIdentity, studentIds: data.studentIds });
    
    if (data.isTraining) {
      setMode('mission');
    } else {
      setLocalLessonPart(LessonPart.Part1); 
    }
    
    if (activeGroup) {
      const updatedGroup = { ...activeGroup, lastLessonDate: data.date };
      await updateSquad(updatedGroup);
      
      // Starting a lesson writes no mission record. The Briefing's student check-in
      // is kept in the session, and the record (attendance, scores, notes) is
      // written once, when the lesson is completed.
      if (currentLesson) {
        updateSession(lessonSessionToCloud(nextSession, currentLesson, LessonPart.Part1, activeGroup.id));
      }
    }
  };

  const handleUpdateLessonPerpetually = async (updatedLesson: Lesson) => {
    const nextRevision = nextLessonSyncRevision(lessonSession.syncRevision);
    setCurrentLesson(updatedLesson);
    if (!isStudentView) touchLessonSession();
    
    // 1. Persist the edit for future missions. Loaded lessons live in their own
    //    Firestore documents; older lessons live in the group's savedLessons list.
    if (lessonLibrary.isLibraryLesson(updatedLesson.id)) {
      const result = await lessonLibrary.updateLesson(updatedLesson);
      if (!result.ok) console.error(`Lesson edit could not be saved: ${result.message}`);
    } else if (activeGroup && user?.uid !== 'guest-sensei') {
      const updatedSquad = {
        ...activeGroup,
        savedLessons: (activeGroup.savedLessons || []).filter(Boolean).map(l => l.id === updatedLesson.id ? updatedLesson : l)
      };
      await updateSquad(updatedSquad);
    }

    // 2. Update the lesson in the current session (Sync for reading part 2/7)
    if (activeSession && !isStudentView) {
      await updateSession(lessonSessionToCloud(
        { ...lessonSession, syncRevision: nextRevision },
        updatedLesson,
        currentPart,
        activeGroup?.id || activeSession.groupId
      ));
    }
  };

  const renderModule = () => {
    if (!currentLesson) {
      console.warn("renderModule: No current lesson!");
      return null;
    }
    
    console.log("renderModule: Rendering part", currentPart, "with students", sessionStudentIds);
    
    switch (currentPart) {
      case LessonPart.Briefing:
        if (isStudentView) {
          return (
            <div className="h-full flex flex-col items-center justify-center bg-[#fcfbf9] text-center p-10">
              <MonitorUp className="h-16 w-16 text-red-800 mb-6" />
              <h2 className="text-4xl font-black font-serif text-stone-900 mb-3">Ready for the Lesson</h2>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">Waiting for the teacher to begin</p>
            </div>
          );
        }
        return (
          <MissionBriefing 
            onStart={(d) => handleBriefingStart({ date: d.date, studentIds: d.students, isTraining: d.isTraining })} 
            initialStudentIds={sessionStudentIds} 
            activeGroup={activeGroup || undefined} 
            allStudents={students}
            allGroups={groups}
            onSelectGroup={setActiveGroup}
            onUpdateGroup={updateSquad} 
            onUpdateAllStudents={(ss) => ss.forEach(updateStudent)}
          />
        );
      case LessonPart.Part1: 
        return (
          <QuickDrill 
            sounds={currentLesson.quickDrill} 
            step={currentLesson.step} 
            substep={currentLesson.substep} 
            currentIndex={sessionQuickDrillIndex}
            onUpdateIndex={setSessionQuickDrillIndex}
            revealedCount={sessionQuickDrillRevealed}
            onUpdateRevealed={setSessionQuickDrillRevealed}
            isHandwritingMode={sessionQuickDrillHandwriting}
            onUpdateHandwriting={setSessionQuickDrillHandwriting}
            shuffledItems={sessionQuickDrillItems}
            onUpdateItems={setSessionQuickDrillItems}
            strokes={sessionDrawings['quick-visual'] || []}
            onUpdateStrokes={strokes => updateDrawingStrokes('quick-visual', strokes)}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part2: 
        return (
          <TeachConcepts 
            lesson={currentLesson} 
            onUpdateLesson={handleUpdateLessonPerpetually} 
            notes={sessionNotes}
            onUpdateNotes={setSessionNotes}
            mode={sessionTeachConceptsMode}
            onUpdateMode={setSessionTeachConceptsMode}
            boardText={sessionTeachConceptsBoardText}
            onUpdateBoardText={setSessionTeachConceptsBoardText}
            boardTitle={sessionTeachConceptsBoardTitle}
            onUpdateBoardTitle={setSessionTeachConceptsBoardTitle}
            boardNotes={sessionTeachConceptsBoardNotes}
            onUpdateBoardNotes={setSessionTeachConceptsBoardNotes}
            marks={sessionTeachConceptsMarks}
            onUpdateMarks={setSessionTeachConceptsMarks}
            slideIndex={sessionTeachConceptsSlideIndex}
            onUpdateSlideIndex={setSessionTeachConceptsSlideIndex}
            drawingStrokes={sessionDrawings[sessionTeachConceptsMode === 'slides' ? `teach-concepts-slide-${sessionTeachConceptsSlideIndex}` : 'teach-concepts-board'] || []}
            onUpdateDrawingStrokes={strokes => updateDrawingStrokes(sessionTeachConceptsMode === 'slides' ? `teach-concepts-slide-${sessionTeachConceptsSlideIndex}` : 'teach-concepts-board', strokes)}
            readOnly={isStudentView}
            activeCipherIdx={sessionTeachConceptsCipherIdx}
            onUpdateCipherIdx={setSessionTeachConceptsCipherIdx}
            isSyllabicated={sessionTeachConceptsSyllabicated}
            onUpdateSyllabicated={setSessionTeachConceptsSyllabicated}
            cipherResults={sessionTeachConceptsCipherResults.reading || {}}
            onUpdateCipherResults={results => setSessionTeachConceptsCipherResults(previous => ({ ...previous, reading: results }))}
            cipherCheckResult={sessionTeachConceptsCipherCheckResults.reading || null}
            onUpdateCipherCheckResult={result => setSessionTeachConceptsCipherCheckResults(previous => ({ ...previous, reading: result }))}
            slideMarks={sessionTeachConceptsSlideMarks.reading || {}}
            onUpdateSlideMarks={marks => setSessionTeachConceptsSlideMarks(previous => ({ ...previous, reading: marks }))}
            slideObjectStates={sessionTeachConceptsSlideObjectStates.reading || {}}
            onUpdateSlideObjectStates={states => setSessionTeachConceptsSlideObjectStates(previous => ({ ...previous, reading: states }))}
            slideFullScreen={Boolean(sessionTeachConceptsSlideFullscreen.reading)}
            onUpdateSlideFullScreen={value => setSessionTeachConceptsSlideFullscreen(previous => ({ ...previous, reading: value }))}
          />
        );
      case LessonPart.Part3: 
        return (
          <WordCards 
            cards={part3WordCards} 
            hfw={currentLesson.hfwList} 
            students={sessionStudents.map(s => s.name)}
            state={sessionWordCards}
            onUpdateState={setSessionWordCards}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part4:
        return (
          <WordlistReading 
            cards={baseReadingCards} 
            chartingPlan={chartingPlan}
            lessonId={currentLesson?.id}
            students={sessionStudents} 
            scores={sessionScores} 
            onUpdateScores={setSessionScores} 
            isStudentView={isStudentView} 
            distribution={sessionDistribution}
            onUpdateDistribution={setSessionDistribution}
            page={sessionWordlistPage}
            onUpdatePage={setSessionWordlistPage}
          />
        );
      case LessonPart.Part5: 
        return (
          <SentenceReading 
            sentences={currentLesson.sentences} 
            currentIndex={sessionSentenceIndex}
            onUpdateIndex={setSessionSentenceIndex}
            strokes={sessionDrawings.sentence || []}
            onUpdateStrokes={strokes => updateDrawingStrokes('sentence', strokes)}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part6: 
        return (
          <QuickDrill 
            sounds={currentLesson.quickDrillReverse?.length ? currentLesson.quickDrillReverse : currentLesson.quickDrill} 
            isReverse={true} 
            step={currentLesson.step} 
            substep={currentLesson.substep} 
            currentIndex={sessionQuickDrillIndex}
            onUpdateIndex={setSessionQuickDrillIndex}
            revealedCount={sessionQuickDrillRevealed}
            onUpdateRevealed={setSessionQuickDrillRevealed}
            isHandwritingMode={sessionQuickDrillHandwriting}
            onUpdateHandwriting={setSessionQuickDrillHandwriting}
            shuffledItems={sessionQuickDrillItems}
            onUpdateItems={setSessionQuickDrillItems}
            strokes={sessionDrawings['quick-auditory'] || []}
            onUpdateStrokes={strokes => updateDrawingStrokes('quick-auditory', strokes)}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part7: 
        return (
          <TeachConcepts 
            lesson={currentLesson} 
            isSpelling={true} 
            onUpdateLesson={handleUpdateLessonPerpetually} 
            notes={sessionNotes}
            onUpdateNotes={setSessionNotes}
            mode={sessionTeachConceptsMode}
            onUpdateMode={setSessionTeachConceptsMode}
            boardText={sessionTeachConceptsBoardText}
            onUpdateBoardText={setSessionTeachConceptsBoardText}
            boardTitle={sessionTeachConceptsBoardTitle}
            onUpdateBoardTitle={setSessionTeachConceptsBoardTitle}
            boardNotes={sessionTeachConceptsBoardNotes}
            onUpdateBoardNotes={setSessionTeachConceptsBoardNotes}
            marks={sessionTeachConceptsMarks}
            onUpdateMarks={setSessionTeachConceptsMarks}
            slideIndex={sessionTeachConceptsSlideIndex}
            onUpdateSlideIndex={setSessionTeachConceptsSlideIndex}
            drawingStrokes={sessionDrawings[sessionTeachConceptsMode === 'slides' ? `teach-spelling-slide-${sessionTeachConceptsSlideIndex}` : 'teach-spelling-board'] || []}
            onUpdateDrawingStrokes={strokes => updateDrawingStrokes(sessionTeachConceptsMode === 'slides' ? `teach-spelling-slide-${sessionTeachConceptsSlideIndex}` : 'teach-spelling-board', strokes)}
            readOnly={isStudentView}
            activeCipherIdx={sessionTeachConceptsCipherIdx}
            onUpdateCipherIdx={setSessionTeachConceptsCipherIdx}
            isSyllabicated={sessionTeachConceptsSyllabicated}
            onUpdateSyllabicated={setSessionTeachConceptsSyllabicated}
            cipherResults={sessionTeachConceptsCipherResults.spelling || {}}
            onUpdateCipherResults={results => setSessionTeachConceptsCipherResults(previous => ({ ...previous, spelling: results }))}
            cipherCheckResult={sessionTeachConceptsCipherCheckResults.spelling || null}
            onUpdateCipherCheckResult={result => setSessionTeachConceptsCipherCheckResults(previous => ({ ...previous, spelling: result }))}
            slideMarks={sessionTeachConceptsSlideMarks.spelling || {}}
            onUpdateSlideMarks={marks => setSessionTeachConceptsSlideMarks(previous => ({ ...previous, spelling: marks }))}
            slideObjectStates={sessionTeachConceptsSlideObjectStates.spelling || {}}
            onUpdateSlideObjectStates={states => setSessionTeachConceptsSlideObjectStates(previous => ({ ...previous, spelling: states }))}
            slideFullScreen={Boolean(sessionTeachConceptsSlideFullscreen.spelling)}
            onUpdateSlideFullScreen={value => setSessionTeachConceptsSlideFullscreen(previous => ({ ...previous, spelling: value }))}
          />
        );
      case LessonPart.Part8: 
        return (
          <Spelling 
            data={currentLesson.dictation} 
            lessonStep={currentLesson.step} 
            lessonSubstep={currentLesson.substep} 
            viewMode={sessionSpellingViewMode}
            onUpdateViewMode={setSessionSpellingViewMode}
            activeTab={sessionSpellingActiveTab}
            onUpdateActiveTab={setSessionSpellingActiveTab}
            sectionOrderVersion={sessionSpellingSectionOrderVersion}
            onUpdateSectionOrderVersion={setSessionSpellingSectionOrderVersion}
            revealedItems={sessionSpellingRevealedItems}
            onUpdateRevealedItems={setSessionSpellingRevealedItems}
            cipherWord={sessionSpellingCipherWord}
            onUpdateCipherWord={setSessionSpellingCipherWord}
            cipherResults={sessionSpellingCipherResults}
            onUpdateCipherResults={setSessionSpellingCipherResults}
            cipherCheckResult={sessionSpellingCipherCheckResult}
            onUpdateCipherCheckResult={setSessionSpellingCipherCheckResult}
            gridPage={sessionSpellingGridPage}
            onUpdateGridPage={setSessionSpellingGridPage}
            isSyllabicated={sessionSpellingIsSyllabicated}
            onUpdateSyllabicated={setSessionSpellingIsSyllabicated}
            marks={sessionSpellingMarks}
            onUpdateMarks={setSessionSpellingMarks}
            drawingStrokes={sessionDrawings[`spelling-${sessionSpellingViewMode}-${sessionSpellingActiveTab}-${sessionSpellingGridPage}`] || []}
            onUpdateDrawingStrokes={strokes => updateDrawingStrokes(`spelling-${sessionSpellingViewMode}-${sessionSpellingActiveTab}-${sessionSpellingGridPage}`, strokes)}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part9: 
        return (
          <PassageReading 
            text={currentLesson.passage || ""} 
            currentIndex={sessionPassageIndex}
            onUpdateIndex={setSessionPassageIndex}
            rulerEnabled={sessionPassageRulerEnabled}
            onUpdateRulerEnabled={setSessionPassageRulerEnabled}
            rulerY={sessionPassageRulerY}
            onUpdateRulerY={setSessionPassageRulerY}
            phase={sessionPassagePhase}
            onUpdatePhase={setSessionPassagePhase}
            questionIndex={sessionPassageQuestionIndex}
            onUpdateQuestionIndex={setSessionPassageQuestionIndex}
            strokes={sessionDrawings.passage || []}
            onUpdateStrokes={strokes => updateDrawingStrokes('passage', strokes)}
            readOnly={isStudentView}
          />
        );
      case LessonPart.Part10:
        if (isStudentView || !isSessionDossierOpen) {
          return (
            <Part10Listening
              plan={currentLesson.listeningComprehension}
              readOnly={isStudentView}
              onOpenDossier={isStudentView ? undefined : () => setIsSessionDossierOpen(true)}
            />
          );
        }
        if (!activeGroup) {
          return <UnassignedLessonCompletion onReturn={() => setLocalLessonPart(LessonPart.Briefing)} />;
        }
        return (
          <SessionDossier 
            lesson={currentLesson} 
            activeGroup={activeGroup}
            students={students} 
            sessionStudentIds={sessionStudentIds} 
            sessionScores={sessionScores}
            sessionNotes={sessionNotes}
            sessionId={sessionId}
            sessionDate={sessionDate}
            dateStarted={spotDateStarted(getSpot(activeGroup.id), currentLesson.id, sessionId, sessionDate, localDateString())}
            teacherId={user?.uid || ''}
            onArchiveMission={archiveMission}
            onComplete={() => { 
              // Finishing clears only this group's saved spot.
              const finishedGroupId = activeGroup.id;
              dropPendingSpot();
              setMode('dashboard'); 
              setIsSessionDossierOpen(false);
              updateSession(null); 
              setSessionNotes('');
              void clearSpot(finishedGroupId);
              // A stale copy of this finished lesson (the running-lesson document or the
              // old device slot) must not be carried over as a new spot.
              if (sessionId) writeMigratedSessionIds([...readMigratedSessionIds(), sessionId]);
              if (legacyRecoverable?.sessionId && legacyRecoverable.sessionId === sessionId) clearRecoverableSession();
            }}
            onUpdateGroup={updateSquad}
            gasUrl=""
          />
        );
      default: return <div>Module Under Construction</div>;
    }
  };

  if (isInitializing) {
    return (
      <div className="h-full w-full bg-[#fcfbf9] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-red-800 animate-spin mx-auto mb-6 opacity-20" />
          <p className="text-stone-400 font-serif uppercase tracking-widest animate-pulse text-[10px]">Entering the Cloud Temple...</p>
        </div>
      </div>
    );
  }

  if (isStudentDisplayWindow && (!presenterHasSnapshot || mode !== 'run' || !currentLesson)) {
    return (
      <div className="h-full w-full bg-stone-950 text-white flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center text-[70vh] font-black select-none">道</div>
        <div className="relative text-center max-w-xl">
          <div className="w-24 h-24 rounded-[2rem] bg-red-800 flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(153,27,27,0.35)]">
            <MonitorUp className="h-12 w-12" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-4">Student Display</p>
          <h1 className="text-4xl md:text-6xl font-black font-serif mb-5">Ready when you are.</h1>
          <p className="text-sm md:text-base font-bold text-stone-500 leading-relaxed">
            {cloudPresenterError
              ? `Connection delayed: ${cloudPresenterError} The screen will keep retrying automatically.`
              : presenterStatus === 'connected'
              ? 'Connected to the teacher window. The lesson will appear here when it begins.'
              : presenterStatus === 'lagging'
              ? 'The connection is delayed. Reconnecting automatically without leaving the lesson.'
              : 'Waiting for the teacher laptop to connect.'}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => document.documentElement.requestFullscreen?.()}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-colors"
            >
              <Maximize2 className="h-4 w-4" /> Full Screen
            </button>
            <button
              type="button"
              onClick={closeStudentDisplay}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-white hover:border-stone-700 transition-colors"
            >
              <X className="h-4 w-4" /> Exit Student Display
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LessonLibraryProvider value={lessonLibrary}>
    <LessonStatusProvider value={lessonStatus}>
    <div className="h-full w-full bg-[#fcfbf9] text-stone-900 relative overflow-hidden selection:bg-red-500/10">
      {safeBoot && isSafeBootNoticeVisible && mode === 'dashboard' && (
        <div className="fixed left-1/2 top-4 z-[300] flex w-[min(92vw,44rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-xl" role="status">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Safe recovery mode</p>
            <p className="mt-1 text-xs font-bold">An unreadable unfinished lesson was skipped so the dashboard could open. No student records were deleted.</p>
          </div>
          <button type="button" onClick={() => setIsSafeBootNoticeVisible(false)} className="shrink-0 rounded-lg p-2 text-amber-700 hover:bg-amber-100" aria-label="Dismiss safe recovery notice">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <PresenterSetupDialog
        open={isPresenterSetupOpen}
        onClose={() => setIsPresenterSetupOpen(false)}
        onOpenLocal={openLocalStudentDisplay}
        onStartCloud={startCloudPresenter}
        onUseAsStudentScreen={() => {
          setIsPresenterSetupOpen(false);
          setIsStudentScreenJoinOpen(true);
        }}
        onStopCloud={stopCloudPresenter}
        onResync={resyncStudentDisplay}
        cloudActive={cloudPresenterActive}
        cloudAvailable={Boolean(user && user.uid !== 'guest-sensei')}
        code={isPresenterCode(presenterId) ? presenterId : ''}
        studentDisplayUrl={studentDisplayUrl}
        status={presenterStatus}
        error={cloudPresenterError}
      />
      <StudentScreenJoinDialog
        open={isStudentScreenJoinOpen}
        onClose={() => setIsStudentScreenJoinOpen(false)}
        onJoin={joinCloudStudentDisplay}
      />
      {/* Guest Mode Warning for Real-time Features */}
      {mode === 'run' && user?.uid === 'guest-sensei' && isGuestModeNoticeVisible && !isStudentView && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-amber-600 text-white pl-6 pr-3 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-8 flex items-center gap-3" role="status">
          <AlertTriangle className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest">Guest Mode Active</span>
            <span className="text-[9px] font-bold opacity-90">Real-time remote control requires a Cloud connection.</span>
          </div>
          <button 
            onClick={() => setMode('dashboard')}
            className="ml-4 bg-white text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-50 transition-colors"
          >
            Connect Now
          </button>
          <button
            type="button"
            onClick={() => setIsGuestModeNoticeVisible(false)}
            className="ml-1 rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            aria-label="Dismiss guest mode notice"
            title="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {mode === 'dashboard' ? (
        <GroupDashboard 
          groups={groups} 
          students={students}
          archivedGroups={archivedGroups}
          archivedStudents={archivedStudents}
          groupNotes={groupNotes}
          currentRosterReady={currentRosterReady}
          activeGroup={activeGroup}
          onSelectGroup={setActiveGroup} 
          onUpdateGroups={(gs) => gs.forEach(g => updateSquad(g))} 
          onUpdateGroup={updateSquad}
          onUpdateStudents={(ss) => ss.forEach(s => updateStudent(s))} 
          onDeleteGroup={deleteSquad}
          onDeleteStudent={deleteStudent}
          onLaunchLesson={launchLesson}
          onEditLesson={(l) => { setCurrentLesson(l); setMode('edit'); }}
          onPrintLesson={(l) => { printLessonToNewWindow(l, activeGroup || undefined); }}
          onCreateLesson={() => { clearSafeBootMode(); setCurrentLesson(null); setMode('edit'); }}
          cloudStatus={cloudStatus}
          cloudError={cloudError}
          lastCloudSaveAt={lastCloudSaveAt}
          lastCloudCheckAt={lastCloudCheckAt}
          hasLocalData={hasLocalData}
          onResetToMaster={resetToMasterRoster}
          onMigrateLocalData={migrateLocalData}
          onVerifyCloudPersistence={verifyCloudPersistence}
          spots={groupSpots.spots}
          spotsError={groupSpots.error}
          onResumeSpot={spot => resumeGroupSpot(spot)}
          onDiscardSpot={discardGroupSpot}
          onJoinStudentDisplay={joinCloudStudentDisplay}
          user={user}
        />
      ) : mode === 'edit' ? (
        <div className="h-full w-full relative overflow-y-auto bg-[#fcfbf9] text-stone-900">
          <div className="absolute top-4 left-4 z-50">
             <button onClick={() => setMode('dashboard')} className="bg-white text-stone-600 px-6 py-3 rounded-xl shadow-sm border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-widest">&larr; Return to Dojo</button>
          </div>
          <LessonForm 
            key={currentLesson?.id || 'new'}
            initialLesson={currentLesson || undefined} 
            activeGroup={activeGroup || undefined}
            onSave={async (l, run = false) => {
              if (lessonLibrary.isLibraryLesson(l.id)) {
                // Loaded lessons live in their own Firestore documents.
                const result = await lessonLibrary.updateLesson(l);
                if (!result.ok) {
                  window.alert(`This lesson was not saved.\n\n${result.message}`);
                  return;
                }
              } else {
                if (!activeGroup) {
                  window.alert('Choose a group before saving this lesson.');
                  return;
                }
                const updated = { ...activeGroup, savedLessons: [...activeGroup.savedLessons.filter(sl => sl && sl.id !== l.id), l] };
                // updateSquad reports failure by returning false; never show a save that didn't happen.
                if (!(await updateSquad(updated))) {
                  window.alert(`This lesson was not saved to ${activeGroup.name}. Details are in the browser console (Ctrl+Shift+J).`);
                  return;
                }
                setActiveGroup(updated); // Sync local activeGroup state
              }
              setCurrentLesson(l);
              if (run) {
                setMode('run');
                setLocalLessonPart(LessonPart.Briefing);
              } else {
                setMode('dashboard');
              }
            }} 
          />
        </div>
      ) : mode === 'mission' ? (
        currentLesson && (
          <MissionPlayer 
            lesson={currentLesson}
            students={sessionStudents}
            onComplete={(scores) => {
              setSessionScores(scores);
              setMode('run');
              setLocalLessonPart(LessonPart.Part10); // Go to Dossier
            }}
            onExit={() => setMode('dashboard')}
          />
        )
      ) : (
        currentLesson && (
          <BoardSafeProvider value={{ boardSafe: !isStudentView && boardSafe, setBoardSafe: value => setBoardSafeOverride(value) }}>
          <Layout 
            key={currentLesson.id}
            lesson={currentLesson} 
            currentPart={currentPart} 
            onChangePart={changeLessonPart}
            notes={sessionNotes}
            activeGroup={activeGroup}
            noteStudents={sessionStudents}
            onSaveQuickNote={saveQuickNote}
            isStudentView={isStudentView}
            presenterStatus={presenterStatus}
            onOpenStudentDisplay={openStudentDisplay}
            onCloseStudentDisplay={closeStudentDisplay}
            showDrawingsOnStudentDisplay={showPresenterDrawings}
            onToggleDrawingsOnStudentDisplay={() => setShowPresenterDrawings(value => !value)}
            onResyncStudentDisplay={resyncStudentDisplay}
            onExit={() => setMode('edit')} 
            onDashboard={() => setMode('dashboard')}
            onPrint={() => {
              if (currentLesson) {
                printLessonToNewWindow(currentLesson, activeGroup || undefined);
              }
            }}
          >
            {isStudentView
              ? <div className="pointer-events-none h-full w-full">{renderModule()}</div>
              : renderModule()}
          </Layout>
          </BoardSafeProvider>
        )
      )}
      <UnfinishedLessonPrompt
        spot={launchPrompt?.spot || null}
        onResume={() => { if (launchPrompt) resumeGroupSpot(launchPrompt.spot); }}
        onStartNew={() => launchPrompt?.startNew()}
        onCancel={() => setLaunchPrompt(null)}
      />
    </div>
    </LessonStatusProvider>
    </LessonLibraryProvider>
  );
};

export default App;