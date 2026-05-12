"use client";

/**
 * Small client controls for editing a persisted Task in place. All four
 * controls follow the same pattern:
 *
 *   - Wrap a `<form>` around the input.
 *   - Submit on change (selects, date input) via `requestSubmit()` so
 *     the user does not need a Save button for routine moves.
 *   - The details editor keeps an explicit Save button because typing
 *     a multi-line description shouldn't fire on every keystroke.
 *
 * Server actions live in `src/lib/task-actions.ts`; this file is purely
 * a thin client wrapper. No tokens or env values are touched here.
 */

import {
  useActionState,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  updateTaskDetailsAction,
  updateTaskDueDateAction,
  updateTaskPriorityAction,
  updateTaskStatusAction,
  type UpdateTaskState,
} from "@/lib/task-actions";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "blocked", label: "Blocked" },
  { value: "needs_decision", label: "Needs decision" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_vendor", label: "Waiting on vendor" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const SELECT_CLASS =
  "block min-h-[28px] rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--workspace-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60";

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    updateTaskStatusAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === status) return;
    formRef.current?.requestSubmit();
  };
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
          Status
        </span>
        <select
          name="status"
          defaultValue={status}
          disabled={pending}
          onChange={onChange}
          className={SELECT_CLASS}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {state && !state.ok ? (
        <ErrorPill message={state.message} />
      ) : null}
    </form>
  );
}

export function TaskPrioritySelect({
  taskId,
  priority,
}: {
  taskId: string;
  priority: string;
}) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    updateTaskPriorityAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === priority) return;
    formRef.current?.requestSubmit();
  };
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
          Priority
        </span>
        <select
          name="priority"
          defaultValue={priority}
          disabled={pending}
          onChange={onChange}
          className={SELECT_CLASS}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {state && !state.ok ? <ErrorPill message={state.message} /> : null}
    </form>
  );
}

export function TaskDueDateInput({
  taskId,
  dueDate,
}: {
  taskId: string;
  /** ISO date string (YYYY-MM-DD) or empty for no due date. */
  dueDate: string;
}) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    updateTaskDueDateAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === dueDate) return;
    formRef.current?.requestSubmit();
  };
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
          Due
        </span>
        <input
          type="date"
          name="dueDate"
          defaultValue={dueDate}
          disabled={pending}
          onChange={onChange}
          className="block min-h-[28px] rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--workspace-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
        />
      </label>
      {state && !state.ok ? <ErrorPill message={state.message} /> : null}
    </form>
  );
}

export function TaskDetailsEditor({
  taskId,
  title,
  description,
}: {
  taskId: string;
  title: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    updateTaskDetailsAction,
    null
  );

  // Close the editor automatically after a successful save so the user
  // returns to the read-only card view without manual clicking.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    // Let useActionState handle the submission; only intercept to close
    // on success after the action settles.
    setTimeout(() => {
      if (state?.ok) setOpen(false);
    }, 0);
    return e;
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
      >
        Edit details
      </button>
    );
  }

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
          Title
        </span>
        <input
          type="text"
          name="title"
          defaultValue={title}
          required
          maxLength={280}
          disabled={pending}
          className="block w-full min-w-0 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--workspace-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
          Description
        </span>
        <textarea
          name="description"
          defaultValue={description ?? ""}
          rows={3}
          maxLength={4000}
          disabled={pending}
          className="block w-full min-w-0 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--workspace-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:cursor-progress disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save details"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
        >
          Cancel
        </button>
        {state && !state.ok ? <ErrorPill message={state.message} /> : null}
      </div>
    </form>
  );
}

function ErrorPill({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
      {message}
    </span>
  );
}
