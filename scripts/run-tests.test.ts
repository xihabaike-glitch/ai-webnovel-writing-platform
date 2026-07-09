import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { dirname, join, relative } from "node:path";
import {
  discoverTestFiles,
  runTestFiles,
  testCommandArgs,
} from "./run-tests.mjs";

test("test runner discovers tracked and untracked TypeScript tests recursively", async () => {
  const cwd = process.cwd();
  const temporaryRoot = await mkdtemp(join(cwd, "src/run-tests-discovery-"));
  const temporaryTest = join(temporaryRoot, "nested", "untracked.test.ts");
  const excludedTests = [
    "node_modules/ignored.test.ts",
    ".next/ignored.test.ts",
    ".git/ignored.test.ts",
    "generated/ignored.test.ts",
    "temp/ignored.test.ts",
  ].map((path) => join(temporaryRoot, path));

  try {
    await mkdir(join(temporaryRoot, "nested"));
    await writeFile(temporaryTest, 'import { test } from "node:test"; test("temporary", () => {});');
    await Promise.all(
      excludedTests.map(async (file) => {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, 'import { test } from "node:test"; test("ignored", () => {});');
      }),
    );

    const files = discoverTestFiles({ cwd });

    assert.equal(files.includes("scripts/run-tests.test.ts"), true);
    assert.equal(files.includes(relative(cwd, temporaryTest)), true);
    for (const file of excludedTests) {
      assert.equal(files.includes(relative(cwd, file)), false);
    }
    assert.deepEqual(files, [...files].sort());
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("test runner passes filenames with spaces as individual Node arguments", () => {
  const files = ["scripts/a test.test.ts", "src/features/b test.test.ts"];
  assert.deepEqual(testCommandArgs(files), [
    "--import",
    "tsx",
    "--import",
    "./scripts/register-test-loader.mjs",
    "--test",
    "scripts/a test.test.ts",
    "src/features/b test.test.ts",
  ]);

  const calls: Array<{ command: string; args: string[]; options: { shell?: boolean } }> = [];
  const status = runTestFiles(files, {
    runNode(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.args, testCommandArgs(files));
  assert.equal(calls[0]?.options.shell, false);
});

test("test runner succeeds without invoking Node when no tests are tracked", () => {
  let called = false;
  const status = runTestFiles([], {
    runNode() {
      called = true;
      return { status: 1 };
    },
  });

  assert.equal(status, 0);
  assert.equal(called, false);
});
