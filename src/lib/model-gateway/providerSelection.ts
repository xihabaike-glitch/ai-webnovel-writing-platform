export interface SelectableProvider {
  providerId: string;
  enabled: boolean;
  encryptedApiKey: string | null;
}

export interface RouteProviderChoice<TProvider> {
  primaryProvider?: TProvider | null;
  fallbackProvider?: TProvider | null;
}

export type ProviderCandidateRole = "primary" | "fallback" | "auto" | "forced";

export interface ProviderCandidate<TProvider> {
  provider: TProvider;
  role: ProviderCandidateRole;
}

export interface ForcedProviderTarget {
  providerConfigId?: string | null;
  providerId?: string | null;
  model?: string | null;
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

function pushCandidate<TProvider extends SelectableProvider & { id?: string }>(
  candidates: ProviderCandidate<TProvider>[],
  provider: TProvider | undefined | null,
  role: ProviderCandidate<TProvider>["role"],
) {
  if (!provider || !canUseProvider(provider)) return;
  const duplicated = candidates.some((candidate) => {
    if (provider.id && candidate.provider.id) return candidate.provider.id === provider.id;
    return candidate.provider === provider;
  });
  if (!duplicated) candidates.push({ provider, role });
}

export function selectModelProviderCandidatesForTask<TProvider extends SelectableProvider & { id?: string }>(
  providers: TProvider[],
  route?: RouteProviderChoice<TProvider> | null,
): ProviderCandidate<TProvider>[] {
  const candidates: ProviderCandidate<TProvider>[] = [];

  pushCandidate(candidates, route?.primaryProvider, "primary");
  pushCandidate(candidates, route?.fallbackProvider, "fallback");
  pushCandidate(candidates, pickDefaultProvider(providers), "auto");

  return candidates;
}

function sameText(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function selectForcedModelProviderCandidate<TProvider extends SelectableProvider & { id?: string; defaultModel?: string | null }>(
  providers: TProvider[],
  target: ForcedProviderTarget,
): ProviderCandidate<TProvider> | null {
  const hasTarget = Boolean(target.providerConfigId || target.providerId || target.model);
  if (!hasTarget) return null;

  const provider = providers.find((candidate) => {
    if (!canUseProvider(candidate)) return false;
    if (target.providerConfigId && !sameText(target.providerConfigId, candidate.id)) return false;
    if (target.providerId && !sameText(target.providerId, candidate.providerId)) return false;
    if (target.model && !sameText(target.model, candidate.defaultModel)) return false;
    return true;
  });

  return provider ? { provider, role: "forced" } : null;
}
