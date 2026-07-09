# Final Delivery Platform Tactic Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PM-verifiable platform tactic archive card after final delivery, so the next book can reuse a proven platform打法 from the gate into project creation.

**Architecture:** Extend the existing derived `buildPrePublishGate` view with `finalDeliveryPlatformTacticArchives`, avoiding new tables. Gate renders the archive cards under the formal release card. Reuse links use the existing `/projects?launchPlatform=...&launchTactic=...` style launch path and ProjectForm copy distinguishes final delivery archive launches.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Node test runner, existing project/gate helper modules.

## Global Constraints

- Do not add database tables or schema migrations.
- Do not create a standalone archive page.
- Do not automatically create a new project.
- Do not call an LLM to summarize archive tactics.
- Do not add the paused ten platforms.
- Use existing platform tactic experience and project creation launch paths instead of a parallel archive system.
- Use TDD: write failing tests first, run red, implement minimal code, run green.

---

## File Structure

- Modify `src/lib/projects/prePublishGate.ts`: define the archive card type, build cards from final delivery candidates, return them from `buildPrePublishGate`.
- Modify `src/app/gate/page.tsx`: render archive cards under the formal release panel.
- Modify `src/components/projects/ProjectForm.tsx`: show final-delivery-specific launch copy when launch parameters indicate archive reuse.
- Modify `src/test/prePublishGate.test.ts`: cover reusable, missing-evidence, and hold-batch states.
- Modify `src/test/gatePageSource.test.ts`: source guard for gate rendering and reuse links.
- Modify or add a small source test for `ProjectForm` if existing source tests do not cover launch copy.

---

### Task 1: Add Derived Platform Tactic Archive Cards

**Files:**
- Modify: `src/lib/projects/prePublishGate.ts`
- Test: `src/test/prePublishGate.test.ts`

**Interfaces:**
- Consumes: `PrePublishGateProjectStatus`, `PrePublishGateRealPipelineFinalReview`
- Produces:
  - `PrePublishGateFinalDeliveryPlatformTacticArchiveCard`
  - `PrePublishGate.finalDeliveryPlatformTacticArchives: PrePublishGateFinalDeliveryPlatformTacticArchiveCard[]`

- [ ] **Step 1: Write the failing reusable-card test**

Add this assertion block inside `allows launch when package, queue, failures, and strategy are clean` after final delivery release assertions:

```ts
assert.equal(gate.finalDeliveryPlatformTacticArchives.length, 1);
const archive = gate.finalDeliveryPlatformTacticArchives[0];
assert.equal(archive.status, "reusable");
assert.equal(archive.projectId, "project-ready");
assert.equal(archive.projectTitle, "夜雨系统");
assert.equal(archive.platformId, "fanqie");
assert.equal(archive.platformName, "番茄小说");
assert.ok(archive.label.includes("平台打法归档"));
assert.ok(archive.tactic.includes("番茄"));
assert.ok(archive.evidence.some((line) => line.includes("最终交付已闭环")));
assert.ok(archive.evidence.some((line) => line.includes("真实作品流水线终检通过")));
assert.ok(archive.openingHook.length > 0);
assert.ok(archive.firstThreePromise.length > 0);
assert.ok(archive.packagingTactic.length > 0);
assert.ok(archive.verificationAction.length > 0);
assert.ok(archive.stopLine.includes("停手"));
assert.ok(archive.reuseHref.startsWith("/projects?"));
assert.ok(archive.reuseHref.includes("launchPlatform=fanqie"));
assert.ok(archive.reuseHref.includes("launchTactic="));
assert.equal(archive.repairHref, "#pipeline-final-review");
```

- [ ] **Step 2: Write the failing missing-evidence test**

Add this inside `blocks launch when final delivery receipts are missing`:

```ts
assert.equal(gate.finalDeliveryPlatformTacticArchives.length, 1);
const archive = gate.finalDeliveryPlatformTacticArchives[0];
assert.equal(archive.status, "needs_evidence");
assert.equal(archive.projectId, "project-ready");
assert.equal(archive.reuseHref, "");
assert.ok(archive.detail.includes("最终交付回执"));
assert.ok(archive.repairHref.includes("/projects/project-ready"));
```

- [ ] **Step 3: Write the failing hold-batch test**

Add this inside `blocks formal release when writing tasks lack archive experience receipts`:

```ts
assert.equal(gate.finalDeliveryPlatformTacticArchives.length, 1);
const archive = gate.finalDeliveryPlatformTacticArchives[0];
assert.equal(archive.status, "blocked");
assert.equal(archive.reuseHref, "");
assert.ok(archive.detail.includes("暂停批量"));
assert.equal(archive.repairHref, gate.realPipelineFinalReview.primaryActionHref);
```

- [ ] **Step 4: Run red test**

Run:

```bash
node --test src/test/prePublishGate.test.ts
```

Expected: FAIL because `finalDeliveryPlatformTacticArchives` does not exist.

- [ ] **Step 5: Add interfaces**

In `src/lib/projects/prePublishGate.ts`, add:

```ts
export interface PrePublishGateFinalDeliveryPlatformTacticArchiveCard {
  status: "reusable" | "needs_evidence" | "blocked";
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  tactic: string;
  label: string;
  detail: string;
  evidence: string[];
  openingHook: string;
  firstThreePromise: string;
  packagingTactic: string;
  verificationAction: string;
  stopLine: string;
  reuseHref: string;
  repairHref: string;
}
```

Add to `PrePublishGate`:

```ts
finalDeliveryPlatformTacticArchives: PrePublishGateFinalDeliveryPlatformTacticArchiveCard[];
```

- [ ] **Step 6: Add helper functions**

Near `buildFinalDeliveryRelease`, add:

```ts
function encodeArchiveTactic(platformName: string, projectTitle: string) {
  return `${platformName}最终交付打法：${projectTitle}`;
}

function buildFinalDeliveryPlatformTacticArchiveCards(input: {
  projects: PrePublishGateProjectStatus[];
  finalReview: PrePublishGateRealPipelineFinalReview;
}): PrePublishGateFinalDeliveryPlatformTacticArchiveCard[] {
  return input.projects
    .filter((project) => project.status === "ready" || project.finalDeliveryGate.completedCount > 0)
    .map((project) => {
      const allReceiptsDone = project.finalDeliveryGate.completedCount === project.finalDeliveryGate.totalCount;
      const finalReviewPassed = input.finalReview.outcome === "pass";
      const status: PrePublishGateFinalDeliveryPlatformTacticArchiveCard["status"] = !allReceiptsDone
        ? "needs_evidence"
        : finalReviewPassed
          ? "reusable"
          : "blocked";
      const tactic = encodeArchiveTactic(project.platformName, project.projectTitle);
      const reuseParams = new URLSearchParams({
        launchPlatform: project.platformId,
        launchTactic: tactic,
        launchSource: "final-delivery-archive",
      });

      return {
        status,
        projectId: project.projectId,
        projectTitle: project.projectTitle,
        platformId: project.platformId,
        platformName: project.platformName,
        tactic,
        label: status === "reusable" ? "平台打法归档可复用" : status === "needs_evidence" ? "平台打法归档缺证据" : "平台打法归档暂停复用",
        detail: status === "reusable"
          ? `${project.projectTitle} 已完成最终交付，可作为 ${project.platformName} 下一本书的开局打法土壤。`
          : status === "needs_evidence"
            ? `${project.projectTitle} 还缺最终交付回执，不能作为成功打法复用。`
            : `${project.projectTitle} 当前处于${input.finalReview.outcomeLabel}，暂停批量复用。`,
        evidence: [
          `${project.projectTitle}：${project.platformName} · ${project.finalDeliveryGate.label} · ${project.finalDeliveryGate.completedCount}/${project.finalDeliveryGate.totalCount} 项回执。`,
          `真实作品流水线终检：${input.finalReview.headline}。`,
          `发布包状态：${project.finalGateLabel}。`,
          `平台复盘：${project.loopTimeline.label} · ${project.loopTimeline.nextAction}。`,
        ],
        openingHook: `${project.platformName} 开局沿用已交付样本的高压钩子，第一屏给危机、选择或强承诺。`,
        firstThreePromise: "前三章必须兑现钩子、规则证明和第一次升级，不把爽点拖到第四章之后。",
        packagingTactic: `标题、简介、标签和样章先对齐 ${project.platformName} 已交付包，再做小样本验证。`,
        verificationAction: "新书首日只跑小样本，回填曝光、点击、收藏、追读或平台等价指标。",
        stopLine: "停手线：缺最终交付回执、真实终检未通过或首日数据未回填，不允许把这条打法当作可放量经验。",
        reuseHref: status === "reusable" ? `/projects?${reuseParams.toString()}#new-project` : "",
        repairHref: status === "needs_evidence" ? project.finalDeliveryGate.href : input.finalReview.primaryActionHref,
      };
    });
}
```

- [ ] **Step 7: Wire helper into `buildPrePublishGate`**

After `finalDeliveryRelease`, add:

```ts
const finalDeliveryPlatformTacticArchives = buildFinalDeliveryPlatformTacticArchiveCards({
  projects: finalReviewProjectStatuses,
  finalReview: realPipelineFinalReview,
});
```

Return it:

```ts
finalDeliveryPlatformTacticArchives,
```

- [ ] **Step 8: Run green test**

Run:

```bash
node --test src/test/prePublishGate.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/projects/prePublishGate.ts src/test/prePublishGate.test.ts
git commit -m "feat: derive final delivery platform tactic archives"
```

---

### Task 2: Render Archive Cards In The Gate

**Files:**
- Modify: `src/app/gate/page.tsx`
- Test: `src/test/gatePageSource.test.ts`

**Interfaces:**
- Consumes: `gate.finalDeliveryPlatformTacticArchives`
- Produces: visible "平台打法归档卡" panel and "用这条打法开新书" link

- [ ] **Step 1: Write failing source guard**

Add a test to `src/test/gatePageSource.test.ts`:

```ts
test("gate page renders final delivery platform tactic archive cards", () => {
  assert.ok(source.includes("gate.finalDeliveryPlatformTacticArchives"));
  assert.ok(source.includes("平台打法归档卡"));
  assert.ok(source.includes("用这条打法开新书"));
  assert.ok(source.includes("archive.reuseHref"));
  assert.ok(source.includes("archive.stopLine"));
  assert.ok(source.includes("archive.evidence.map"));
});
```

- [ ] **Step 2: Run red test**

```bash
node --test src/test/gatePageSource.test.ts
```

Expected: FAIL because archive rendering is absent.

- [ ] **Step 3: Render the section**

In `src/app/gate/page.tsx`, after the formal release card evidence block and before the section closes, add:

```tsx
          {gate.finalDeliveryPlatformTacticArchives.length ? (
            <div className="mt-3 grid gap-3" aria-label="平台打法归档卡">
              {gate.finalDeliveryPlatformTacticArchives.map((archive) => (
                <div className="rounded-md border border-emerald-200 bg-white/80 p-3 text-xs leading-5 text-emerald-950" key={`${archive.projectId}:${archive.platformId}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium">平台打法归档卡 · {archive.platformName}</div>
                      <div className="mt-1 text-slate-700">{archive.projectTitle} · {archive.label}</div>
                      <p className="mt-1 text-slate-600">{archive.detail}</p>
                    </div>
                    {archive.status === "reusable" ? (
                      <Link className="w-fit rounded-md bg-emerald-950 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-900" href={hrefWithGateReturn(archive.reuseHref, gateRecheckReturnHref)}>
                        用这条打法开新书
                      </Link>
                    ) : (
                      <Link className="w-fit rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-50" href={hrefWithGateReturn(archive.repairHref, gateRecheckReturnHref)}>
                        补归档证据
                      </Link>
                    )}
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md bg-emerald-50 p-2">
                      <div className="font-medium">复用打法</div>
                      <p className="mt-1">{archive.openingHook}</p>
                      <p className="mt-1">{archive.firstThreePromise}</p>
                      <p className="mt-1">{archive.packagingTactic}</p>
                      <p className="mt-1">{archive.verificationAction}</p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-2 text-amber-950">
                      <div className="font-medium">停手线</div>
                      <p className="mt-1">{archive.stopLine}</p>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 text-slate-700">
                    {archive.evidence.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
```

- [ ] **Step 4: Run green test**

```bash
node --test src/test/gatePageSource.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/gate/page.tsx src/test/gatePageSource.test.ts
git commit -m "feat: render final delivery platform tactic archives"
```

---

### Task 3: Mark Project Creation Launch Copy As Final Delivery Archive Reuse

**Files:**
- Modify: `src/components/projects/ProjectForm.tsx`
- Test: add to `src/test/projectDetailRoleAnchors.test.ts` or create `src/test/projectFormSource.test.ts`

**Interfaces:**
- Consumes: `experienceLaunch.source?: string`
- Produces: copy that says the opening plan came from final delivery archive

- [ ] **Step 1: Write failing source test**

If no focused ProjectForm source test exists, create `src/test/projectFormSource.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/projects/ProjectForm.tsx", "utf8");

test("project form labels final delivery archive launches", () => {
  assert.ok(source.includes("launchSource"));
  assert.ok(source.includes("final-delivery-archive"));
  assert.ok(source.includes("最终交付归档打法"));
  assert.ok(source.includes("这条归档会影响推荐平台、模板、首章动作和停手线"));
});
```

- [ ] **Step 2: Run red test**

```bash
node --test src/test/projectFormSource.test.ts
```

Expected: FAIL because `launchSource` copy is absent.

- [ ] **Step 3: Extend launch type and copy**

In `ProjectFormExperienceLaunch`, add:

```ts
source?: string;
```

After `launchMatched`, add:

```ts
const finalDeliveryArchiveLaunch = experienceLaunch?.source === "final-delivery-archive";
```

In the launch notice copy, change the matched label block so it uses:

```tsx
<div className="font-medium">{finalDeliveryArchiveLaunch ? "最终交付归档打法" : "经验开书入口"}</div>
```

For the matched paragraph, use:

```tsx
{launchMatched
  ? finalDeliveryArchiveLaunch
    ? `已匹配最终交付归档打法「${selectedEvidence.experience?.platformName} · ${selectedEvidence.experience?.tactic}」，这条归档会影响推荐平台、模板、首章动作和停手线。`
    : `已匹配「${selectedEvidence.experience?.platformName} · ${selectedEvidence.experience?.tactic}」，本次开书会优先使用这条历史打法。`
  : `正在按「${experienceLaunch?.tactic}」寻找历史经验；若当前数据暂未加载到精确样本，会先切到对应平台模板。`}
```

- [ ] **Step 4: Ensure route parser passes source**

Find the page that builds `experienceLaunch` for `ProjectForm` and include:

```ts
source: typeof searchParams.launchSource === "string" ? searchParams.launchSource : undefined,
```

If the existing page already passes unknown fields through, only add the source test guard.

- [ ] **Step 5: Run green test**

```bash
node --test src/test/projectFormSource.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/projects/ProjectForm.tsx src/test/projectFormSource.test.ts src/app/projects/page.tsx
git commit -m "feat: label final delivery archive launches"
```

---

### Task 4: Final Verification

**Files:**
- No planned code changes unless verification exposes a defect.

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified implementation committed and ready to push

- [ ] **Step 1: Run focused tests**

```bash
node --test src/test/prePublishGate.test.ts
node --test src/test/gatePageSource.test.ts
node --test src/test/projectFormSource.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run full tests**

```bash
npm test
```

Expected: all tests PASS with 0 failures.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 4: Inspect git status and diff**

```bash
git status --short
git diff --stat HEAD
```

Expected: no unstaged changes if all task commits were made; otherwise only intentional files remain.

- [ ] **Step 5: Push**

```bash
git push
```

Expected: current branch pushes to GitHub.

---

## Self-Review

Spec coverage:

- Derived archive summary: Task 1.
- Gate archive card: Task 2.
- Existing project creation launch path: Task 3.
- No persistence and no new page: Global Constraints and Task 1 helper.
- Tests for evidence requirements and next-book launch: Tasks 1-3.

Placeholder scan:

- No placeholder or deferred-work steps remain.
- Each code-changing task includes a red test, expected failure, implementation content, green test, and commit.

Type consistency:

- `PrePublishGateFinalDeliveryPlatformTacticArchiveCard` is defined in Task 1 and consumed by Task 2.
- `finalDeliveryPlatformTacticArchives` is returned by `buildPrePublishGate` before page rendering uses it.
- `launchSource=final-delivery-archive` is produced by Task 1 reuse links and consumed by Task 3 ProjectForm copy.
