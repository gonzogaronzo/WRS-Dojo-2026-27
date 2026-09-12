import { createHash, randomUUID } from 'node:crypto';

export class SheetSyncBusyError extends Error {
  constructor() {
    super('Another synchronization currently owns this spreadsheet lease.');
    this.name = 'SheetSyncBusyError';
  }
}

const lockDocumentId = spreadsheetId => createHash('sha256').update(spreadsheetId).digest('hex');

export function createFirestoreSheetLock({ firestore, now = Date.now, leaseMs = 120_000 }) {
  return async ({ spreadsheetId, task }) => {
    const token = randomUUID();
    const lockRef = firestore.collection('_sheet_sync_locks').doc(lockDocumentId(spreadsheetId));

    await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(lockRef);
      const lock = snapshot.exists ? snapshot.data() : null;
      if (Number(lock?.expiresAtMs || 0) > now()) throw new SheetSyncBusyError();
      transaction.set(lockRef, {
        token,
        acquiredAtMs: now(),
        expiresAtMs: now() + leaseMs
      });
    });

    try {
      return await task();
    } finally {
      await firestore.runTransaction(async transaction => {
        const snapshot = await transaction.get(lockRef);
        if (snapshot.exists && snapshot.data()?.token === token) transaction.delete(lockRef);
      });
    }
  };
}
