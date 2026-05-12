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
import { inferPriorityFromText } from "@/lib/task-proposal";

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
