import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { testModelProviderConnection } from "@/lib/model-gateway/providerConnection";
import { testModelProviderSchema } from "@/lib/validators/modelProvider";

export async function POST(request: Request) {
  const input = testModelProviderSchema.parse(await request.json());
  const existing = input.id
    ? await prisma.modelProvider.findUnique({ where: { id: input.id } })
    : null;

  const provider = {
    providerId: input.providerId,
    baseUrl: input.baseUrl?.trim() || existing?.baseUrl || null,
    encryptedApiKey: input.apiKey?.trim() || existing?.encryptedApiKey || null,
    defaultModel: input.defaultModel.trim() || existing?.defaultModel || "",
  };

  const result = await testModelProviderConnection(provider);
  return NextResponse.json({ result });
}
