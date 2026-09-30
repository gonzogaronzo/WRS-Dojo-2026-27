/**
 * Saving and clearing a group's spot, with the cloud write injected so tests
 * can prove what is (and is not) touched. The only collection a spot ever
 * writes to is the lesson library's, under its own document id. It never
 * writes to `missions` or `daily_notes`, which feed the Google Sheets log.
 */
import { LESSON_LIBRARY_COLLECTION } from './lessonLibrary';
import {
  GroupSpot, SpotStorage, groupSpotId, removeLocalSpot, spotStorageProblem, writeLocalSpot
} from './groupSpots';

export interface SpotRemote {
  set(collectionName: string, documentId: string, data: Record<string, unknown>): Promise<void>;
  remove(collectionName: string, documentId: string): Promise<void>;
}

export interface SpotSaveResult {
  /** The device copy is always written first, so a spot survives a dropped connection. */
  device: boolean;
  cloud: boolean;
  message: string;
}

export const saveSpotEverywhere = async (
  spot: GroupSpot,
  remote: SpotRemote | null,
  storage: SpotStorage | null,
  describeError: (error: unknown) => string = error => (error instanceof Error ? error.message : String(error))
): Promise<SpotSaveResult> => {
  let device = false;
  try {
    writeLocalSpot(spot, storage);
    device = Boolean(storage);
  } catch (error) {
    console.warn('The unfinished lesson could not be kept on this device', error);
  }
  if (!remote) return { device, cloud: false, message: 'Kept on this device only.' };

  // A spot too big for the cloud first sheds its drawings (the device copy keeps
  // them); if it is still too big it stays on this device only.
  let cloudSpot = spot;
  let shedDrawings = false;
  if (spotStorageProblem(cloudSpot)) {
    cloudSpot = { ...spot, session: { ...spot.session, drawings: {} } };
    shedDrawings = true;
  }
  const problem = spotStorageProblem(cloudSpot);
  if (problem) return { device, cloud: false, message: problem };
  try {
    await remote.set(LESSON_LIBRARY_COLLECTION, cloudSpot.id, cloudSpot as unknown as Record<string, unknown>);
    return {
      device,
      cloud: true,
      message: shedDrawings ? 'Saved. The drawings are kept on this computer only because they are too large for the cloud.' : 'Saved.'
    };
  } catch (error) {
    return { device, cloud: false, message: describeError(error) };
  }
};

/** Clears one group's spot, on the device and in the cloud. No other group is touched. */
export const clearSpotEverywhere = async (
  teacherId: string,
  groupId: string,
  remote: SpotRemote | null,
  storage: SpotStorage | null
): Promise<void> => {
  removeLocalSpot(groupId, storage);
  if (remote && teacherId) await remote.remove(LESSON_LIBRARY_COLLECTION, groupSpotId(teacherId, groupId));
};
