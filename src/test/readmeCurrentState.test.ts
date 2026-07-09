import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readme = readFileSync("README.md", "utf8");

test("README reflects the current runnable quality gate delivery state", () => {
  assert.ok(readme.includes("可运行的网页产品骨架"));
  assert.equal(readme.includes("当前阶段以产品与技术文档为主"), false);

  for (const route of ["/", "/docs", "/projects", "/tasks", "/dispatch", "/gate", "/failures", "/references", "/settings/models"]) {
    assert.ok(readme.includes(route), `${route} should be documented in the README`);
  }

  assert.ok(readme.includes("8/8 核心平台已完成"));
  assert.ok(readme.includes("剩余 10 个平台不再添加"));
  assert.ok(readme.includes("Claude / DeepSeek / Kimi / GPT"));
  assert.equal(readme.includes("预留 Claude / DeepSeek / Kimi / GPT"), false);
  assert.ok(readme.includes("模型岗位矩阵"));
  assert.ok(readme.includes("职责路由"));
  assert.ok(readme.includes("推荐批次缺岗硬拦截"));
  assert.ok(readme.includes("验收真实流水线"));
  assert.ok(readme.includes("端到端可见验收口径地图"));
  for (const criterion of ["任务回执验收口径", "派单回执验收口径", "失败修复回执验收口径", "发布包与平台复盘验收口径"]) {
    assert.ok(readme.includes(criterion), `${criterion} should be documented in the README`);
  }
  assert.ok(readme.includes("npm install"));
  assert.ok(readme.includes("npm run dev"));
  assert.ok(readme.includes("npm test"));
  assert.ok(readme.includes("npm run build"));
});
