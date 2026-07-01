export interface SelectableProvider {
  providerId: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface RouteProviderChoice<TProvider> {
  primaryProvider?: TProvider | null;
  fallbackProvider?: TProvider | null;
}

export function canUseProvider(provider: SelectableProvider) {
  if (!provider.enabled) return false;
  if (provider.providerId === "mock") return true;
  if (provider.providerId === "ollama") return true;
  return Boolean(provider.encryptedApiKey);
}

function pickDefaultProvider<TProvider extends SelectableProvider>(providers: TProvider[]) {
  return providers.find((item) => item.providerId !== "mock" && canUseProvider(item))
    ?? providers.find((item) => item.providerId === "mock" && canUseProvider(item));
}

export function selectModelProviderForTask<TProvider extends SelectableProvider>(
  providers: TProvider[],
  route?: RouteProviderChoice<TProvider> | null,
) {
  if (route?.primaryProvider && canUseProvider(route.primaryProvider)) return route.primaryProvider;
  if (route?.fallbackProvider && canUseProvider(route.fallbackProvider)) return route.fallbackProvider;
  return pickDefaultProvider(providers);
}
