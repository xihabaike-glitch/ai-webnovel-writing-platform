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
    assert.ok(doc.includes("模型岗位矩阵"));
    assert.ok(doc.includes("职责路由"));
    assert.ok(doc.includes("推荐批次缺岗硬拦截"));
    assert.ok(doc.includes("focus=model-role-matrix"));
    assert.equal(doc.includes("模型设置。预留 Claude、DeepSeek、Kimi、GPT"), false);
    assert.ok(doc.includes("毒舌 PM 闸门"));
    assert.ok(doc.includes("失败修复中心"));
    assert.ok(doc.includes("暂停批量"));
    assert.ok(doc.includes("样本"));
  });

  await t.test("documents the pipeline proof route and receipt template", () => {
    assert.ok(doc.includes("写作到投稿流水线验收路线"));
    assert.ok(doc.includes("流水线验收回执模板"));
    assert.ok(doc.includes("真实作品流水线终检清单"));
    assert.ok(doc.includes("查看真实样本回执复检"));
    assert.ok(doc.includes("真实作品样本运行手册"));
    assert.ok(doc.includes("不跳过人工采用"));

    for (const step of ["开书与大树骨架", "首章样本生成", "任务与派单回执", "总闸门放大检查", "失败修复与恢复观察", "发布包与平台复盘"]) {
      assert.ok(doc.includes(step), `${step} should be documented`);
    }

    for (const outcome of ["通过", "退回修复", "暂停批量"]) {
      assert.ok(doc.includes(outcome), `${outcome} should be documented`);
    }

    for (const signal of ["开书证据", "负责人确认", "失败率过高", "恢复观察不足"]) {
      assert.ok(doc.includes(signal), `${signal} should be documented in the final review checklist`);
    }

    for (const runbookSignal of ["样本动作", "要抓的证据", "退路", "回到作品页补骨架", "停在发布修复"]) {
      assert.ok(doc.includes(runbookSignal), `${runbookSignal} should be documented in the real sample runbook`);
    }
  });

  await t.test("documents the unified scale decision gate", () => {
    assert.ok(doc.includes("统一放量三态"));
    for (const label of ["允许小步加码", "继续观察", "禁止放大"]) {
      assert.ok(doc.includes(label), `${label} should be documented`);
    }

    for (const route of ["/tasks", "/gate", "/projects/[projectId]", "/failures"]) {
      assert.ok(doc.includes(route), `${route} should be documented as a scale decision surface`);
    }

    assert.ok(doc.includes("推荐批次安全阀"));
    assert.ok(doc.includes("恢复小批"));
    assert.ok(doc.includes("首日扩展"));
    assert.ok(doc.includes("不能各自发明放量口径"));
  });

  await t.test("documents the production closure status strip", () => {
    assert.ok(doc.includes("顶部总控统一闭环看板"));
    assert.ok(doc.includes("批量健康、AI 写审改、模型路线"));
    assert.ok(doc.includes("只看一个总控入口就能判断能否继续生产"));
    assert.ok(doc.includes("productionClosure"));
  });

  await t.test("documents the visible end-to-end acceptance criteria map", () => {
    assert.ok(doc.includes("端到端可见验收口径地图"));
    for (const route of ["/projects", "/tasks", "/dispatch", "/gate", "/failures"]) {
      assert.ok(doc.includes(route), `${route} should be documented in the visible acceptance map`);
    }

    for (const criterion of [
      "任务回执验收口径",
      "派单回执验收口径",
      "失败修复回执验收口径",
      "发布包与平台复盘验收口径",
    ]) {
      assert.ok(doc.includes(criterion), `${criterion} should be documented`);
    }

    for (const proof of ["执行角色", "输入", "输出", "人工验收", "下一步", "失败原因", "修复泳道", "版本基线", "真实反馈", "复盘指标"]) {
      assert.ok(doc.includes(proof), `${proof} should be documented as visible proof`);
    }
  });

  await t.test("documents the final acceptance evidence matrix", () => {
    assert.ok(doc.includes("原始需求最终验收矩阵"));
    assert.ok(doc.includes("证据链接"));
    assert.ok(doc.includes("验收状态"));
    assert.ok(doc.includes("缺口"));
    assert.ok(doc.includes("下一步"));

    for (const requirement of ["30 个开源参考案例", "8 个核心平台范围", "四类模型接口", "真实作品流水线"]) {
      assert.ok(doc.includes(requirement), `${requirement} should be documented in the final acceptance matrix`);
    }

    assert.ok(doc.includes("最终交付正式放行卡"));
    assert.ok(doc.includes("/gate#pipeline-final-review"));
    assert.ok(doc.includes("仍需用真实作品持续验收正式放行证据"));
    assert.ok(doc.includes("无新增平台缺口"));
  });

  await t.test("uses the current delivery route instead of old kickoff instructions", () => {
    assert.equal(doc.includes("建议下一步不要直接开写代码"), false);
    assert.equal(doc.includes("`PRD.md`：产品需求文档，锁定页面、字段、MVP 范围。"), false);
    assert.equal(doc.includes("`TECHNICAL_DESIGN.md`：技术方案，锁定数据库、模型网关、编辑器选型、API。"), false);

    assert.ok(doc.includes("当前下一步"));
    assert.ok(doc.includes("从 `/projects` 跑一条真实作品样本"));
    assert.ok(doc.includes("从 `/gate` 判断是否允许小批量"));
    assert.ok(doc.includes("不再把新增平台当作进度"));
  });
});
