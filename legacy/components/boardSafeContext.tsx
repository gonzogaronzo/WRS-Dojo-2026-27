import { createContext, useContext } from 'react';

/**
 * One board-safe switch for the whole lesson. When on, teacher-only content
 * (dictation cues, target words, directions) is hidden on the teacher screen so
 * it can be projected. Absent provider = feature off (tests, student display).
 */
export interface BoardSafeState {
  boardSafe: boolean;
  setBoardSafe: (value: boolean) => void;
}

const BoardSafeContext = createContext<BoardSafeState | null>(null);

export const BoardSafeProvider = BoardSafeContext.Provider;
export const useBoardSafe = (): BoardSafeState | null => useContext(BoardSafeContext);
