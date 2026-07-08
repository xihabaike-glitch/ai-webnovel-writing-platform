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

test("model settings treats model role matrix focus as a repair entry", () => {
  assert.ok(source.includes("const isModelRoleMatrixFocus = focusParam === \"model-role-matrix\";"));
  assert.ok(source.includes("focusParam === \"model-role-matrix\""));
  assert.ok(source.includes("模型岗位修复入口"));
  assert.ok(source.includes("推荐批次被拦住时，先在这里补齐 Claude、DeepSeek、Kimi、GPT 的写作岗位"));
  assert.ok(source.includes("href={hrefWithGateReturn(\"/settings/models#model-role-matrix\", gateReturnHref)}"));
});
