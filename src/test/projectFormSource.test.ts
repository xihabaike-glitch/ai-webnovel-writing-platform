import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/projects/ProjectForm.tsx", "utf8");
const projectsPageSource = readFileSync("src/app/projects/page.tsx", "utf8");

test("project form labels final delivery archive launches", () => {
  assert.ok(projectsPageSource.includes("startSource"));
  assert.ok(source.includes("final-delivery-archive"));
  assert.ok(source.includes("最终交付归档打法"));
  assert.ok(source.includes("这条归档会影响推荐平台、模板、首章动作和停手线"));
});
