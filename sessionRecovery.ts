import { DojoMasterData, Lesson, LessonPart } from './types';

export const RECOVERY_KEY = 'wrs_dojo_recoverable_session_v1';

export type ActiveLessonSession = NonNullable<DojoMasterData['activeSession']>;

export interface RecoverableSession extends ActiveLessonSession {
  lesson: Lesson;
  currentPart: LessonPart;
  savedAt: string;
}

export const loadRecoverableSession = (): RecoverableSession | null => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(RECOVERY_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as RecoverableSession;
    if (!parsed.lesson?.id || !parsed.groupId || typeof parsed.currentPart !== 'number' || !parsed.savedAt) {
      throw new Error('Incomplete session recovery data');
    }
    return parsed;
  } catch (error) {
    console.warn('Discarding unreadable lesson recovery data', error);
    window.localStorage.removeItem(RECOVERY_KEY);
    return null;
  }
};

export const saveRecoverableSession = (session: RecoverableSession) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(session));
};

export const clearRecoverableSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(RECOVERY_KEY);
};
