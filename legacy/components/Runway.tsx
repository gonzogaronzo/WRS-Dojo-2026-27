import React from 'react';
import { AlertTriangle, BookOpen, OctagonAlert } from 'lucide-react';
import type { GroupProfile } from '../types';
import { Runway as RunwayInfo, runwayAlerts } from '../lessonStatus';
import { useRunways } from '../useLessonStatus';

const chipStyles: Record<RunwayInfo['level'], string> = {
  none: 'border-red-700 bg-red-100 text-red-900',
  last: 'border-amber-600 bg-amber-100 text-amber-950',
  ok: 'border-stone-300 bg-white text-stone-700'
};

/** "On deck: N", with words and an icon so it reads on a smartboard without color. */
export const RunwayChip: React.FC<{ runway: RunwayInfo }> = ({ runway }) => {
  const Icon = runway.level === 'none' ? OctagonAlert : runway.level === 'last' ? AlertTriangle : BookOpen;
  return (
    <span
      data-runway={runway.level}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${chipStyles[runway.level]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {runway.countLabel}
      {runway.warning && <span> · {runway.warning}</span>}
    </span>
  );
};

/** Chip for one group card; shows nothing until lessons have loaded. */
export const GroupRunwayChip: React.FC<{ groups: GroupProfile[]; groupId: string }> = ({ groups, groupId }) => {
  const runways = useRunways(groups);
  const runway = runways?.[groupId];
  return runway ? <RunwayChip runway={runway} /> : null;
};

/** One line listing any group at 0 or 1 on deck. Nothing at all when every group has 2 or more. */
export const RunwayNotice: React.FC<{ groups: GroupProfile[] }> = ({ groups }) => {
  const runways = useRunways(groups);
  if (!runways) return null;
  const alerts = runwayAlerts(groups, runways);
  if (alerts.length === 0) return null;
  return (
    <section className="w-full border-b border-amber-300 bg-amber-50 px-4 py-3" aria-label="Lessons running low">
      <p className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black text-amber-950">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Running low on lessons:</span>
        {alerts.map(alert => (
          <span key={alert.groupId} className="rounded-full border border-amber-600 bg-white px-2 py-0.5">
            {alert.groupName} — {alert.runway.warning}
          </span>
        ))}
      </p>
    </section>
  );
};
