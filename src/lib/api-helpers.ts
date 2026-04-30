import { NextResponse } from "next/server";
import { IntegrationNotConfiguredError } from "./integration-adapters";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleAdapterError(error: unknown): NextResponse {
  if (error instanceof IntegrationNotConfiguredError) {
    return jsonError(501, "Integration not configured", {
      integration: error.id,
      missing: error.missing,
    });
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return jsonError(502, "Upstream integration error", { message });
}
