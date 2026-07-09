import assert from "node:assert/strict";
import test from "node:test";
import { firstInvalidProjectField, focusFirstInvalidProjectControl } from "./ProjectForm";

test("selects title as the first invalid required project field", () => {
  assert.equal(firstInvalidProjectField({ title: "", genre: "" }), "title");
});

test("focuses only the form's first invalid control", () => {
  let titleFocusCount = 0;
  let genreFocusCount = 0;
  const title = { focus: () => { titleFocusCount += 1; } };
  const genre = { focus: () => { genreFocusCount += 1; } };
  let selector = "";
  const form = {
    querySelector: (value: string) => {
      selector = value;
      return value === ":invalid" ? title : genre;
    },
  } as unknown as HTMLFormElement;

  assert.equal(focusFirstInvalidProjectControl(form, title as unknown as EventTarget), title);
  assert.equal(focusFirstInvalidProjectControl(form, genre as unknown as EventTarget), title);
  assert.equal(selector, ":invalid");
  assert.equal(titleFocusCount, 1);
  assert.equal(genreFocusCount, 0);
});
