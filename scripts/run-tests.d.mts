export interface CommandResult {
  status: number | null;
  stdout?: string | Buffer | null;
}

export interface GitCommandOptions {
  cwd: string;
  encoding: "buffer";
  shell: false;
}

export interface NodeCommandOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdio: "inherit";
}

export type GitCommand = (
  command: string,
  args: string[],
  options: GitCommandOptions,
) => CommandResult;

export type NodeCommand = (
  command: string,
  args: string[],
  options: NodeCommandOptions,
) => CommandResult;

export function trackedTestFiles(paths: string[]): string[];
export function discoverTestFiles(options?: {
  cwd?: string;
  runGit?: GitCommand;
}): string[];
export function testCommandArgs(files: string[]): string[];
export function runTestFiles(files: string[], options?: {
  cwd?: string;
  runNode?: NodeCommand;
}): number;
