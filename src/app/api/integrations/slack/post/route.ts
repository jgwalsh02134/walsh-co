import { NextResponse, type NextRequest } from "next/server";
import { adapters } from "@/lib/integration-adapters";
import { handleAdapterError, jsonError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body must be valid JSON");
  }
  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || text.trim() === "") {
    return jsonError(400, "Field 'text' is required");
  }
  const channelId = (body as { channelId?: unknown })?.channelId;
  try {
    const result = await adapters.slackPostMessage({
      text,
      channelId: typeof channelId === "string" ? channelId : undefined,
    });
    if (!result.ok) {
      return jsonError(502, "Slack rejected the message", { slack: result });
    }
    return NextResponse.json({ ok: true, ts: result.ts });
  } catch (error) {
    return handleAdapterError(error);
  }
}
