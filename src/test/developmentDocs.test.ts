import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const doc = readFileSync("docs/ai-writing-platform-dev-doc.md", "utf8");

test("ai writing platform development document", async (t) => {
  await t.test("reflects the current delivery scope and page map", () => {
    assert.ok(doc.includes("当前交付状态"));
    assert.ok(doc.includes("/docs"));
    assert.ok(doc.includes("/projects"));
    assert.ok(doc.includes("/tasks"));
    assert.ok(doc.includes("/gate"));
    assert.ok(doc.includes("/failures"));
    assert.ok(doc.includes("/settings/models"));
  });

  await t.test("locks the eight-platform scope without adding the paused ten", () => {
    for (const platform of ["起点中文网", "番茄小说", "七猫", "晋江文学城", "知乎盐选", "WebNovel", "Royal Road", "Wattpad"]) {
      assert.ok(doc.includes(platform), `${platform} should be documented`);
    }

    assert.ok(doc.includes("8/8 核心平台已完成"));
    assert.ok(doc.includes("剩余 10 个平台不再添加"));
    assert.ok(doc.includes("扩展平台不再作为待补缺口"));
  });

  await t.test("documents the reserved model interfaces and PM gates", () => {
    for (const provider of ["Claude", "DeepSeek", "Kimi", "GPT"]) {
      assert.ok(doc.includes(provider), `${provider} should be documented`);
    }

    assert.ok(doc.includes("模型岗位"));
    assert.ok(doc.includes("毒舌 PM 闸门"));
    assert.ok(doc.includes("失败修复中心"));
    assert.ok(doc.includes("暂停批量"));
    assert.ok(doc.includes("样本"));
  });

  await t.test("documents the pipeline proof route and receipt template", () => {
    assert.ok(doc.includes("写作到投稿流水线验收路线"));
    assert.ok(doc.includes("流水线验收回执模板"));
    assert.ok(doc.includes("不跳过人工采用"));

    for (const step of ["开书与大树骨架", "首章样本生成", "任务与派单回执", "总闸门放大检查", "失败修复与恢复观察", "发布包与平台复盘"]) {
      assert.ok(doc.includes(step), `${step} should be documented`);
    }

    for (const outcome of ["通过", "退回修复", "暂停批量"]) {
      assert.ok(doc.includes(outcome), `${outcome} should be documented`);
    }
  });
});
