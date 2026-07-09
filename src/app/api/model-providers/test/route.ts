import { NextResponse } from "next/server";
import {
  CREDENTIAL_CONFIGURATION_API_ERROR,
  CredentialCryptoError,
  encryptApiKey,
} from "@/lib/model-gateway/credentialCrypto";
import {
  canReuseStoredProviderCredential,
  CREDENTIAL_REENTRY_API_ERROR,
  providerRequiresApiKey,
} from "@/lib/model-gateway/providerCredentialSecurity";
import { testModelProviderConnection } from "@/lib/model-gateway/providerConnection";
import { loadModelProviderById } from "@/lib/model-gateway/providerStore";
import { testModelProviderSchema } from "@/lib/validators/modelProvider";

export async function POST(request: Request) {
  try {
    const input = testModelProviderSchema.parse(await request.json());
    const existing = input.id
      ? await loadModelProviderById(input.id)
      : null;
    const baseUrl = input.baseUrl?.trim()
      || (existing?.providerId === input.providerId ? existing.baseUrl : null)
      || null;
    const wouldReuseStoredCredential = Boolean(
      existing?.encryptedApiKey
      && input.apiKey === undefined
      && providerRequiresApiKey(input.providerId),
    );
    if (wouldReuseStoredCredential && existing && !canReuseStoredProviderCredential(existing, {
      providerId: input.providerId,
      baseUrl,
    })) {
      return NextResponse.json(CREDENTIAL_REENTRY_API_ERROR, { status: 400 });
    }

    const provider = {
      providerId: input.providerId,
      baseUrl,
      encryptedApiKey: !providerRequiresApiKey(input.providerId)
        ? null
        : input.apiKey === undefined
          ? existing?.encryptedApiKey || null
          : input.apiKey
            ? await encryptApiKey(input.apiKey)
            : null,
      defaultModel: input.defaultModel.trim() || existing?.defaultModel || "",
    };

    const result = await testModelProviderConnection(provider);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof CredentialCryptoError && error.code === "credential_secret_invalid") {
      return NextResponse.json(CREDENTIAL_CONFIGURATION_API_ERROR, { status: 503 });
    }
    throw error;
  }
}
