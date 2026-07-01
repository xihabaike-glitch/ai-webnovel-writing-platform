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

    if (request.systemPrompt.includes("网文改稿写手")) {
      const titleMatch = request.userPrompt.match(/章节：第 \d+ 章 (.+)/);
      const roleMatch = request.userPrompt.match(/章节职责：(.+)/);
      const targetMatch = request.userPrompt.match(/改稿目标：(.+)/);
      const coldOpenMatch = request.userPrompt.match(/冷开场：(.+)/);
      const endingMatch = request.userPrompt.match(/章末处理：(.+)/);
      const title = titleMatch?.[1]?.trim() || "改写章节";
      const role = roleMatch?.[1]?.trim() || "用强钩子推动主线";
      const target = targetMatch?.[1]?.trim() || "让本章形成清晰追读";
      const coldOpen = coldOpenMatch?.[1]?.trim() || "危险在第一段出现";
      const ending = endingMatch?.[1]?.trim() || "章末抛出新的主线问题";
      const text = [
        `${coldOpen}`,
        "",
        `林晚没有时间把恐惧想明白。雨声压着窗沿，系统面板却在她眼前亮得刺眼，像一只不肯闭上的眼睛。她知道这一章的核心不是解释世界，而是完成“${role}”。读者必须在第一屏就看见问题，也必须在这一屏明白，退后一步会付出更大的代价。`,
        "",
        `所以她往前走。门后的声音越来越急，走廊另一头的脚步声却越来越近。目标也被系统推到她眼前：${target}。这不是温吞的选择题，而是把她逼到墙角的生死题。救人，她会暴露自己；逃跑，她会丢掉唯一能翻盘的线索。`,
        "",
        "她把手按上门把，指尖冰得发麻。下一秒，系统弹出奖励栏，给出的却不是安慰，而是一把更锋利的刀。新手技能、记忆惩罚、未知标记，每一个词都像钉子，把她钉在这个雨夜里。她终于明白，所谓开局不是得到金手指，而是被金手指推上牌桌。",
        "",
        `门开了。${title}真正开始的瞬间，她听见里面的人低声说出一个不该知道的名字。${ending}`,
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

    if (request.systemPrompt.includes("网文二改写手")) {
      const titleMatch = request.userPrompt.match(/章节标题：(.+)/);
      const modeMatch = request.userPrompt.match(/二改方向：(.+)/);
      const instructionMatch = request.userPrompt.match(/作者指令：(.+)/);
      const hookMatch = request.userPrompt.match(/开头钩子：(.+)/);
      const conflictMatch = request.userPrompt.match(/冲突：(.+)/);
      const cliffhangerMatch = request.userPrompt.match(/章末悬念：(.+)/);
      const title = titleMatch?.[1]?.trim() || "这一章";
      const mode = modeMatch?.[1]?.trim() || "强化追读";
      const instruction = instructionMatch?.[1]?.trim() || "节奏更快，冲突更清楚";
      const hook = hookMatch?.[1]?.trim() || "危险在第一段出现";
      const conflict = conflictMatch?.[1]?.trim() || "主角必须立刻做选择";
      const cliffhanger = cliffhangerMatch?.[1]?.trim() || "新的问题在章末出现";
      const text = [
        `${hook}。`,
        "",
        `林晚猛地抬头，雨声像被人一把推到耳边，系统提示却比雨更冷。${title}到了这一步，已经不能再慢慢解释。她要按新的二改方向处理：${mode}。更直接地说，作者要的是：${instruction}。`,
        "",
        `门后的求救声短促地断了一下，像有人捂住了那人的嘴。走廊尽头的脚步声逼近，手机屏幕上的倒计时只剩个位数。${conflict}。她如果退，今晚所有线索都会断；她如果进，就等于承认自己已经被卷进这套规则。`,
        "",
        "系统奖励栏忽然刷新，冷白色的字一行行跳出来。新手技能、临时保护、记忆惩罚，全都不是安慰，而是把她推上去的筹码。林晚终于明白，所谓选择从来不是给她自由，而是逼她用最痛的方式证明自己有资格活下去。",
        "",
        `她按下门把。门开的瞬间，屋里的人抬起头，第一句话就把她钉在原地：${cliffhanger}`,
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
