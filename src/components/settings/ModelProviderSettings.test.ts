import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProviderApiKeyClearRequest,
  getUnhandledProviderDeepLink,
  getProviderWizardCardAction,
  performProviderConfigurationHandoff,
  scheduleProviderConfigurationHandoff,
} from "./ModelProviderSettings";

test("credential clear requests preserve provider settings and send an explicit empty key", () => {
  assert.deepEqual(buildProviderApiKeyClearRequest({
    id: "provider-1",
    providerId: "gemini",
    displayName: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    hasApiKey: true,
    defaultModel: "gemini-2.5-flash",
    enabled: true,
    maxContextTokens: 1048576,
  }), {
    id: "provider-1",
    providerId: "gemini",
    displayName: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: "",
    defaultModel: "gemini-2.5-flash",
    enabled: true,
    maxContextTokens: 1048576,
  });
});

type HandoffTarget = {
  focus: () => void;
};

type HandoffForm = {
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
};

function handoffRefs(form: HandoffForm, apiKeyInput: HandoffTarget, firstEditableField: HandoffTarget) {
  return {
    form: { current: form },
    apiKeyInput: { current: apiKeyInput },
    firstEditableField: { current: firstEditableField },
  };
}

test("defers provider configuration handoff and focuses the API key for providers that require one", () => {
  let frameCallback: FrameRequestCallback | undefined;
  let scrollOptions: ScrollIntoViewOptions | undefined;
  let apiKeyFocusCount = 0;
  let fallbackFocusCount = 0;
  const refs = handoffRefs(
    { scrollIntoView: (options) => { scrollOptions = options; } },
    { focus: () => { apiKeyFocusCount += 1; } },
    { focus: () => { fallbackFocusCount += 1; } },
  );

  scheduleProviderConfigurationHandoff(true, refs, (callback) => {
    frameCallback = callback;
    return 1;
  });

  assert.equal(scrollOptions, undefined);
  assert.equal(apiKeyFocusCount, 0);
  assert.equal(fallbackFocusCount, 0);
  frameCallback?.(0);
  assert.deepEqual(scrollOptions, { behavior: "smooth", block: "start" });
  assert.equal(apiKeyFocusCount, 1);
  assert.equal(fallbackFocusCount, 0);
});

test("focuses the first editable field when a selected provider does not require an API key", () => {
  let apiKeyFocusCount = 0;
  let fallbackFocusCount = 0;
  const refs = handoffRefs(
    { scrollIntoView: () => undefined },
    { focus: () => { apiKeyFocusCount += 1; } },
    { focus: () => { fallbackFocusCount += 1; } },
  );

  scheduleProviderConfigurationHandoff(false, refs, (callback) => {
    callback(0);
    return 1;
  });

  assert.equal(apiKeyFocusCount, 0);
  assert.equal(fallbackFocusCount, 1);
});

test("hands off an initial deep link even when its provider is already selected, then marks it handled", () => {
  const providerId = getUnhandledProviderDeepLink(
    "deepseek",
    null,
    (candidate): candidate is "deepseek" => candidate === "deepseek",
  );
  let selectCount = 0;
  let handoffCount = 0;

  assert.equal(providerId, "deepseek");
  performProviderConfigurationHandoff({
    providerId: providerId!,
    selectedProviderId: "deepseek",
    selectProvider: () => { selectCount += 1; },
    scheduleConfigurationHandoff: () => { handoffCount += 1; },
  });

  assert.equal(selectCount, 0);
  assert.equal(handoffCount, 1);
  assert.equal(
    getUnhandledProviderDeepLink(
      "deepseek",
      providerId,
      (candidate): candidate is "deepseek" => candidate === "deepseek",
    ),
    null,
  );
});

test("keeps an already-selected ready wizard card actionable and hands it off", () => {
  const action = getProviderWizardCardAction("ready", "查看配置");
  let selectCount = 0;
  let handoffCount = 0;

  assert.deepEqual(action, { label: "查看配置", disabled: false });
  performProviderConfigurationHandoff({
    providerId: "deepseek",
    selectedProviderId: "deepseek",
    selectProvider: () => { selectCount += 1; },
    scheduleConfigurationHandoff: () => { handoffCount += 1; },
  });

  assert.equal(selectCount, 0);
  assert.equal(handoffCount, 1);
});
