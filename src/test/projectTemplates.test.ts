import test from "node:test";
import assert from "node:assert/strict";
import { platformProfiles } from "../lib/platforms/platformProfiles.ts";
import {
  buildTemplateChapterSeeds,
  buildTemplateCharacterSeed,
  buildTemplateWorldEntrySeeds,
  getDefaultTemplateForPlatform,
  getProjectTemplate,
  projectTemplates,
} from "../lib/projects/projectTemplates.ts";

test("projectTemplates", async (t) => {
  await t.test("cover every MVP platform", () => {
    for (const platform of platformProfiles) {
      const template = getDefaultTemplateForPlatform(platform.id);
      assert.equal(template.platformId, platform.id);
    }
  });

  await t.test("generate a one-click project skeleton", () => {
    const template = getProjectTemplate("fanqie_system_reversal");
    const chapters = buildTemplateChapterSeeds(template);
    const character = buildTemplateCharacterSeed(template);
    const worldEntries = buildTemplateWorldEntrySeeds(template);

    assert.equal(chapters.length, 3);
    assert.deepEqual(chapters.map((chapter) => chapter.order), [1, 2, 3]);
    assert.ok(chapters[0].hook.includes("倒计时"));
    assert.equal(chapters.every((chapter) => chapter.status === "outline"), true);
    assert.equal(character.role, "主角");
    assert.ok(character.arcEnd.includes("主动"));
    assert.ok(worldEntries.some((entry) => entry.type === "platform_soil"));
    assert.ok(worldEntries.every((entry) => entry.content.includes("平台参考")));
  });

  await t.test("keeps overseas templates in English-oriented genres", () => {
    const overseas = projectTemplates.filter((template) => (
      template.platformId === "webnovel" || template.platformId === "royal_road" || template.platformId === "wattpad"
    ));

    assert.equal(overseas.length, 3);
    assert.ok(overseas.some((template) => template.genre.includes("LitRPG")));
    assert.ok(overseas.some((template) => template.firstThree[0].title.startsWith("Chapter")));
  });
});
