import type { TaskDef } from '@roles/shared';
import { CORE_TASK, TASK_DESCRIPTIONS, allTaskIds, groupTasksBySection } from '@roles/shared';

import { Button } from './ui/Button';

export interface PermissionGridProps {
  tasks: TaskDef[];
  /** task_ids currently granted (core is implied and always rendered checked). */
  granted: ReadonlySet<string>;
  readOnly?: boolean;
  onToggle?: (taskId: string, checked: boolean) => void;
  /** Grant or clear several permissions at once (the section bulk actions). */
  onBulkToggle?: (taskIds: string[], checked: boolean) => void;
}

/**
 * The full permission catalog as checkboxes, sectioned the way the platform
 * is organized (ingestion → connections → features → admin); core pinned.
 */
export function PermissionGrid({
  tasks,
  granted,
  readOnly = false,
  onToggle,
  onBulkToggle,
}: PermissionGridProps) {
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

      {sections.map((section, index) => (
        <section key={section.label} className="mt-10 first-of-type:mt-8">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tracking-[0.18em] text-beetroot">
              {String(index + 1).padStart(3, '0')}
            </span>
            <h3 className="shrink-0 font-medium tracking-tight">{section.label}</h3>
            <span className="h-px w-full bg-black/15" role="presentation" />
            {!readOnly && onBulkToggle && (
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Grant all ${section.label} permissions`}
                  onClick={() => onBulkToggle(allTaskIds(section.groups), true)}
                >
                  Grant all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove all ${section.label} permissions`}
                  onClick={() => onBulkToggle(allTaskIds(section.groups), false)}
                >
                  Remove all
                </Button>
              </span>
            )}
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
                        {option.undocumented && (
                          <span
                            title="This permission exists in the API but mParticle has not published a description for it. The wording here is inferred — confirm the exact scope in the mParticle UI."
                            className="ml-2 cursor-help border border-black/20 px-1.5 py-0.5 align-middle font-mono text-[9px] uppercase tracking-[0.14em] text-black/45"
                          >
                            unverified
                          </span>
                        )}
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
