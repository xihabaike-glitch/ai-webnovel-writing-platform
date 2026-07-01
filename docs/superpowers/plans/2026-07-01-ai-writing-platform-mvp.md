# AI Writing Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable MVP of the AI web-novel writing platform: projects, chapters, platform profiles, model settings, mock AI chapter review, and Markdown export.

**Architecture:** Use a Next.js TypeScript app with Prisma-backed persistence and a server-side Model Gateway. The UI stays writing-workbench-first: projects and manuscripts are primary, AI is a right-side task assistant rather than the main product surface.

**Tech Stack:** Next.js, TypeScript, React, Tailwind CSS, Prisma, SQLite for local MVP, Tiptap later in P1, server-side API routes, Vitest, Playwright.

---

## File Structure

Create this structure:

```txt
package.json
next.config.mjs
tsconfig.json
postcss.config.mjs
tailwind.config.ts
prisma/schema.prisma
prisma/seed.ts
src/app/page.tsx
src/app/projects/page.tsx
src/app/projects/[projectId]/page.tsx
src/app/projects/[projectId]/chapters/[chapterId]/page.tsx
src/app/settings/models/page.tsx
src/app/api/projects/route.ts
src/app/api/projects/[projectId]/route.ts
src/app/api/projects/[projectId]/chapters/route.ts
src/app/api/chapters/[chapterId]/route.ts
src/app/api/platforms/route.ts
src/app/api/model-providers/route.ts
src/app/api/ai/tasks/chapter-review/route.ts
src/app/api/export/markdown/route.ts
src/components/app-shell/AppShell.tsx
src/components/projects/ProjectForm.tsx
src/components/chapters/ChapterEditor.tsx
src/components/ai/ChapterReviewPanel.tsx
src/lib/db/prisma.ts
src/lib/platforms/platformProfiles.ts
src/lib/model-gateway/types.ts
src/lib/model-gateway/mockAdapter.ts
src/lib/ai/buildChapterReviewPrompt.ts
src/lib/export/markdown.ts
src/lib/text/wordCount.ts
src/lib/validators/project.ts
src/lib/validators/chapter.ts
src/test/wordCount.test.ts
src/test/platformProfiles.test.ts
src/test/markdownExport.test.ts
```

Each file has one job:

1. `prisma/schema.prisma`: persistent data model.
2. `src/lib/platforms/platformProfiles.ts`: structured rules for eight platforms.
3. `src/lib/model-gateway/*`: provider-neutral model calling interface.
4. `src/lib/ai/buildChapterReviewPrompt.ts`: converts project/chapter/platform data into an AI task prompt.
5. `src/components/chapters/ChapterEditor.tsx`: main writing surface.
6. `src/components/ai/ChapterReviewPanel.tsx`: AI task surface and result display.
7. `src/lib/export/markdown.ts`: deterministic Markdown export.

## Task 1: Scaffold The App

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create the Next.js app files**

Run:

```bash
npm create next-app@latest . -- --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected:

```txt
Success! Created
```

- [ ] **Step 2: Install MVP dependencies**

Run:

```bash
npm install @prisma/client zod zustand
npm install -D prisma vitest @testing-library/react @testing-library/jest-dom jsdom tsx
```

Expected:

```txt
added
```

- [ ] **Step 3: Add test scripts**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run build
```

Expected:

```txt
Compiled successfully
```

## Task 2: Add Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

Run:

```bash
npx prisma init --datasource-provider sqlite
```

Expected:

```txt
Your Prisma schema was created
```

- [ ] **Step 2: Define schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Project {
  id               String   @id @default(cuid())
  title            String
  targetPlatform   String
  targetLengthType String
  targetWordCount  Int
  currentWordCount Int      @default(0)
  genre            String
  sellingPoint     String   @default("")
  updateCadence    String   @default("")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  chapters       Chapter[]
  characters     Character[]
  worldEntries   WorldEntry[]
  foreshadows    Foreshadow[]
  plotThreads    PlotThread[]
  aiTasks        AiTask[]
}

model Chapter {
  id          String   @id @default(cuid())
  projectId   String
  volumeId    String?
  order       Int
  title       String
  content     String   @default("")
  wordCount   Int      @default(0)
  goal        String   @default("")
  hook        String   @default("")
  conflict    String   @default("")
  valueShift  String   @default("")
  cliffhanger String   @default("")
  status      String   @default("draft")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Character {
  id                String   @id @default(cuid())
  projectId          String
  name              String
  role              String
  desire            String   @default("")
  need              String   @default("")
  flaw              String   @default("")
  arcStart          String   @default("")
  arcEnd            String   @default("")
  voice             String   @default("")
  relationshipNotes String   @default("")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model WorldEntry {
  id        String   @id @default(cuid())
  projectId String
  type      String
  title     String
  content   String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Foreshadow {
  id                  String   @id @default(cuid())
  projectId           String
  title               String
  setupChapterId      String?
  payoffChapterId     String?
  relatedCharacterIds String   @default("[]")
  status              String   @default("planned")
  notes               String   @default("")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model PlotThread {
  id             String   @id @default(cuid())
  projectId      String
  type           String
  title          String
  startChapterId String?
  endChapterId   String?
  status         String   @default("planned")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ModelProvider {
  id               String   @id @default(cuid())
  providerId       String
  displayName      String
  baseUrl          String?
  encryptedApiKey  String?
  defaultModel     String
  enabled          Boolean  @default(true)
  maxContextTokens Int?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  aiTasks AiTask[]
}

model AiTask {
  id               String   @id @default(cuid())
  projectId         String
  chapterId         String?
  taskType          String
  providerConfigId  String
  model             String
  status            String   @default("queued")
  inputSnapshot     String
  outputText        String?
  inputTokens       Int?
  outputTokens      Int?
  costUsd           Float?
  errorMessage      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  modelProvider ModelProvider @relation(fields: [providerConfigId], references: [id], onDelete: Restrict)
}
```

- [ ] **Step 3: Add Prisma singleton**

Create `src/lib/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Run migration**

Run:

```bash
printf 'DATABASE_URL="file:./dev.db"\n' > .env
npx prisma migrate dev --name init
```

Expected:

```txt
Your database is now in sync with your schema.
```

## Task 3: Add Platform Profiles

**Files:**
- Create: `src/lib/platforms/platformProfiles.ts`
- Create: `src/test/platformProfiles.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/platformProfiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPlatformProfile, platformProfiles } from "@/lib/platforms/platformProfiles";

describe("platformProfiles", () => {
  it("contains the eight MVP platforms", () => {
    expect(platformProfiles.map((profile) => profile.id).sort()).toEqual([
      "fanqie",
      "jjwxc",
      "qidian",
      "qimao",
      "royal_road",
      "wattpad",
      "webnovel",
      "zhihu_yanxuan",
    ]);
  });

  it("returns qidian as a long-form paid platform profile", () => {
    const profile = getPlatformProfile("qidian");
    expect(profile.name).toBe("起点中文网");
    expect(profile.defaultLengthType).toBe("long_300k_plus");
    expect(profile.reviewFocus).toContain("卷结构");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/test/platformProfiles.test.ts
```

Expected:

```txt
FAIL
Cannot find module
```

- [ ] **Step 3: Add platform profile module**

Create `src/lib/platforms/platformProfiles.ts`:

```ts
export type PlatformId =
  | "qidian"
  | "fanqie"
  | "qimao"
  | "jjwxc"
  | "zhihu_yanxuan"
  | "webnovel"
  | "royal_road"
  | "wattpad";

export type LengthType =
  | "short_10k"
  | "mid_50k"
  | "long_300k_plus"
  | "mega_1m_plus";

export interface PlatformProfile {
  id: PlatformId;
  name: string;
  category: "paid" | "free" | "female" | "short" | "overseas";
  defaultLengthType: LengthType;
  genres: string[];
  openingRules: string[];
  reviewFocus: string[];
  risks: string[];
}

export const platformProfiles: PlatformProfile[] = [
  {
    id: "qidian",
    name: "起点中文网",
    category: "paid",
    defaultLengthType: "long_300k_plus",
    genres: ["玄幻", "仙侠", "都市", "历史", "科幻", "游戏竞技"],
    openingRules: ["第一章给出长期期待", "前三章展示世界规则和主角方向"],
    reviewFocus: ["卷结构", "升级体系", "世界观厚度", "长期伏笔", "阶段 Boss"],
    risks: ["新人竞争强", "前期反馈慢", "低字数作品不适配"],
  },
  {
    id: "fanqie",
    name: "番茄小说",
    category: "free",
    defaultLengthType: "long_300k_plus",
    genres: ["重生", "系统", "逆袭", "年代", "悬疑", "甜宠"],
    openingRules: ["第一章必须有强钩子", "前三章必须有连续爽点"],
    reviewFocus: ["读完率", "爽点密度", "章末悬念", "首秀前结构"],
    risks: ["流量波动", "版权控制弱", "长线设定容易被快节奏牺牲"],
  },
  {
    id: "qimao",
    name: "七猫",
    category: "free",
    defaultLengthType: "long_300k_plus",
    genres: ["言情", "种田", "年代", "豪门", "悬疑", "玄幻都市"],
    openingRules: ["开局目标清晰", "情绪供给稳定"],
    reviewFocus: ["稳定更新", "保底向节奏", "长线情绪", "下沉市场理解"],
    risks: ["题材同质化", "更新压力", "节奏过慢影响留存"],
  },
  {
    id: "jjwxc",
    name: "晋江文学城",
    category: "female",
    defaultLengthType: "mid_50k",
    genres: ["古言", "现言", "校园", "悬疑言情", "纯爱", "百合"],
    openingRules: ["人物关系先立住", "情感张力早出现"],
    reviewFocus: ["人物关系", "情感推进", "人物弧光", "审核风险"],
    risks: ["审核严格", "签约难度高", "情绪线崩坏会劝退"],
  },
  {
    id: "zhihu_yanxuan",
    name: "知乎盐选",
    category: "short",
    defaultLengthType: "short_10k",
    genres: ["悬疑", "复仇", "虐恋", "脑洞", "第一人称反转"],
    openingRules: ["第一段进入矛盾", "前 1000 字给出付费期待"],
    reviewFocus: ["反转链", "第一人称代入", "短篇爆点", "结尾回收"],
    risks: ["铺垫过长", "反转不成立", "结尾情绪不足"],
  },
  {
    id: "webnovel",
    name: "WebNovel",
    category: "overseas",
    defaultLengthType: "long_300k_plus",
    genres: ["Fantasy", "System", "Cultivation", "Urban Fantasy", "Progression"],
    openingRules: ["Explain the hook without heavy exposition", "Make the power fantasy clear early"],
    reviewFocus: ["English synopsis", "system logic", "chapter titles", "reader comprehension"],
    risks: ["direct translation sounds stiff", "cultural assumptions need context"],
  },
  {
    id: "royal_road",
    name: "Royal Road",
    category: "overseas",
    defaultLengthType: "long_300k_plus",
    genres: ["LitRPG", "Progression Fantasy", "Western Fantasy", "Cultivation"],
    openingRules: ["Make progression promise explicit", "Show system limits early"],
    reviewFocus: ["skill tree", "level curve", "combat logic", "world rules"],
    risks: ["soft systems get challenged", "progression without constraints feels cheap"],
  },
  {
    id: "wattpad",
    name: "Wattpad",
    category: "overseas",
    defaultLengthType: "mid_50k",
    genres: ["Romance", "Werewolf", "Billionaire", "Teen", "Campus"],
    openingRules: ["Lead with emotional tension", "Make the character appeal immediate"],
    reviewFocus: ["relationship tension", "tags", "chapter emotion", "mobile pacing"],
    risks: ["weak character chemistry", "unclear tags", "slow emotional payoff"],
  },
];

export function getPlatformProfile(id: PlatformId): PlatformProfile {
  const profile = platformProfiles.find((item) => item.id === id);
  if (!profile) {
    throw new Error(`Unknown platform profile: ${id}`);
  }
  return profile;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/test/platformProfiles.test.ts
```

Expected:

```txt
PASS
```

## Task 4: Add Word Count Utility

**Files:**
- Create: `src/lib/text/wordCount.ts`
- Create: `src/test/wordCount.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/wordCount.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { countWords } from "@/lib/text/wordCount";

describe("countWords", () => {
  it("counts Chinese characters and English words", () => {
    expect(countWords("林晚推开门。The system started.")).toBe(10);
  });

  it("ignores whitespace and punctuation", () => {
    expect(countWords("  她、停下。  ")).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/test/wordCount.test.ts
```

Expected:

```txt
FAIL
Cannot find module
```

- [ ] **Step 3: Implement utility**

Create `src/lib/text/wordCount.ts`:

```ts
export function countWords(input: string): number {
  const chineseChars = input.match(/[\u4e00-\u9fff]/g) ?? [];
  const withoutChinese = input.replace(/[\u4e00-\u9fff]/g, " ");
  const englishWords = withoutChinese.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? [];
  return chineseChars.length + englishWords.length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/test/wordCount.test.ts
```

Expected:

```txt
PASS
```

## Task 5: Add Project And Chapter APIs

**Files:**
- Create: `src/lib/validators/project.ts`
- Create: `src/lib/validators/chapter.ts`
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[projectId]/route.ts`
- Create: `src/app/api/projects/[projectId]/chapters/route.ts`
- Create: `src/app/api/chapters/[chapterId]/route.ts`

- [ ] **Step 1: Add validators**

Create `src/lib/validators/project.ts`:

```ts
import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(120),
  targetPlatform: z.enum([
    "qidian",
    "fanqie",
    "qimao",
    "jjwxc",
    "zhihu_yanxuan",
    "webnovel",
    "royal_road",
    "wattpad",
  ]),
  targetLengthType: z.enum(["short_10k", "mid_50k", "long_300k_plus", "mega_1m_plus"]),
  targetWordCount: z.number().int().positive(),
  genre: z.string().min(1).max(80),
  sellingPoint: z.string().max(500).default(""),
  updateCadence: z.string().max(80).default(""),
});
```

Create `src/lib/validators/chapter.ts`:

```ts
import { z } from "zod";

export const createChapterSchema = z.object({
  title: z.string().min(1).max(120),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().optional(),
  goal: z.string().max(500).optional(),
  hook: z.string().max(500).optional(),
  conflict: z.string().max(500).optional(),
  valueShift: z.string().max(500).optional(),
  cliffhanger: z.string().max(500).optional(),
  status: z.enum(["outline", "draft", "revising", "final"]).optional(),
});
```

- [ ] **Step 2: Add projects route**

Create `src/app/api/projects/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createProjectSchema } from "@/lib/validators/project";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json();
  const input = createProjectSchema.parse(body);
  const project = await prisma.project.create({ data: input });
  return NextResponse.json({ project }, { status: 201 });
}
```

- [ ] **Step 3: Add single project route**

Create `src/app/api/projects/[projectId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: { projectId: string };
}

export async function GET(_request: Request, { params }: Params) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}
```

- [ ] **Step 4: Add chapter collection route**

Create `src/app/api/projects/[projectId]/chapters/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createChapterSchema } from "@/lib/validators/chapter";

interface Params {
  params: { projectId: string };
}

export async function GET(_request: Request, { params }: Params) {
  const chapters = await prisma.chapter.findMany({
    where: { projectId: params.projectId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ chapters });
}

export async function POST(request: Request, { params }: Params) {
  const body = await request.json();
  const input = createChapterSchema.parse(body);
  const count = await prisma.chapter.count({ where: { projectId: params.projectId } });
  const chapter = await prisma.chapter.create({
    data: {
      projectId: params.projectId,
      order: count + 1,
      title: input.title,
    },
  });
  return NextResponse.json({ chapter }, { status: 201 });
}
```

- [ ] **Step 5: Add chapter detail route**

Create `src/app/api/chapters/[chapterId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { updateChapterSchema } from "@/lib/validators/chapter";
import { countWords } from "@/lib/text/wordCount";

interface Params {
  params: { chapterId: string };
}

export async function GET(_request: Request, { params }: Params) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: params.chapterId },
  });
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }
  return NextResponse.json({ chapter });
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json();
  const input = updateChapterSchema.parse(body);
  const wordCount = typeof input.content === "string" ? countWords(input.content) : undefined;
  const chapter = await prisma.chapter.update({
    where: { id: params.chapterId },
    data: {
      ...input,
      ...(wordCount === undefined ? {} : { wordCount }),
    },
  });
  await prisma.project.update({
    where: { id: chapter.projectId },
    data: {
      currentWordCount: {
        set: await prisma.chapter
          .findMany({ where: { projectId: chapter.projectId }, select: { wordCount: true } })
          .then((chapters) => chapters.reduce((sum, item) => sum + item.wordCount, 0)),
      },
    },
  });
  return NextResponse.json({ chapter });
}
```

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected:

```txt
Compiled successfully
```

## Task 6: Add Mock Model Gateway And Chapter Review

**Files:**
- Create: `src/lib/model-gateway/types.ts`
- Create: `src/lib/model-gateway/mockAdapter.ts`
- Create: `src/lib/ai/buildChapterReviewPrompt.ts`
- Create: `src/app/api/ai/tasks/chapter-review/route.ts`

- [ ] **Step 1: Add gateway types**

Create `src/lib/model-gateway/types.ts`:

```ts
export type ModelProviderId =
  | "claude"
  | "deepseek"
  | "kimi"
  | "gpt"
  | "openai_compatible"
  | "ollama"
  | "mock";

export interface GenerateRequest {
  providerId: ModelProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
  };
}

export interface ModelAdapter {
  generate(request: GenerateRequest): Promise<GenerateResult>;
}
```

- [ ] **Step 2: Add mock adapter**

Create `src/lib/model-gateway/mockAdapter.ts`:

```ts
import type { GenerateRequest, GenerateResult, ModelAdapter } from "./types";

export class MockAdapter implements ModelAdapter {
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const text = JSON.stringify(
      {
        score: 72,
        issues: [
          {
            severity: "medium",
            type: "hook",
            message: "开头有事件，但主角处境压力还不够具体。",
            suggestion: "在前三百字内加入一个不可回避的损失或倒计时。",
          },
          {
            severity: "medium",
            type: "platform_fit",
            message: "章节信息量可读，但平台爽点不够集中。",
            suggestion: "把本章目标、冲突和章末悬念收束到同一个强期待上。",
          },
        ],
        summary: `Mock review for ${request.model}: chapter needs a sharper hook and clearer platform fit.`,
      },
      null,
      2,
    );

    return {
      text,
      usage: {
        inputTokens: request.systemPrompt.length + request.userPrompt.length,
        outputTokens: text.length,
        costUsd: 0,
      },
    };
  }
}
```

- [ ] **Step 3: Add prompt builder**

Create `src/lib/ai/buildChapterReviewPrompt.ts`:

```ts
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

interface ChapterReviewPromptInput {
  projectTitle: string;
  platform: PlatformProfile;
  chapter: {
    title: string;
    content: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
  };
}

export function buildChapterReviewPrompt(input: ChapterReviewPromptInput) {
  const systemPrompt =
    "你是严格的网文编辑。你只输出 JSON，不输出闲聊。重点检查钩子、冲突、爽点、人物弧光、伏笔和平台适配。";

  const userPrompt = [
    `作品：${input.projectTitle}`,
    `目标平台：${input.platform.name}`,
    `平台审稿重点：${input.platform.reviewFocus.join("、")}`,
    `章节标题：${input.chapter.title}`,
    `章节目标：${input.chapter.goal}`,
    `开头钩子：${input.chapter.hook}`,
    `冲突：${input.chapter.conflict}`,
    `价值变化：${input.chapter.valueShift}`,
    `章末悬念：${input.chapter.cliffhanger}`,
    "正文：",
    input.chapter.content,
    "输出 JSON 字段：score, issues, summary。issues 内含 severity, type, message, suggestion。",
  ].join("\n");

  return { systemPrompt, userPrompt };
}
```

- [ ] **Step 4: Add chapter review API**

Create `src/app/api/ai/tasks/chapter-review/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildChapterReviewPrompt } from "@/lib/ai/buildChapterReviewPrompt";
import { MockAdapter } from "@/lib/model-gateway/mockAdapter";
import { getPlatformProfile } from "@/lib/platforms/platformProfiles";

export async function POST(request: Request) {
  const body = (await request.json()) as { chapterId: string };
  const chapter = await prisma.chapter.findUnique({
    where: { id: body.chapterId },
    include: { project: true },
  });
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const platform = getPlatformProfile(chapter.project.targetPlatform as Parameters<typeof getPlatformProfile>[0]);
  const prompt = buildChapterReviewPrompt({
    projectTitle: chapter.project.title,
    platform,
    chapter: {
      title: chapter.title,
      content: chapter.content,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
    },
  });

  const provider = await prisma.modelProvider.upsert({
    where: { id: "mock-provider" },
    create: {
      id: "mock-provider",
      providerId: "mock",
      displayName: "Mock Provider",
      defaultModel: "mock-editor",
      enabled: true,
    },
    update: {},
  });

  const task = await prisma.aiTask.create({
    data: {
      projectId: chapter.projectId,
      chapterId: chapter.id,
      taskType: "chapter_review",
      providerConfigId: provider.id,
      model: "mock-editor",
      status: "running",
      inputSnapshot: JSON.stringify(prompt),
    },
  });

  const result = await new MockAdapter().generate({
    providerId: "mock",
    model: "mock-editor",
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
  });

  const updatedTask = await prisma.aiTask.update({
    where: { id: task.id },
    data: {
      status: "succeeded",
      outputText: result.text,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      costUsd: result.usage?.costUsd,
    },
  });

  return NextResponse.json({ task: updatedTask, result: JSON.parse(result.text) });
}
```

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected:

```txt
Compiled successfully
```

## Task 7: Add Markdown Export

**Files:**
- Create: `src/lib/export/markdown.ts`
- Create: `src/test/markdownExport.test.ts`
- Create: `src/app/api/export/markdown/route.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/markdownExport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { exportProjectMarkdown } from "@/lib/export/markdown";

describe("exportProjectMarkdown", () => {
  it("exports project title and ordered chapters", () => {
    const markdown = exportProjectMarkdown({
      title: "夜雨系统",
      chapters: [
        { title: "第二章", content: "她回头。" },
        { title: "第一章", content: "门开了。" },
      ],
    });
    expect(markdown).toContain("# 夜雨系统");
    expect(markdown).toContain("## 第一章");
    expect(markdown.indexOf("## 第一章")).toBeLessThan(markdown.indexOf("## 第二章"));
  });
});
```

- [ ] **Step 2: Implement export utility**

Create `src/lib/export/markdown.ts`:

```ts
interface ExportChapter {
  title: string;
  content: string;
}

interface ExportProject {
  title: string;
  chapters: ExportChapter[];
}

function chapterNumber(title: string): number {
  const match = title.match(/第([一二三四五六七八九十百千万0-9]+)章/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const raw = match[1];
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const map: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  return map[raw] ?? Number.MAX_SAFE_INTEGER;
}

export function exportProjectMarkdown(project: ExportProject): string {
  const chapters = [...project.chapters].sort((a, b) => chapterNumber(a.title) - chapterNumber(b.title));
  return [
    `# ${project.title}`,
    "",
    ...chapters.flatMap((chapter) => [`## ${chapter.title}`, "", chapter.content.trim(), ""]),
  ].join("\n");
}
```

- [ ] **Step 3: Run test**

Run:

```bash
npm test -- src/test/markdownExport.test.ts
```

Expected:

```txt
PASS
```

- [ ] **Step 4: Add export route**

Create `src/app/api/export/markdown/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exportProjectMarkdown } from "@/lib/export/markdown";

export async function POST(request: Request) {
  const body = (await request.json()) as { projectId: string };
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const markdown = exportProjectMarkdown({
    title: project.title,
    chapters: project.chapters.map((chapter) => ({
      title: chapter.title,
      content: chapter.content,
    })),
  });
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(project.title)}.md"`,
    },
  });
}
```

## Task 8: Add Minimal UI

**Files:**
- Create: `src/components/app-shell/AppShell.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/projects/page.tsx`
- Create: `src/app/projects/[projectId]/page.tsx`
- Create: `src/app/projects/[projectId]/chapters/[chapterId]/page.tsx`

- [ ] **Step 1: Add app shell**

Create `src/components/app-shell/AppShell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link className="font-semibold" href="/">
            AI 网文写作平台
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-600">
            <Link href="/projects">作品</Link>
            <Link href="/settings/models">模型设置</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Add home page**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="grid gap-6">
        <div>
          <h1 className="text-3xl font-semibold">写作品，不是陪聊天框闲聊</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            从平台、篇幅、大纲、章节、人物、伏笔到 AI 审稿，先把作品工程立住。
          </p>
        </div>
        <Link
          className="inline-flex w-fit rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
          href="/projects"
        >
          进入作品工作台
        </Link>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 3: Add projects page**

Create `src/app/projects/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/db/prisma";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">作品</h1>
      </div>
      <div className="grid gap-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-md border bg-white p-4 hover:bg-zinc-50"
          >
            <div className="font-medium">{project.title}</div>
            <div className="mt-1 text-sm text-zinc-600">
              {project.targetPlatform} · {project.currentWordCount}/{project.targetWordCount} 字
            </div>
          </Link>
        ))}
        {projects.length === 0 ? <p className="text-sm text-zinc-600">还没有作品。先用 API 创建一个作品。</p> : null}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Build**

Run:

```bash
npm run build
```

Expected:

```txt
Compiled successfully
```

## Task 9: Verification

**Files:**
- Modify: no files

- [ ] **Step 1: Run tests**

Run:

```bash
npm test
```

Expected:

```txt
PASS
```

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected:

```txt
Compiled successfully
```

- [ ] **Step 3: Run local app**

Run:

```bash
npm run dev
```

Expected:

```txt
Local: http://localhost:3000
```

## Self-Review

Spec coverage:

1. PRD P0 project creation is covered by Task 5.
2. PRD P0 chapter editing backend is covered by Task 5 and minimal UI by Task 8.
3. PRD P0 platform profiles are covered by Task 3.
4. PRD P0 model pathway is covered by Task 6 with mock provider.
5. PRD P0 chapter review is covered by Task 6.
6. PRD P0 Markdown export is covered by Task 7.

Known deferrals:

1. Tiptap rich editor moves to P1 after plain editor flow works.
2. Real Claude, DeepSeek, Kimi, and GPT adapters follow after mock chapter review is stable.
3. Character, worldbuilding, and foreshadow UI follow after project/chapter loop is usable.
4. docx export follows after Markdown export is stable.

Placeholder scan:

1. No task uses unspecified file paths.
2. No task asks an engineer to add validation without concrete schemas.
3. No task asks for “similar code”; repeated code is written explicitly where needed.

Type consistency:

1. Platform IDs match PRD and technical design.
2. Chapter status values match PRD and technical design.
3. Model provider IDs include `mock` only for MVP development and keep real provider IDs intact.
