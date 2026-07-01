import test from "node:test";
import assert from "node:assert/strict";
import { buildDefaultOutlineNodes } from "../lib/outlines/defaultOutline.ts";
import { getPlatformProfile } from "../lib/platforms/platformProfiles.ts";

test("buildDefaultOutlineNodes", async (t) => {
  await t.test("creates the tree-writing structure with opening, ending, trunk, branches, leaves, and soil", () => {
    const nodes = buildDefaultOutlineNodes({
      projectId: "demo-project",
      title: "示例作品",
      genre: "都市系统",
      sellingPoint: "雨夜系统翻盘",
      platform: getPlatformProfile("fanqie"),
    });

    const types = new Set(nodes.map((node) => node.type));
    assert.deepEqual(
      [...types].sort(),
      ["branch", "ending", "leaf", "opening", "root", "soil", "trunk"].sort(),
    );
    assert.equal(nodes.filter((node) => node.parentId === null).length, 1);
    assert.ok(nodes.find((node) => node.type === "opening")?.summary.includes("300"));
    assert.ok(nodes.find((node) => node.type === "ending")?.title.includes("终局"));
    assert.ok(nodes.find((node) => node.type === "soil")?.platformNote.includes("番茄"));
  });
});
