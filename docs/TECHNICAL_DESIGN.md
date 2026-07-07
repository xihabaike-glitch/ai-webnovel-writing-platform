# AI 网文写作平台技术设计

日期：2026-07-01
版本：MVP 0.1

## 1. 技术结论

MVP 应该采用网页优先、单体优先、模块边界清晰的架构。不要第一天就上微服务，也不要第一天就做复杂 agent 编排平台。先把作品、章节、人物、伏笔、平台规则和模型网关做扎实。

推荐技术栈：

1. Next.js
2. TypeScript
3. React
4. Tiptap
5. Zustand
6. PostgreSQL
7. Prisma
8. Tailwind CSS
9. 自研 Model Gateway

本地开发可先用 SQLite，但数据模型必须兼容 PostgreSQL。

## 2. 架构图

```txt
Browser
  |
  | React UI
  v
Next.js App
  |
  | Server Actions / API Routes
  v
Application Services
  ├─ Project Service
  ├─ Chapter Service
  ├─ Character Service
  ├─ Worldbuilding Service
  ├─ Foreshadow Service
  ├─ Platform Service
  ├─ Export Service
  └─ AI Task Service
        |
        v
     Model Gateway
        ├─ Claude Adapter
        ├─ DeepSeek Adapter
        ├─ Kimi Adapter
        ├─ GPT Adapter
        ├─ OpenAI-Compatible Adapter
        └─ Ollama Adapter

Database
  ├─ projects
  ├─ chapters
  ├─ characters
  ├─ world_entries
  ├─ foreshadows
  ├─ plot_threads
  ├─ platform_profiles
  ├─ model_providers
  ├─ ai_tasks
  └─ draft_versions
```

## 3. 目录结构

```txt
app/
├─ page.tsx
├─ projects/
│  ├─ page.tsx
│  └─ [projectId]/
│     ├─ page.tsx
│     ├─ outline/page.tsx
│     ├─ chapters/page.tsx
│     ├─ chapters/[chapterId]/page.tsx
│     ├─ characters/page.tsx
│     ├─ world/page.tsx
│     ├─ foreshadows/page.tsx
│     ├─ platforms/page.tsx
│     └─ export/page.tsx
├─ settings/
│  └─ models/page.tsx
└─ api/
   ├─ projects/route.ts
   ├─ chapters/route.ts
   ├─ characters/route.ts
   ├─ foreshadows/route.ts
   ├─ platforms/route.ts
   ├─ model-providers/route.ts
   └─ ai/tasks/route.ts

components/
├─ app-shell/
├─ editor/
├─ outline-tree/
├─ ai-assistant/
├─ platform-profile/
└─ forms/

lib/
├─ db/
├─ services/
├─ model-gateway/
├─ platform-rules/
├─ export/
└─ validators/

prisma/
└─ schema.prisma
```

## 4. 数据模型

### 4.1 Project

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

export interface Project {
  id: string;
  title: string;
  targetPlatform: PlatformId;
  targetLengthType: LengthType;
  targetWordCount: number;
  currentWordCount: number;
  genre: string;
  sellingPoint: string;
  updateCadence: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Chapter

```ts
export type ChapterStatus = "outline" | "draft" | "revising" | "final";

export interface Chapter {
  id: string;
  projectId: string;
  volumeId?: string;
  order: number;
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: ChapterStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 Character

```ts
export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "ally"
  | "mentor"
  | "love_interest"
  | "supporting";

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.4 Foreshadow

```ts
export type ForeshadowStatus =
  | "planned"
  | "setup"
  | "payoff_pending"
  | "paid_off"
  | "abandoned";

export interface Foreshadow {
  id: string;
  projectId: string;
  title: string;
  setupChapterId?: string;
  payoffChapterId?: string;
  relatedCharacterIds: string[];
  status: ForeshadowStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.5 PlotThread

```ts
export type PlotThreadType =
  | "main"
  | "branch"
  | "romance"
  | "mystery"
  | "world"
  | "power";

export type PlotThreadStatus =
  | "planned"
  | "active"
  | "resolved"
  | "abandoned";

export interface PlotThread {
  id: string;
  projectId: string;
  type: PlotThreadType;
  title: string;
  startChapterId?: string;
  endChapterId?: string;
  status: PlotThreadStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 4.6 WorldEntry

```ts
export type WorldEntryType =
  | "rule"
  | "level"
  | "skill"
  | "faction"
  | "location"
  | "item"
  | "cost"
  | "note";

export interface WorldEntry {
  id: string;
  projectId: string;
  type: WorldEntryType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.7 ModelProvider

```ts
export type ModelProviderId =
  | "claude"
  | "deepseek"
  | "kimi"
  | "gpt"
  | "openai_compatible"
  | "ollama";

export interface ModelProviderConfig {
  id: string;
  providerId: ModelProviderId;
  displayName: string;
  baseUrl?: string;
  encryptedApiKey?: string;
  defaultModel: string;
  enabled: boolean;
  maxContextTokens?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 4.8 AiTask

```ts
export type AiTaskType =
  | "hook_review"
  | "chapter_review"
  | "arc_review"
  | "foreshadow_review"
  | "platform_adapt"
  | "outline_expand"
  | "synopsis_translate";

export interface AiTask {
  id: string;
  projectId: string;
  chapterId?: string;
  taskType: AiTaskType;
  providerConfigId: string;
  model: string;
  status: "queued" | "running" | "succeeded" | "failed";
  inputSnapshot: string;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 5. Prisma schema 草案

```prisma
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

  chapters     Chapter[]
  characters   Character[]
  worldEntries WorldEntry[]
  foreshadows  Foreshadow[]
  plotThreads  PlotThread[]
  aiTasks      AiTask[]
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

## 6. Model Gateway

### 6.1 统一请求

```ts
export interface GenerateRequest {
  providerConfigId: string;
  providerId: ModelProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  contextPacket?: ProjectContextPacket;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GenerateResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
  };
  raw?: unknown;
}
```

### 6.2 上下文包

```ts
export interface ProjectContextPacket {
  project: {
    title: string;
    targetPlatform: PlatformId;
    targetLengthType: LengthType;
    genre: string;
    sellingPoint: string;
  };
  platformProfile: PlatformProfile;
  chapter?: {
    title: string;
    content: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    cliffhanger: string;
  };
  characters: Array<{
    name: string;
    role: string;
    desire: string;
    need: string;
    flaw: string;
    arcStart: string;
    arcEnd: string;
    voice: string;
  }>;
  foreshadows: Array<{
    title: string;
    status: string;
    notes: string;
  }>;
  worldEntries: Array<{
    type: string;
    title: string;
    content: string;
  }>;
}
```

### 6.3 Provider Adapter

```ts
export interface ModelAdapter {
  generate(request: GenerateRequest): Promise<GenerateResult>;
  stream?(request: GenerateRequest): AsyncIterable<string>;
}
```

MVP 适配策略：

1. GPT 使用 OpenAI Responses 或 Chat Completions 兼容接口。
2. DeepSeek 使用 OpenAI-compatible adapter。
3. Kimi 使用 OpenAI-compatible adapter。
4. Claude 使用 Anthropic adapter。
5. OpenAI-compatible 允许用户自定义 baseUrl。
6. Ollama 先预留类型，P2 再实现。

## 7. AI 任务设计

### 7.1 章节审稿

输入：

1. 项目信息
2. 平台画像
3. 当前章节正文
4. 章节卡
5. 相关人物
6. 相关伏笔

输出 JSON：

```ts
export interface ChapterReviewResult {
  score: number;
  issues: Array<{
    severity: "low" | "medium" | "high";
    type: "hook" | "conflict" | "pacing" | "arc" | "foreshadow" | "platform_fit";
    message: string;
    suggestion: string;
  }>;
  summary: string;
}
```

### 7.2 平台适配

输入：

1. 当前平台
2. 目标平台
3. 章节正文或大纲
4. 平台画像

输出：

```ts
export interface PlatformAdaptResult {
  strategy: string;
  changes: Array<{
    area: string;
    reason: string;
    suggestedText?: string;
  }>;
}
```

### 7.3 改写候选

改写结果必须进入 DraftCandidate，不直接覆盖正文。

```ts
export interface DraftCandidate {
  id: string;
  chapterId: string;
  sourceTaskId: string;
  title: string;
  content: string;
  createdAt: string;
}
```

## 8. API 设计

### 8.1 Projects

```txt
POST /api/projects
GET /api/projects
GET /api/projects/:projectId
PATCH /api/projects/:projectId
DELETE /api/projects/:projectId
```

### 8.2 Chapters

```txt
POST /api/projects/:projectId/chapters
GET /api/projects/:projectId/chapters
GET /api/chapters/:chapterId
PATCH /api/chapters/:chapterId
DELETE /api/chapters/:chapterId
```

### 8.3 Characters

```txt
POST /api/projects/:projectId/characters
GET /api/projects/:projectId/characters
PATCH /api/characters/:characterId
DELETE /api/characters/:characterId
```

### 8.4 World Entries

```txt
POST /api/projects/:projectId/world-entries
GET /api/projects/:projectId/world-entries
PATCH /api/world-entries/:entryId
DELETE /api/world-entries/:entryId
```

### 8.5 Foreshadows

```txt
POST /api/projects/:projectId/foreshadows
GET /api/projects/:projectId/foreshadows
PATCH /api/foreshadows/:foreshadowId
DELETE /api/foreshadows/:foreshadowId
```

### 8.6 Platform Profiles

```txt
GET /api/platforms
GET /api/platforms/:platformId
```

### 8.7 Model Providers

```txt
POST /api/model-providers
GET /api/model-providers
PATCH /api/model-providers/:providerConfigId
DELETE /api/model-providers/:providerConfigId
```

### 8.8 AI Tasks

```txt
POST /api/ai/tasks/hook-review
POST /api/ai/tasks/chapter-review
POST /api/ai/tasks/arc-review
POST /api/ai/tasks/foreshadow-review
POST /api/ai/tasks/platform-adapt
POST /api/ai/tasks/outline-expand
POST /api/ai/tasks/synopsis-translate
```

## 9. 页面设计要点

### 9.1 工作台

不要做大号营销页。登录后第一屏就是作品列表或最近作品。

### 9.2 章节编辑器

三栏布局：

1. 左侧 260px 章节目录。
2. 中间自适应正文编辑器。
3. 右侧 360px 章节卡和 AI 助手。

### 9.3 AI 助手

AI 助手不是聊天主页面，只是任务面板：

1. 选择任务。
2. 选择模型。
3. 点击运行。
4. 查看结果。
5. 应用候选稿或忽略。

## 10. 安全设计

1. API Key 服务端加密保存。
2. 前端永不返回完整 API Key。
3. AI 调用必须记录 taskId。
4. AI 输出不能直接覆盖正文。
5. 删除项目需要二次确认。
6. 导出不包含 API Key、调用日志原始密钥或系统配置。

## 11. 测试策略

单元测试：

1. 字数统计。
2. 平台画像读取。
3. 章节卡校验。
4. Model Gateway provider 选择。
5. AI 任务上下文包构建。

集成测试：

1. 创建作品。
2. 创建章节。
3. 创建人物并绑定章节。
4. 创建伏笔并绑定章节。
5. 运行 mock AI 章节审稿。

端到端测试：

1. 用户创建作品。
2. 用户创建章节并写正文。
3. 用户运行 AI 审稿。
4. 用户应用改写候选。
5. 用户导出 Markdown。

## 12. MVP 开发顺序

### Step 1：项目脚手架

创建 Next.js + TypeScript 应用，配置 Tailwind、Prisma、基础布局。

### Step 2：数据库和基础模型

实现 Project、Chapter、Character、WorldEntry、Foreshadow、PlotThread、ModelProvider、AiTask。

### Step 3：作品和章节

实现作品创建、作品列表、章节列表、章节编辑。

### Step 4：平台画像库

实现 8 个平台的静态规则库，并接入作品创建和章节侧栏。

范围收口：剩余 10 个扩展平台不再添加，不进入当前版本的数据模型、页面入口或发布闭环；平台相关 API 和页面默认只围绕 8 个核心平台验收。

### Step 5：人物、世界观、伏笔

实现传统写作工具核心资料库。

### Step 6：模型设置和 Model Gateway

实现模型配置和 mock adapter，再接真实 Claude / OpenAI-compatible。

### Step 7：AI 章节审稿

实现第一个 AI 任务：章节审稿。先用 mock 测试，再接真实模型。

### Step 8：导出

实现 Markdown 导出，docx 放到 P1。

## 13. 开发红线

1. 不能把主界面做成聊天框。
2. 不能让 AI 自动覆盖正文。
3. 不能把平台画像写死在 prompt 字符串里，必须结构化。
4. 不能把 API Key 放到浏览器。
5. 不能第一版就做复杂 agent 编排。
6. 不能没有传统写作功能就宣传 AI 写作平台。
