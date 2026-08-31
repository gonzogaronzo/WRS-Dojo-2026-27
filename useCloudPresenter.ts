import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  deserializePresenterSnapshot,
  isPresenterCode,
  presenterSnapshotOrder,
  serializePresenterSnapshot,
  PresenterConnectionStatus,
  PresenterSnapshot
} from './presenterMode';

interface UseCloudPresenterOptions {
  role: 'resolving' | 'teacher' | 'student';
  active: boolean;
  presenterId: string;
  userId?: string | null;
  snapshot: PresenterSnapshot | null;
  onSnapshot: (snapshot: PresenterSnapshot) => void;
}

interface CloudPresenterDocument {
  teacherId?: string;
  snapshot?: unknown;
  studentConnectedAt?: unknown;
  studentHeartbeatAt?: unknown;
  studentHeartbeatMs?: number;
  studentAckRevision?: number;
  teacherHeartbeatAt?: unknown;
  teacherHeartbeatMs?: number;
  status?: 'active' | 'closed';
}

const TEACHER_HEARTBEAT_MS = 5000;
const STUDENT_HEARTBEAT_MS = 8000;
const STALE_AFTER_MS = 25_000;
const ACK_STALE_AFTER_MS = 25_000;
const PUBLISH_INTERVAL_MS = 1000;
const RETRY_DELAY_MS = 1500;

const cloudTimestampMillis = (value: unknown, fallback = 0): number => {
  if (value && typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  }
  return fallback;
};

export const presenterHealth = (
  heartbeatMs: number,
  acknowledgedRevision: number,
  currentRevision: number,
  now = Date.now(),
  acknowledgementAdvancedAt = heartbeatMs,
  consecutivePublishFailures = 0
): PresenterConnectionStatus => {
  if (consecutivePublishFailures >= 3) return 'lagging';
  if (!heartbeatMs) return 'connecting';
  if (now - heartbeatMs > STALE_AFTER_MS) return 'lagging';
  if (currentRevision > acknowledgedRevision) {
    if (acknowledgementAdvancedAt && now - acknowledgementAdvancedAt > ACK_STALE_AFTER_MS) return 'lagging';
    if (acknowledgedRevision === 0) return 'connecting';
  }
  return 'connected';
};

export const useCloudPresenter = ({
  role,
  active,
  presenterId,
  userId,
  snapshot,
  onSnapshot: applySnapshot
}: UseCloudPresenterOptions) => {
  const [status, setStatus] = useState<PresenterConnectionStatus>('closed');
  const [error, setError] = useState<string | null>(null);
  const [teacherDocumentReady, setTeacherDocumentReady] = useState(false);
  const [listenerAttempt, setListenerAttempt] = useState(0);
  const snapshotRef = useRef(snapshot);
  const lastSentOrderRef = useRef(0);
  const lastTeacherHeartbeatRef = useRef(0);
  const lastStudentHeartbeatRef = useRef(0);
  const studentAckRevisionRef = useRef(0);
  const teacherAckRevisionRef = useRef(0);
  const teacherAckAdvancedAtRef = useRef(0);
  const publishFailureCountRef = useRef(0);

  snapshotRef.current = snapshot;

  const isSignedIn = Boolean(userId && userId !== 'guest-sensei');
  const isCloudCode = isPresenterCode(presenterId);
  const teacherEnabled = role === 'teacher' && active && isSignedIn && isCloudCode;
  const studentEnabled = role === 'student' && isSignedIn && isCloudCode;

  useEffect(() => {
    setError(null);
    setTeacherDocumentReady(false);
    lastSentOrderRef.current = 0;
    lastStudentHeartbeatRef.current = 0;
    teacherAckRevisionRef.current = 0;
    teacherAckAdvancedAtRef.current = 0;
    publishFailureCountRef.current = 0;
    if (!teacherEnabled || !userId || !snapshotRef.current) {
      if (!studentEnabled) setStatus('closed');
      return;
    }

    setStatus('connecting');
    const initialSnapshot = snapshotRef.current;
    const sessionRef = doc(db, 'presenter_sessions', presenterId);
    void setDoc(sessionRef, {
      teacherId: userId,
      // Keep the frame opaque to Firestore. Several lesson modules contain
      // nested arrays, which Firestore rejects when stored as native fields.
      snapshot: serializePresenterSnapshot(initialSnapshot),
      status: 'active',
      startedAt: serverTimestamp(),
      teacherHeartbeatAt: serverTimestamp(),
      teacherHeartbeatMs: Date.now(),
      updatedAt: serverTimestamp()
    }).then(() => {
      lastSentOrderRef.current = presenterSnapshotOrder(initialSnapshot);
      setTeacherDocumentReady(true);
      setError(null);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'The student display session could not be created.');
      setStatus('lagging');
    });
  }, [presenterId, studentEnabled, teacherEnabled, userId]);

  useEffect(() => {
    if (!teacherEnabled || !teacherDocumentReady || !userId) return;
    let writeInFlight = false;
    let lastHeartbeatSent = 0;
    const publish = async () => {
      if (writeInFlight) return;
      const current = snapshotRef.current;
      if (!current) return;
      const order = presenterSnapshotOrder(current);
      const now = Date.now();
      const hasNewSnapshot = order > lastSentOrderRef.current;
      const heartbeatDue = now - lastHeartbeatSent >= TEACHER_HEARTBEAT_MS;
      if (!hasNewSnapshot && !heartbeatDue) return;
      writeInFlight = true;
      const payload: Record<string, unknown> = {
        teacherId: userId,
        status: 'active',
        teacherHeartbeatAt: serverTimestamp(),
        teacherHeartbeatMs: now,
        updatedAt: serverTimestamp()
      };
      if (hasNewSnapshot) payload.snapshot = serializePresenterSnapshot(current);
      try {
        await setDoc(doc(db, 'presenter_sessions', presenterId), payload, { merge: true });
        if (hasNewSnapshot) lastSentOrderRef.current = order;
        lastHeartbeatSent = now;
        publishFailureCountRef.current = 0;
        setError(null);
      } catch (reason) {
        publishFailureCountRef.current += 1;
        setError(reason instanceof Error ? reason.message : 'The student display stopped syncing.');
        if (publishFailureCountRef.current >= 3) setStatus('lagging');
      } finally {
        writeInFlight = false;
      }
    };
    void publish();
    const interval = window.setInterval(() => void publish(), PUBLISH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [presenterId, teacherDocumentReady, teacherEnabled, userId]);

  useEffect(() => {
    if ((!studentEnabled && !teacherEnabled) || !userId) return;
    if (role === 'teacher' && !teacherDocumentReady) return;
    let retryTimer = 0;
    setStatus('connecting');
    const sessionRef = doc(db, 'presenter_sessions', presenterId);
    const unsubscribe = onSnapshot(sessionRef, documentSnapshot => {
      setError(null);
      if (!documentSnapshot.exists()) {
        setStatus('connecting');
        return;
      }
      const data = documentSnapshot.data() as CloudPresenterDocument;
      if (data.teacherId !== userId) {
        setError('This pairing code belongs to a different account.');
        setStatus('closed');
        return;
      }
      if (data.status === 'closed') {
        setStatus('closed');
        return;
      }

      if (role === 'teacher') {
        lastStudentHeartbeatRef.current = cloudTimestampMillis(data.studentHeartbeatAt, data.studentHeartbeatMs || 0);
        const nextAcknowledgement = data.studentAckRevision || 0;
        if (!teacherAckAdvancedAtRef.current && lastStudentHeartbeatRef.current) {
          teacherAckAdvancedAtRef.current = Date.now();
        }
        if (nextAcknowledgement > teacherAckRevisionRef.current) {
          teacherAckAdvancedAtRef.current = Date.now();
        }
        teacherAckRevisionRef.current = nextAcknowledgement;
        setStatus(presenterHealth(
          lastStudentHeartbeatRef.current,
          teacherAckRevisionRef.current,
          snapshotRef.current ? presenterSnapshotOrder(snapshotRef.current) : 0,
          Date.now(),
          teacherAckAdvancedAtRef.current,
          publishFailureCountRef.current
        ));
        return;
      }

      lastTeacherHeartbeatRef.current = cloudTimestampMillis(data.teacherHeartbeatAt, data.teacherHeartbeatMs || 0);
      const receivedSnapshot = deserializePresenterSnapshot(data.snapshot);
      if (!receivedSnapshot) {
        setStatus('connecting');
        return;
      }
      applySnapshot(receivedSnapshot);
      studentAckRevisionRef.current = presenterSnapshotOrder(receivedSnapshot);
      setStatus(Date.now() - lastTeacherHeartbeatRef.current > STALE_AFTER_MS ? 'lagging' : 'connected');
    }, reason => {
      setError(reason.message || 'The cloud presenter connection was interrupted. Retrying automatically.');
      setStatus('lagging');
      retryTimer = window.setTimeout(() => setListenerAttempt(value => value + 1), RETRY_DELAY_MS);
    });

    return () => {
      unsubscribe();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [applySnapshot, listenerAttempt, presenterId, role, studentEnabled, teacherDocumentReady, teacherEnabled, userId]);

  useEffect(() => {
    if (!studentEnabled || !userId) return;
    const sendHeartbeat = async () => {
      try {
        await setDoc(doc(db, 'presenter_sessions', presenterId), {
          teacherId: userId,
          studentConnectedAt: serverTimestamp(),
          studentHeartbeatAt: serverTimestamp(),
          studentHeartbeatMs: Date.now(),
          studentAckRevision: studentAckRevisionRef.current
        }, { merge: true });
        setError(null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The student screen could not confirm its connection.');
      }
    };
    void sendHeartbeat();
    const interval = window.setInterval(() => void sendHeartbeat(), STUDENT_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [presenterId, studentEnabled, userId]);

  useEffect(() => {
    if (!studentEnabled && !teacherEnabled) return;
    const interval = window.setInterval(() => {
      if (role === 'teacher') {
        setStatus(presenterHealth(
          lastStudentHeartbeatRef.current,
          teacherAckRevisionRef.current,
          snapshotRef.current ? presenterSnapshotOrder(snapshotRef.current) : 0,
          Date.now(),
          teacherAckAdvancedAtRef.current,
          publishFailureCountRef.current
        ));
      } else if (!lastTeacherHeartbeatRef.current || Date.now() - lastTeacherHeartbeatRef.current > STALE_AFTER_MS) {
        setStatus('lagging');
      }
    }, 1500);
    return () => window.clearInterval(interval);
  }, [role, studentEnabled, teacherEnabled]);

  const stopSession = useCallback(async () => {
    if (role === 'teacher' && isSignedIn && isCloudCode) {
      await setDoc(doc(db, 'presenter_sessions', presenterId), {
        teacherId: userId!,
        status: 'closed',
        teacherHeartbeatMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => undefined);
    }
    setTeacherDocumentReady(false);
    setStatus('closed');
    setError(null);
  }, [isCloudCode, isSignedIn, presenterId, role, userId]);

  return { status, error, stopSession };
};
