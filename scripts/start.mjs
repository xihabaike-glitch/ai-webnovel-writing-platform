import { existsSync } from "node:fs";
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

if (!existsSync(".env") || !existsSync("node_modules")) {
  console.log("首次启动需要先准备环境...");
  run(npmCommand, ["run", "setup"]);
}

console.log("正在同步本地数据库结构...");
run(npmCommand, ["run", "db:init"]);

if (!existsSync(".next")) {
  console.log("正在构建应用...");
  run(npmCommand, ["run", "build"]);
}

console.log("启动完成后打开：http://localhost:3000");
run(npmCommand, ["run", "start"]);
