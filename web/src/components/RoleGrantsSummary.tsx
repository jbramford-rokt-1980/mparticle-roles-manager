import type { Role, TaskDef } from '@roles/shared';
import { CORE_TASK, IMPLICIT_ROLE_CAPABILITIES, taskHelp, taskLabel } from '@roles/shared';

export interface RoleGrantsSummaryProps {
  role: Role;
  tasks: TaskDef[];
}

/** Plain-language answer to "what does this role give access to?". */
export function RoleGrantsSummary({ role, tasks }: RoleGrantsSummaryProps) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const granted = role.tasks
    .map((t) => t.task_id)
    .filter((id) => id !== CORE_TASK)
    .sort();

  return (
    <details className="border border-black/15 bg-wine-tint/30">
      <summary className="cursor-pointer px-4 py-3 font-medium">
        What this role grants
        <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-black/50">
          {granted.length} permissions + core
        </span>
      </summary>
      <div className="border-t border-black/10 px-4 py-3">
        <ul className="space-y-2">
          {granted.map((taskId) => {
            const def = byId.get(taskId) ?? { task_id: taskId, display_name: null, description: null };
            return (
              <li key={taskId}>
                <span className="text-[15px] font-medium">{taskLabel(def)}</span>
                <span className="ml-2 font-mono text-[11px] text-black/40">{taskId}</span>
                {taskHelp(def) && (
                  <span className="block text-sm text-black/60">{taskHelp(def)}</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 border-t border-black/10 pt-3 text-sm text-black/55">
          {IMPLICIT_ROLE_CAPABILITIES}
        </p>
      </div>
    </details>
  );
}
