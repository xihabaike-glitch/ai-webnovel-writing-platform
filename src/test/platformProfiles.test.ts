import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile, platformProfiles } from "../lib/platforms/platformProfiles.ts";

describe("platformProfiles", () => {
  it("contains the eight MVP platforms", () => {
    assert.deepEqual(
      platformProfiles.map((profile) => profile.id).sort(),
      ["fanqie", "jjwxc", "qidian", "qimao", "royal_road", "wattpad", "webnovel", "zhihu_yanxuan"],
    );
  });

  it("returns qidian as a long-form paid platform profile", () => {
    const profile = getPlatformProfile("qidian");
    assert.equal(profile.name, "起点中文网");
    assert.equal(profile.defaultLengthType, "long_300k_plus");
    assert.equal(profile.reviewFocus.includes("卷结构"), true);
  });
});

