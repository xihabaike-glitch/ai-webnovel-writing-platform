import type { ModelProvider } from "@prisma/client";
import { CredentialCryptoError, migrateStoredApiKey } from "./credentialCrypto.ts";

export interface ProviderStoreDatabase {
  modelProvider: {
    findMany(args: { orderBy: { updatedAt: "desc" } }): Promise<ModelProvider[]>;
    findUnique(args: { where: { id: string } }): Promise<ModelProvider | null>;
    updateMany(args: {
      where: { id: string; encryptedApiKey: string };
      data: { encryptedApiKey: string };
    }): Promise<{ count: number }>;
  };
}

async function migrateProviderCredential(
  provider: ModelProvider,
  database: ProviderStoreDatabase,
): Promise<ModelProvider | null> {
  const originalEncryptedApiKey = provider.encryptedApiKey;
  if (!originalEncryptedApiKey) return provider;

  try {
    const migration = await migrateStoredApiKey(originalEncryptedApiKey);
    if (!migration.migrated) return provider;

    const updated = await database.modelProvider.updateMany({
      where: {
        id: provider.id,
        encryptedApiKey: originalEncryptedApiKey,
      },
      data: { encryptedApiKey: migration.value },
    });
    if (updated.count === 1) {
      return { ...provider, encryptedApiKey: migration.value };
    }

    return database.modelProvider.findUnique({ where: { id: provider.id } });
  } catch (error) {
    if (error instanceof CredentialCryptoError) return provider;
    throw error;
  }
}

export async function loadModelProviders(database: ProviderStoreDatabase) {
  const providers = await database.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const migrated = await Promise.all(providers.map((provider) => migrateProviderCredential(provider, database)));
  return migrated.filter((provider): provider is ModelProvider => provider !== null);
}

export async function loadModelProviderById(
  id: string,
  database: ProviderStoreDatabase,
) {
  const provider = await database.modelProvider.findUnique({ where: { id } });
  return provider ? migrateProviderCredential(provider, database) : null;
}
