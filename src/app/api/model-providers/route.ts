import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  CREDENTIAL_CONFIGURATION_API_ERROR,
  CredentialCryptoError,
  encryptApiKey,
} from "@/lib/model-gateway/credentialCrypto";
import {
  CREDENTIAL_REUSE_CONFLICT_API_ERROR,
  canReuseStoredProviderCredential,
  CREDENTIAL_REENTRY_API_ERROR,
  providerRequiresApiKey,
} from "@/lib/model-gateway/providerCredentialSecurity";
import { providerOptions } from "@/lib/model-gateway/providerDefaults";
import { loadModelProviderById, loadModelProviders } from "@/lib/model-gateway/providerStore.server";
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
  const providers = await loadModelProviders();
  return NextResponse.json({ providers: providers.map(maskProvider), providerOptions });
}

export async function POST(request: Request) {
  try {
    const input = saveModelProviderSchema.parse(await request.json());
    const existing = input.id ? await loadModelProviderById(input.id) : null;
    const wouldReuseStoredCredential = Boolean(
      existing?.encryptedApiKey
      && input.apiKey === undefined
      && providerRequiresApiKey(input.providerId),
    );
    if (wouldReuseStoredCredential && existing && !canReuseStoredProviderCredential(existing, input)) {
      return NextResponse.json(CREDENTIAL_REENTRY_API_ERROR, { status: 400 });
    }

    const credentialData = !providerRequiresApiKey(input.providerId)
      ? { encryptedApiKey: null }
      : input.apiKey === undefined
        ? {}
        : { encryptedApiKey: input.apiKey ? await encryptApiKey(input.apiKey) : null };
    const data = {
      providerId: input.providerId,
      displayName: input.displayName,
      baseUrl: input.baseUrl || null,
      defaultModel: input.defaultModel,
      enabled: input.enabled ?? true,
      maxContextTokens: input.maxContextTokens,
      ...credentialData,
    };

    if (input.id && wouldReuseStoredCredential && existing) {
      const updated = await prisma.modelProvider.updateMany({
        where: {
          id: existing.id,
          providerId: existing.providerId,
          baseUrl: existing.baseUrl,
          encryptedApiKey: existing.encryptedApiKey,
        },
        data,
      });
      if (updated.count !== 1) {
        return NextResponse.json(CREDENTIAL_REUSE_CONFLICT_API_ERROR, { status: 409 });
      }

      const provider = await prisma.modelProvider.findUnique({ where: { id: existing.id } });
      if (!provider) {
        return NextResponse.json(CREDENTIAL_REUSE_CONFLICT_API_ERROR, { status: 409 });
      }
      return NextResponse.json({ provider: maskProvider(provider) });
    }

    const provider = input.id
      ? await prisma.modelProvider.update({
        where: { id: input.id },
        data,
      })
      : await prisma.modelProvider.create({ data });

    return NextResponse.json({ provider: maskProvider(provider) }, { status: input.id ? 200 : 201 });
  } catch (error) {
    if (error instanceof CredentialCryptoError && error.code === "credential_secret_invalid") {
      return NextResponse.json(CREDENTIAL_CONFIGURATION_API_ERROR, { status: 503 });
    }
    throw error;
  }
}
