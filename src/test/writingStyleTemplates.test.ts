import test from "node:test";
import assert from "node:assert/strict";
import { platformProfiles } from "../lib/platforms/platformProfiles.ts";
import {
  buildPlatformWritingStylePromptBlock,
  getPlatformWritingStyle,
  platformWritingStyleTemplates,
} from "../lib/platforms/writingStyleTemplates.ts";

test("platformWritingStyleTemplates", async (t) => {
  await t.test("cover every MVP platform with executable style fields", () => {
    assert.equal(platformWritingStyleTemplates.length, platformProfiles.length);

    for (const platform of platformProfiles) {
      const style = getPlatformWritingStyle(platform.id);

      assert.equal(style.platformId, platform.id);
      assert.ok(style.audiencePromise.length > 10);
      assert.ok(style.openingHook.length > 10);
      assert.ok(style.chapterRhythm.length > 10);
      assert.ok(style.endingBeat.length > 10);
      assert.ok(style.mustHave.length >= 4);
      assert.ok(style.avoid.length >= 3);
      assert.ok(style.promptDirectives.length >= 2);
    }
  });

  await t.test("builds a prompt-ready block for domestic fast-read platforms", () => {
    const block = buildPlatformWritingStylePromptBlock("fanqie");

    assert.ok(block.includes("平台风格模板"));
    assert.ok(block.includes("强钩子"));
    assert.ok(block.includes("每 300-500 字"));
    assert.ok(block.includes("第一段必须进入事件现场"));
  });

  await t.test("keeps overseas platform guidance English-serial friendly", () => {
    const webnovel = buildPlatformWritingStylePromptBlock("webnovel");
    const royalRoad = buildPlatformWritingStylePromptBlock("royal_road");

    assert.ok(webnovel.includes("clear power fantasy"));
    assert.ok(webnovel.includes("avoid stiff direct translation"));
    assert.ok(royalRoad.includes("earned progression"));
    assert.ok(royalRoad.includes("system limits"));
  });
});
