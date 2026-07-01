import type { GenerateRequest, GenerateResult, ModelAdapter } from "./types.ts";

export class MockAdapter implements ModelAdapter {
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    if (request.systemPrompt.includes("投稿包装编辑")) {
      const platformMatch = request.userPrompt.match(/目标平台：(.+)/);
      const loglineMatch = request.userPrompt.match(/原一句话卖点：(.+)/);
      const platform = platformMatch?.[1]?.trim() || "目标平台";
      const rawLogline = loglineMatch?.[1]?.trim() || "主角在危机中觉醒能力并连续翻盘";
      const logline = rawLogline.replace(/[。！？!?.,，、；;：:]+$/u, "");
      const text = JSON.stringify(
        {
          logline: `${logline}，开局即进入高压选择。`,
          synopsis: `为适配${platform}，简介强化开局危机、连续冲突和章末追读期待：${logline}。主角在雨夜危机中被迫行动，每一次选择都带来新的代价和更大的反转。`,
          overseasSynopsis: `Positioned for ${platform}, this version highlights the immediate hook, progression promise, and chapter-end tension. ${logline}`,
          tags: ["强钩子", "系统流", "逆袭", "高压选择", "章末悬念"],
          rationale: ["强化第一眼钩子", "突出平台追读重点", "减少泛泛设定描述"],
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

    if (request.systemPrompt.includes("正文初稿")) {
      const titleMatch = request.userPrompt.match(/章节标题：(.+)/);
      const goalMatch = request.userPrompt.match(/章节目标：(.+)/);
      const hookMatch = request.userPrompt.match(/开头钩子：(.+)/);
      const conflictMatch = request.userPrompt.match(/冲突：(.+)/);
      const cliffhangerMatch = request.userPrompt.match(/章末悬念：(.+)/);
      const title = titleMatch?.[1]?.trim() || "这一章";
      const goal = goalMatch?.[1]?.trim() || "推动主线前进";
      const hook = hookMatch?.[1]?.trim() || "危险在开场出现";
      const conflict = conflictMatch?.[1]?.trim() || "主角必须立刻做选择";
      const cliffhanger = cliffhangerMatch?.[1]?.trim() || "新的问题在章末出现";
      const text = [
        `${hook}。`,
        "",
        `林晚站在雨声里，第一次意识到“${title}”不是一句写在大纲里的提示，而是已经砸到眼前的现实。她原本以为自己还有时间整理线索，可系统音再次响起，冷冰冰地把所有退路封死。`,
        "",
        `这一章的目标很清楚：${goal}。可真正难的是，${conflict}。她不能假装没看见，也不能把选择推给别人。门外的脚步声越来越近，手机屏幕上的倒计时一秒一秒减少，所有细碎的侥幸都被逼成了一个问题：现在动手，还是等着局面彻底失控？`,
        "",
        "她深吸一口气，把恐惧压进喉咙里。系统给出的奖励很诱人，惩罚却更像一把贴在背后的刀。林晚知道自己还不够强，可她更清楚，如果这一刻退了，后面所有所谓翻盘都只会变成自欺欺人。",
        "",
        `就在她做出选择的瞬间，门锁咔哒一声开了。章末必须留下的问题也随之落下：${cliffhanger}`,
      ].join("\n");

      return {
        text,
        usage: {
          inputTokens: request.systemPrompt.length + request.userPrompt.length,
          outputTokens: text.length,
          costUsd: 0,
        },
      };
    }

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
