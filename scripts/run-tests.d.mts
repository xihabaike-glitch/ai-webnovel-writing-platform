export interface CommandResult {
  status: number | null;
  stdout?: string | Buffer | null;
}

export interface NodeCommandOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdio: "inherit";
}

export type NodeCommand = (
  command: string,
  args: string[],
  options: NodeCommandOptions,
) => CommandResult;

export function trackedTestFiles(paths: string[]): string[];
export function discoverTestFiles(options?: {
  cwd?: string;
}): string[];
export function testCommandArgs(files: string[]): string[];
export function runTestFiles(files: string[], options?: {
  cwd?: string;
  runNode?: NodeCommand;
}): number;
