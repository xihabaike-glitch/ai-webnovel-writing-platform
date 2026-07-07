import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformDeliveryScope, platformProfiles } from "../lib/platforms/platformProfiles.ts";

describe("platformProfiles", () => {
  it("contains the eight MVP platforms", () => {
    assert.deepEqual(
      platformProfiles.map((profile) => profile.id).sort(),
      ["fanqie", "jjwxc", "qidian", "qimao", "royal_road", "wattpad", "webnovel", "zhihu_yanxuan"],
    );
  });

  it("publishes a locked eight-platform delivery scope", () => {
    assert.deepEqual(platformDeliveryScope.corePlatformIds, platformProfiles.map((profile) => profile.id));
    assert.equal(platformDeliveryScope.corePlatformCount, 8);
    assert.equal(platformDeliveryScope.completedPlatformCount, 8);
    assert.equal(platformDeliveryScope.pausedExpansionCount, 10);
    assert.equal(platformDeliveryScope.statusLabel, "8/8 核心平台已完成");
    assert.equal(platformDeliveryScope.expansionLabel, "剩余 10 个平台不再添加");
    assert.ok(platformDeliveryScope.scopeDecision.includes("不进入当前开发范围"));
  });

  it("returns qidian as a long-form paid platform profile", () => {
    const profile = getPlatformProfile("qidian");
    assert.equal(profile.name, "起点中文网");
    assert.equal(profile.defaultLengthType, "long_300k_plus");
    assert.equal(profile.reviewFocus.includes("卷结构"), true);
  });
});
