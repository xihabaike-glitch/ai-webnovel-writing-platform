import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/settings/ModelProviderSettings.tsx", "utf8");

test("model settings shows invalid focus feedback", () => {
  assert.ok(source.includes("invalidFocusNotice"));
  assert.ok(source.includes("focusParam ? `模型设置焦点「${focusParam}」不存在，已显示全部模型设置。` : null"));
  assert.ok(source.includes("焦点已回退"));
  assert.ok(source.includes("查看模型设置"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/settings/models\", gateReturnHref)}"));
});
