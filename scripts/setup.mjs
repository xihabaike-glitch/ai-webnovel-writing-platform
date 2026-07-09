import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureEnv() {
  if (existsSync(".env")) {
    console.log("已找到 .env");
    return;
  }

  copyFileSync(".env.example", ".env");
  console.log("已从 .env.example 创建 .env");
}

function ensureDependencies() {
  if (existsSync("node_modules")) {
    console.log("已找到 node_modules");
    return;
  }

  console.log("正在安装依赖，这一步可能需要几分钟...");
  run(npmCommand, ["install"]);
}

function ensureNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (major >= 20) return;

  console.error("当前 Node.js 版本过低。请安装 Node.js 22 LTS 后重试。");
  process.exit(1);
}

ensureNodeVersion();
ensureEnv();
ensureDependencies();

console.log("正在初始化本地数据库和演示数据...");
run(npmCommand, ["run", "db:seed"]);

console.log("\n准备完成。下一步运行：");
console.log("npm run local:start");
