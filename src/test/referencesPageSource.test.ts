import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/references/page.tsx", "utf8");

test("references page shows invalid category feedback", () => {
  assert.ok(source.includes("view.invalidCategoryNotice"));
  assert.ok(source.includes("查看全部案例"));
  assert.ok(source.includes("href=\"/references\""));
});

test("references page exposes a development path anchor for requirement evidence", () => {
  assert.ok(source.includes("id=\"development-path\""));
  assert.ok(source.includes("毒舌 PM 开发路径"));
});
