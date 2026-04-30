import { NextResponse, type NextRequest } from "next/server";
import { adapters } from "@/lib/integration-adapters";
import { handleAdapterError, jsonError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim() === "") {
    return jsonError(400, "Query parameter 'q' is required");
  }
  try {
    const result = await adapters.notionSearch(query);
    return NextResponse.json(result);
  } catch (error) {
    return handleAdapterError(error);
  }
}
