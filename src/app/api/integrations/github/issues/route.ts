import { NextResponse } from "next/server";
import { adapters } from "@/lib/integration-adapters";
import { handleAdapterError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues = await adapters.githubListIssues();
    return NextResponse.json({ issues });
  } catch (error) {
    return handleAdapterError(error);
  }
}
