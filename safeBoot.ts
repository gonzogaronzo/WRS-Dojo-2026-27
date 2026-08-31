export const SAFE_BOOT_KEY = 'wrs_dojo_safe_boot_v1';
export const LAST_CLIENT_ERROR_KEY = 'wrs_dojo_last_client_error_v1';

export const isSafeBootMode = () => (
  typeof window !== 'undefined' && window.sessionStorage.getItem(SAFE_BOOT_KEY) === '1'
);

export const requestSafeBoot = (error: Error, componentStack?: string | null) => {
  if (typeof window === 'undefined' || isSafeBootMode()) return false;

  window.sessionStorage.setItem(SAFE_BOOT_KEY, '1');
  window.sessionStorage.setItem(LAST_CLIENT_ERROR_KEY, JSON.stringify({
    message: error.message,
    stack: error.stack || '',
    componentStack: componentStack || '',
    occurredAt: new Date().toISOString()
  }));
  return true;
};

export const clearSafeBootMode = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SAFE_BOOT_KEY);
};
