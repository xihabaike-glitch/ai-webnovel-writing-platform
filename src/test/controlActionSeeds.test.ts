import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";
import {
  buildCharacterActionSeeds,
  buildOutlineActionSeeds,
  buildStoryLineActionSeeds,
  buildWorldActionSeeds,
} from "../lib/projects/controlActionSeeds.ts";

const project = {
  id: "demo-project",
  title: "夜雨系统",
  genre: "都市系统",
  sellingPoint: "雨夜危机中觉醒系统，主角用选择翻盘。",
};

test("control action seeds", async (t) => {
  await t.test("creates editable character support cards", () => {
    const seeds = buildCharacterActionSeeds(project, []);

    assert.equal(seeds.length, 3);
    assert.ok(seeds.some((seed) => seed.role === "主角"));
    assert.ok(seeds.some((seed) => seed.role === "反派"));
    assert.ok(seeds.every((seed) => seed.arcStart && seed.arcEnd));
  });

  await t.test("fills required world bible types only when missing", () => {
    const seeds = buildWorldActionSeeds(project, getPlatformProfile("fanqie"), [
      { type: "system_rule", title: "已有规则", content: "已有规则内容。" },
    ]);

    assert.deepEqual(seeds.map((seed) => seed.type).sort(), ["platform_soil", "taboo"]);
    assert.ok(seeds.find((seed) => seed.type === "platform_soil")?.content.includes("番茄"));
  });

  await t.test("creates main thread and opening foreshadow seeds", () => {
    const seeds = buildStoryLineActionSeeds(
      project,
      [{ id: "chapter-1", order: 1, title: "第一章" }],
      [{ id: "character-1" }],
      [],
      [],
    );

    assert.equal(seeds.plotThreads.length, 1);
    assert.equal(seeds.plotThreads[0].type, "main");
    assert.equal(seeds.plotThreads[0].startChapterId, "chapter-1");
    assert.equal(seeds.foreshadows.length, 1);
    assert.deepEqual(seeds.foreshadows[0].relatedCharacterIds, ["character-1"]);
  });

  await t.test("creates missing tree-writing outline nodes without replacing existing root", () => {
    const seeds = buildOutlineActionSeeds(project, getPlatformProfile("fanqie"), [
      { id: "existing-root", type: "root", title: "已有总纲" },
    ]);
    const types = new Set(seeds.map((seed) => seed.type));

    assert.equal(types.has("root"), false);
    assert.ok(types.has("opening"));
    assert.ok(types.has("ending"));
    assert.ok(types.has("trunk"));
    assert.ok(types.has("soil"));
    assert.equal(seeds.filter((seed) => seed.type === "branch").length, 3);
    assert.equal(seeds.filter((seed) => seed.type === "leaf").length, 2);
    assert.equal(seeds.find((seed) => seed.type === "opening")?.parentId, "existing-root");
  });
});
