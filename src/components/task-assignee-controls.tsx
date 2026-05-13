"use client";

/**
 * Inline assignee controls for a persisted Task. Shows either:
 *   - a "Assign to me" / "Assign someone…" picker when the task is
 *     unassigned, or
 *   - the assignee chip with an Unassign button when one is set.
 *
 * Mirrors the existing TaskStatusSelect / TaskPrioritySelect pattern:
 * tiny client wrapper around the server actions in
 * `src/lib/task-actions.ts`. No tokens or env values are read here.
 */

import {
  useActionState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  assignTaskAction,
  unassignTaskAction,
  type UpdateTaskState,
} from "@/lib/task-actions";

export type AssignableUser = {
  id: string;
  email: string;
  name: string | null;
};

export type CurrentUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

export function TaskAssigneeControls({
  taskId,
  assignedTo,
  currentUser,
  users,
}: {
  taskId: string;
  assignedTo: AssignableUser | null;
  currentUser: CurrentUserSummary | null;
  users: AssignableUser[];
}) {
  if (assignedTo) {
    return (
      <AssignedRow
        taskId={taskId}
        assignedTo={assignedTo}
        isMe={currentUser?.id === assignedTo.id}
      />
    );
  }
  return (
    <UnassignedRow
      taskId={taskId}
      currentUser={currentUser}
      users={users}
    />
  );
}

function AssignedRow({
  taskId,
  assignedTo,
  isMe,
}: {
  taskId: string;
  assignedTo: AssignableUser;
  isMe: boolean;
}) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    unassignTaskAction,
    null
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--workspace-text-secondary)]"
        title={assignedTo.email}
      >
        <span aria-hidden>👤</span>
        <span>
          {isMe ? "Assigned to me" : `Assigned to ${displayLabel(assignedTo)}`}
        </span>
      </span>
      <form action={action} className="flex">
        <input type="hidden" name="taskId" value={taskId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[26px] items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--workspace-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:cursor-progress disabled:opacity-60"
        >
          {pending ? "…" : "Unassign"}
        </button>
      </form>
      {state && !state.ok ? <ErrorPill message={state.message} /> : null}
    </div>
  );
}

function UnassignedRow({
  taskId,
  currentUser,
  users,
}: {
  taskId: string;
  currentUser: CurrentUserSummary | null;
  users: AssignableUser[];
}) {
  const [state, action, pending] = useActionState<UpdateTaskState, FormData>(
    assignTaskAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) return;
    formRef.current?.requestSubmit();
  };
  const onMeSubmit = (_e: FormEvent<HTMLFormElement>) => {
    // useActionState handles the submission; nothing else to do here.
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-muted)]">
        Unassigned
      </span>

      {currentUser ? (
        <form ref={formRef} action={action} onSubmit={onMeSubmit} className="flex">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="userId" value={currentUser.id} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[26px] items-center rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)] disabled:cursor-progress disabled:opacity-60"
          >
            {pending ? "…" : "Assign to me"}
          </button>
        </form>
      ) : null}

      {users.length > 0 ? (
        <form action={action} className="flex">
          <input type="hidden" name="taskId" value={taskId} />
          <label className="flex items-center gap-1">
            <span className="sr-only">Assign to</span>
            <select
              name="userId"
              defaultValue=""
              disabled={pending}
              onChange={onSelectChange}
              className="block min-h-[26px] rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--workspace-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
            >
              <option value="" disabled>
                Assign someone…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {displayLabel(u)}
                </option>
              ))}
            </select>
          </label>
        </form>
      ) : null}

      {state && !state.ok ? <ErrorPill message={state.message} /> : null}
    </div>
  );
}

function displayLabel(u: { email: string; name: string | null }): string {
  return (u.name && u.name.trim().length > 0 ? u.name : u.email);
}

function ErrorPill({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
      {message}
    </span>
  );
}
