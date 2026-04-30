import { NextResponse } from "next/server";
import {
  getAllIntegrationStatuses,
  integrations,
  type IntegrationDefinition,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

export type IntegrationStatusResponse = {
  integrations: ReadonlyArray<
    Pick<IntegrationDefinition, "id" | "name" | "vendor" | "category" | "summary"> & {
      configured: boolean;
      missing: readonly string[];
      capabilities: readonly { label: string; description: string }[];
      docsUrl?: string;
    }
  >;
};

export async function GET(): Promise<NextResponse<IntegrationStatusResponse>> {
  const statuses = getAllIntegrationStatuses();
  const byId = new Map(statuses.map((status) => [status.id, status]));

  const payload: IntegrationStatusResponse = {
    integrations: integrations.map((integration) => {
      const status = byId.get(integration.id);
      return {
        id: integration.id,
        name: integration.name,
        vendor: integration.vendor,
        category: integration.category,
        summary: integration.summary,
        capabilities: integration.capabilities,
        docsUrl: integration.docsUrl,
        configured: status?.configured ?? false,
        missing: status?.missing ?? integration.envVars,
      };
    }),
  };

  return NextResponse.json(payload);
}
