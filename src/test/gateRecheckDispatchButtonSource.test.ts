import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/gate/GateRecheckDispatchButton.tsx", "utf8");

test("gate recheck dispatch button jumps to the created dispatch card", () => {
  assert.ok(source.includes("useRouter"));
  assert.ok(source.includes("const router = useRouter();"));
  assert.ok(source.includes("router.push(dispatchHref);"));
  assert.ok(source.includes("`/dispatch#dispatch-${dispatch.id}`"));
});
