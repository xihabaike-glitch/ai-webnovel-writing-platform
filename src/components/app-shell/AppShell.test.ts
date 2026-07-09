import assert from "node:assert/strict";
import test from "node:test";
import { navigationLinkState } from "./AppShell";

test("marks a navigation route and its descendants as current", () => {
  assert.deepEqual(navigationLinkState("/projects", "/projects"), {
    ariaCurrent: "page",
    className: "font-medium text-slate-950 underline underline-offset-4",
  });
  assert.deepEqual(navigationLinkState("/projects/project-1", "/projects"), {
    ariaCurrent: "page",
    className: "font-medium text-slate-950 underline underline-offset-4",
  });
  assert.deepEqual(navigationLinkState("/tasks/task-1", "/tasks"), {
    ariaCurrent: "page",
    className: "font-medium text-slate-950 underline underline-offset-4",
  });
});
