import { useState } from 'react';

/**
 * A hook that manages state that can either be "synced" (coming from props)
 * or "local" (if no prop is provided).
 */
export function useSyncState<T>(
  syncedValue: T | undefined,
  onUpdate: ((val: T) => void) | undefined,
  initialLocalValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const [localValue, setLocalValue] = useState<T>(initialLocalValue);

  const value = syncedValue !== undefined ? syncedValue : localValue;

  const setValue = (val: T | ((prev: T) => T)) => {
    const nextValue = typeof val === 'function' ? (val as any)(value) : val;
    if (onUpdate) {
      onUpdate(nextValue);
    } else {
      setLocalValue(nextValue);
    }
  };

  return [value, setValue];
}
