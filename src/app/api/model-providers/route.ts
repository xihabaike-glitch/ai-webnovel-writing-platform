import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { providerOptions } from "@/lib/model-gateway/providerDefaults";
import { saveModelProviderSchema } from "@/lib/validators/modelProvider";

function maskProvider(provider: {
  id: string;
  providerId: string;
  displayName: string;
  baseUrl: string | null;
  encryptedApiKey: string | null;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens: number | null;
  updatedAt: Date;
}) {
  return {
    id: provider.id,
    providerId: provider.providerId,
    displayName: provider.displayName,
    baseUrl: provider.baseUrl,
    hasApiKey: Boolean(provider.encryptedApiKey),
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    maxContextTokens: provider.maxContextTokens,
    updatedAt: provider.updatedAt,
  };
}

export async function GET() {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ providers: providers.map(maskProvider), providerOptions });
}

export async function POST(request: Request) {
  const input = saveModelProviderSchema.parse(await request.json());
  const data = {
    providerId: input.providerId,
    displayName: input.displayName,
    baseUrl: input.baseUrl || null,
    defaultModel: input.defaultModel,
    enabled: input.enabled ?? true,
    maxContextTokens: input.maxContextTokens,
    ...(input.apiKey === undefined ? {} : { encryptedApiKey: input.apiKey || null }),
  };

  const provider = input.id
    ? await prisma.modelProvider.update({
      where: { id: input.id },
      data,
    })
    : await prisma.modelProvider.create({ data });

  return NextResponse.json({ provider: maskProvider(provider) }, { status: input.id ? 200 : 201 });
}
