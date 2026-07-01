import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProjectDefaults } from "../lib/projects/projectDefaults.ts";

describe("buildProjectDefaults", () => {
  it("uses the platform default length when no length is provided", () => {
    const defaults = buildProjectDefaults({ platformId: "zhihu_yanxuan" });

    assert.equal(defaults.targetLengthType, "short_10k");
    assert.equal(defaults.targetWordCount, 10000);
  });

  it("maps long and mega length types to concrete target word counts", () => {
    assert.equal(buildProjectDefaults({ platformId: "qidian", lengthType: "long_300k_plus" }).targetWordCount, 300000);
    assert.equal(buildProjectDefaults({ platformId: "qidian", lengthType: "mega_1m_plus" }).targetWordCount, 1000000);
  });
});

