import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockAdapter } from "../lib/model-gateway/mockAdapter.ts";

describe("MockAdapter", () => {
  it("returns parseable chapter review JSON", async () => {
    const result = await new MockAdapter().generate({
      providerId: "mock",
      model: "mock-editor",
      systemPrompt: "review",
      userPrompt: "chapter",
    });

    const parsed = JSON.parse(result.text);
    assert.equal(typeof parsed.score, "number");
    assert.equal(Array.isArray(parsed.issues), true);
    assert.equal(result.usage?.costUsd, 0);
  });
});

