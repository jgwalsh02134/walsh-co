"use server";

/**
 * Server actions for the persisted `Task` model.
 *
 * Safety:
 *   - Every create runs only from an explicit user click on the
 *     corresponding form (`useActionState`-driven). There is no
 *     scheduler, no auto-create after AI review, and no upload-time
 *     hook.
 *   - The dedupe step makes `createTaskFromProposalAction` idempotent
 *     when called twice for the same (document, proposal index) — the
 *     second call returns the existing task rather than inserting a
 *     duplicate.
 *   - No AI provider call. The action re-reads the AI review JSON that
 *     is already persisted on the source DriveDocument; it does not
 *     re-run the review.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  inferPriorityFromText,
  isTaskPriority,
  isTaskStatus,
} from "@/lib/task-proposal";

export type CreateTaskFromProposalResult =
  | {
      ok: true;
      taskId: string;
      alreadyExisted: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export type CreateTaskFromProposalState =
  | CreateTaskFromProposalResult
  | null;

export async function createTaskFromProposalAction(
  _prev: CreateTaskFromProposalState,
  formData: FormData
): Promise<CreateTaskFromProposalResult> {
  const documentIdRaw = formData.get("documentId");
  const indexRaw = formData.get("proposalIndex");

  if (typeof documentIdRaw !== "string" || documentIdRaw.trim().length === 0) {
    return { ok: false, message: "Missing source document id." };
  }
  const documentId = documentIdRaw.trim();

  const proposalIndex = Number.parseInt(
    typeof indexRaw === "string" ? indexRaw : "",
    10
  );
  if (!Number.isFinite(proposalIndex) || proposalIndex < 0) {
    return { ok: false, message: "Missing or invalid proposal index." };
  }

  let doc;
  try {
    doc = await prisma.driveDocument.findUnique({
      where: { id: documentId },
    });
  } catch {
    return { ok: false, message: "Database unavailable. Try again shortly." };
  }
  if (!doc) return { ok: false, message: "Source document not found." };

  const suggested = extractSuggestedTasks(doc.aiReviewJson);
  const title = suggested[proposalIndex]?.trim();
  if (!title) {
    return {
      ok: false,
      message: "Proposal not found on this document's AI review.",
    };
  }

  // Dedupe: if the same (document, proposal index) already has a task,
  // return it instead of creating a second one. This makes the action
  // safely re-clickable.
  const existing = await prisma.task.findFirst({
    where: {
      sourceType: "document_proposal",
      sourceDocumentId: documentId,
      sourceProposalIndex: proposalIndex,
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, taskId: existing.id, alreadyExisted: true };
  }

  const created = await prisma.task.create({
    data: {
      title,
      description: `Drafted from AI review of "${doc.name}".`,
      status: "draft",
      priority: inferPriorityFromText(title),
      propertySlug: doc.linkedPropertySlug,
      category: doc.category,
      sourceType: "document_proposal",
      sourceDocumentId: documentId,
      sourceDocumentName: doc.name,
      sourceProposalIndex: proposalIndex,
    },
    select: { id: true },
  });

  revalidatePath("/documents");
  revalidatePath("/tasks");
  return { ok: true, taskId: created.id, alreadyExisted: false };
}

/**
 * Pull the `suggestedTasks` string array out of a persisted AI review
 * JSON value. Defensive: returns [] for any shape that isn't an object
 * with a `suggestedTasks` string array.
 */
function extractSuggestedTasks(reviewJson: unknown): string[] {
  if (!reviewJson || typeof reviewJson !== "object") return [];
  const v = (reviewJson as { suggestedTasks?: unknown }).suggestedTasks;
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim().length > 0) out.push(x);
  }
  return out;
}

// =============================================================
// Task update actions
//
// All four actions follow the same shape:
//   - validate the form input against an app-level allowlist
//   - prisma.task.update({ where: { id } })
//   - revalidatePath("/tasks") + "/documents" (proposals show source link)
//
// User-click only. No scheduler, no batch path, no provider call.
// =============================================================

export type UpdateTaskResult =
  | { ok: true; taskId: string }
  | { ok: false; message: string };

export type UpdateTaskState = UpdateTaskResult | null;

function readTaskId(formData: FormData): string | null {
  const raw = formData.get("taskId");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function commitTaskUpdate(
  taskId: string,
  data: Record<string, unknown>
): Promise<UpdateTaskResult> {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Update failed: ${error.message.slice(0, 200)}`
          : "Update failed.",
    };
  }
  revalidatePath("/tasks");
  revalidatePath("/documents");
  return { ok: true, taskId };
}

export async function updateTaskStatusAction(
  _prev: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskResult> {
  const taskId = readTaskId(formData);
  if (!taskId) return { ok: false, message: "Missing task id." };
  const statusRaw = formData.get("status");
  if (typeof statusRaw !== "string" || !isTaskStatus(statusRaw)) {
    return { ok: false, message: "Invalid status value." };
  }
  return commitTaskUpdate(taskId, { status: statusRaw });
}

export async function updateTaskPriorityAction(
  _prev: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskResult> {
  const taskId = readTaskId(formData);
  if (!taskId) return { ok: false, message: "Missing task id." };
  const priorityRaw = formData.get("priority");
  if (typeof priorityRaw !== "string" || !isTaskPriority(priorityRaw)) {
    return { ok: false, message: "Invalid priority value." };
  }
  return commitTaskUpdate(taskId, { priority: priorityRaw });
}

/**
 * Set or clear the due date. An empty value clears it; otherwise the
 * input must parse as a valid date. We accept either an ISO date string
 * (YYYY-MM-DD from <input type="date">) or any RFC-3339 timestamp.
 */
export async function updateTaskDueDateAction(
  _prev: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskResult> {
  const taskId = readTaskId(formData);
  if (!taskId) return { ok: false, message: "Missing task id." };
  const raw = formData.get("dueDate");
  if (typeof raw !== "string") {
    return { ok: false, message: "Invalid due date value." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return commitTaskUpdate(taskId, { dueDate: null });
  }
  // Treat plain YYYY-MM-DD as midnight UTC; parse anything else through
  // the Date constructor and validate it landed on a real instant.
  const candidate =
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? new Date(`${trimmed}T00:00:00.000Z`)
      : new Date(trimmed);
  if (Number.isNaN(candidate.getTime())) {
    return { ok: false, message: "Could not parse due date." };
  }
  return commitTaskUpdate(taskId, { dueDate: candidate });
}

export async function updateTaskDetailsAction(
  _prev: UpdateTaskState,
  formData: FormData
): Promise<UpdateTaskResult> {
  const taskId = readTaskId(formData);
  if (!taskId) return { ok: false, message: "Missing task id." };
  const titleRaw = formData.get("title");
  const descriptionRaw = formData.get("description");
  if (typeof titleRaw !== "string" || titleRaw.trim().length === 0) {
    return { ok: false, message: "Title cannot be empty." };
  }
  const title = titleRaw.trim().slice(0, 280);
  const description =
    typeof descriptionRaw === "string"
      ? descriptionRaw.trim().slice(0, 4000) || null
      : null;
  return commitTaskUpdate(taskId, { title, description });
}
