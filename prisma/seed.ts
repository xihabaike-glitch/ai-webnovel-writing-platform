import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: "demo-project" },
    create: {
      id: "demo-project",
      title: "示例作品：夜雨系统",
      targetPlatform: "fanqie",
      targetLengthType: "long_300k_plus",
      targetWordCount: 300000,
      genre: "都市系统",
      sellingPoint: "雨夜危机中觉醒系统，主角用一次次选择翻盘。",
      updateCadence: "daily_4000",
      chapters: {
        create: {
          id: "demo-chapter",
          order: 1,
          title: "第一章 雨夜系统",
          content: "林晚推开门，系统提示音在雨夜响起。",
          wordCount: 18,
          goal: "让主角遭遇不可逆事件。",
          hook: "雨夜、系统、门后未知风险。",
          conflict: "主角必须在危险和逃避之间选择。",
          valueShift: "普通生活转向失控危机。",
          cliffhanger: "系统给出第一个选择。",
        },
      },
    },
    update: {},
  });

  console.log(`Seeded ${project.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

