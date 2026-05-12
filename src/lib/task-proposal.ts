/**
 * Pure helpers for AI document task proposals. Used by both the server
 * action that persists a proposal as a real Task and the page render
 * that builds the proposal cards, so the priority/category derivation
 * is identical in both places.
 */

export const TASK_STATUS_VALUES = [
  "draft",
  "blocked",
  "needs_decision",
  "ready",
  "in_progress",
  "waiting_on_vendor",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUS_VALUES as readonly string[]).includes(value);
}

export const TASK_PRIORITY_VALUES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITY_VALUES as readonly string[]).includes(value);
}

const URGENT_KEYWORDS = ["urgent", "asap", "immediately", "critical"];
const HIGH_KEYWORDS = ["deadline", "expir", "overdue", "due now"];

/**
 * Cheap keyword-based priority heuristic. Used so the persisted Task
 * and the UI proposal card show the same priority pill without round-
 * tripping through a model call. Falls back to "medium".
 */
export function inferPriorityFromText(text: string): TaskPriority {
  const lower = text.toLowerCase();
  for (const k of URGENT_KEYWORDS) {
    if (lower.includes(k)) return "urgent";
  }
  for (const k of HIGH_KEYWORDS) {
    if (lower.includes(k)) return "high";
  }
  return "medium";
}
