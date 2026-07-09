import "server-only";

import { prisma } from "../db/prisma.ts";
import {
  loadModelProviderById as loadModelProviderByIdFromDatabase,
  loadModelProviders as loadModelProvidersFromDatabase,
  type ProviderStoreDatabase,
} from "./providerStore.ts";

const database = prisma as unknown as ProviderStoreDatabase;

export function loadModelProviders() {
  return loadModelProvidersFromDatabase(database);
}

export function loadModelProviderById(id: string) {
  return loadModelProviderByIdFromDatabase(id, database);
}
