import crypto from 'node:crypto';
import fs from 'node:fs';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const sortValue = value => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
};

const omit = (value, keys) => {
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.has(key)));
};

export const buildFingerprintPayload = ({ snapshot, packet, request, selectionHistory = null }) => {
  const stableSnapshot = omit(snapshot, new Set(['generatedAt', 'snapshotId']));
  const stablePacket = omit(packet, new Set(['verifiedAt']));
  const stableRequest = omit(request, new Set(['createdAt', 'requestId', 'groupSnapshotRef', 'sourcePacketRef', 'selectionHistoryRef']));
  return sortValue({
    snapshot: stableSnapshot,
    packet: stablePacket,
    request: stableRequest,
    selectionHistory
  });
};

export const computeLessonBuildFingerprint = inputs => {
  const canonical = JSON.stringify(buildFingerprintPayload(inputs));
  return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
};

const parseArgs = argv => {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || !value) throw new Error(`Invalid argument near ${flag || '(end)'}.`);
    args[flag.slice(2)] = value;
  }
  return args;
};

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    for (const required of ['snapshot', 'packet', 'request']) {
      if (!args[required]) throw new Error(`Missing --${required}.`);
    }
    const fingerprint = computeLessonBuildFingerprint({
      snapshot: readJson(args.snapshot),
      packet: readJson(args.packet),
      request: readJson(args.request),
      selectionHistory: args.history ? readJson(args.history) : null
    });
    process.stdout.write(`${fingerprint}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
