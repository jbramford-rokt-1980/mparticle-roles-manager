import type { TaskDef } from '@roles/shared';
import { CORE_TASK, TASK_DESCRIPTIONS, groupTasksBySection } from '@roles/shared';

export interface PermissionGridProps {
  tasks: TaskDef[];
  /** task_ids currently granted (core is implied and always rendered checked). */
  granted: ReadonlySet<string>;
  readOnly?: boolean;
  onToggle?: (taskId: string, checked: boolean) => void;
}

/**
 * The full permission catalog as checkboxes, sectioned the way the platform
 * is organized (ingestion → connections → features → admin); core pinned.
 */
export function PermissionGrid({ tasks, granted, readOnly = false, onToggle }: PermissionGridProps) {
  const core = tasks.find((t) => t.task_id === CORE_TASK);
  const sections = groupTasksBySection(tasks);

  return (
    <div>
      <div className="border border-black/15 bg-wine-tint/40 px-4 py-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked
            disabled
            className="mt-1 accent-beetroot"
            aria-label={core?.display_name ?? 'Core access'}
          />
          <span>
            <span className="font-medium">{core?.display_name ?? 'Core access'}</span>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">
              always included
            </span>
            <span className="block text-sm text-black/60">
              {core?.description ?? TASK_DESCRIPTIONS[CORE_TASK]}
            </span>
          </span>
        </label>
      </div>

      {sections.map((section) => (
        <section key={section.label} className="mt-8 first-of-type:mt-5">
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 font-medium">{section.label}</h3>
            <span className="h-px w-full bg-black/15" role="presentation" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {section.groups.map((group) => (
              <fieldset key={group.feature} className="border border-black/15 p-4">
                <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-black/60">
                  {group.label}
                </legend>
                <div className="space-y-2.5">
                  {group.options.map((option) => (
                    <label key={option.task_id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 accent-beetroot"
                        checked={granted.has(option.task_id)}
                        disabled={readOnly}
                        onChange={(e) => onToggle?.(option.task_id, e.target.checked)}
                        aria-label={option.label}
                      />
                      <span>
                        <span className="text-[15px]">{option.label}</span>
                        <span className="ml-2 font-mono text-[11px] text-black/40">
                          {option.task_id}
                        </span>
                        {option.help && (
                          <span className="block text-sm text-black/55">{option.help}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
