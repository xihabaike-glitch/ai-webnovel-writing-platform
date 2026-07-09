# Final Delivery Platform Tactic Archive Design

## 1. Context

The product already has a final delivery formal release card, a real pipeline final review, platform tactic experience history, and a project creation form that can read archived platform experience. The missing product loop is the PM-hard evidence step after final release: a released project should become a reusable platform tactic card for the next book.

This design implements option A: platform tactic archive cards. The goal is to make final delivery feed the next opening workflow instead of ending as a static audit card.

## 2. PM Rule

Final delivery is not the finish line. It is soil for the next book.

After a project is formally releasable, the product must produce a platform tactic archive card with evidence, reuse advice, and stop lines. A later project can use this card to choose platform, template, opening hook, first-three-chapter rhythm, and risk boundary.

No card may claim success without traceable final delivery evidence.

## 3. Scope

In scope:

- Build a reusable platform tactic archive summary from final delivery candidates.
- Show the archive card in the gate final delivery area after the formal release card.
- Link the archive card into the existing project creation experience launch path.
- Preserve existing platform experience library behavior and add final delivery as a stronger evidence source.
- Add tests that prove the card requires final delivery evidence and can seed next-book opening decisions.

Out of scope:

- New database tables.
- A new standalone archive page.
- Automatic creation of a new project.
- LLM-generated strategy summaries.
- Adding the paused ten platforms.

## 4. User Experience

### Gate

When the final delivery release has at least one candidate project, the gate shows a "平台打法归档卡" panel.

The panel displays:

- Platform name and project title.
- Archive status: reusable, needs evidence, or blocked.
- Reuse action: "用这条打法开新书".
- Evidence lines: final delivery receipt count, real final review outcome, publish package status, platform effect or recovery evidence.
- Reuse playbook: opening hook, first-three-chapter promise, packaging tactic, verification action, stop line.

If evidence is incomplete, the panel does not offer reuse. It points back to the missing final delivery receipt or gate repair action.

### Project Creation

The existing project form already reads platform experience and has an experience launch path. The archive card should link into that path with platform and tactic parameters, so a new book can start with this tactic selected.

The project form should show that the selected opening plan came from a final delivery archive, not only from generic platform template history.

## 5. Data Model

Use a derived view object first. Do not add persistence until the product proves the loop is useful.

Proposed type:

```ts
interface FinalDeliveryPlatformTacticArchiveCard {
  status: "reusable" | "needs_evidence" | "blocked";
  projectId: string;
  projectTitle: string;
  platformId: string;
  platformName: string;
  tactic: string;
  label: string;
  detail: string;
  evidence: string[];
  openingHook: string;
  firstThreePromise: string;
  packagingTactic: string;
  verificationAction: string;
  stopLine: string;
  reuseHref: string;
  repairHref: string;
}
```

The card is derived from:

- `PrePublishGateProjectStatus`.
- Final delivery gate receipt counts.
- Real pipeline final review outcome.
- Platform effect review and loop timeline.
- Existing project start tactic helpers where possible.

## 6. Data Flow

1. `buildPrePublishGate` computes project statuses and final delivery release.
2. A new helper builds archive cards from releasable projects.
3. The helper only marks a card reusable when:
   - project is ready,
   - final delivery gate has all six receipt items closed,
   - real pipeline final review is pass,
   - platform and project links are available.
4. Gate page renders the cards under the formal release panel.
5. The card reuse link opens `/projects` with launch parameters that the current project form can consume.
6. Project creation turns the selected archived tactic into opening soil and first-day handoff as it already does for platform experience.

## 7. Error Handling And Stop Lines

- If no final delivery candidates exist, show no archive card.
- If a candidate lacks final delivery receipts, show "needs_evidence" and link to the final delivery repair action.
- If final review is repair or hold batch, show "blocked" and link to the gate final review action.
- If platform effect data is weak, card can still be reusable only as a small-sample tactic, never as scale-up proof.
- If the launch parameters do not match any current experience item, the project form falls back to the platform template and says the exact archive sample was not loaded.

## 8. Testing

Add focused tests for:

- A ready final delivery candidate produces a reusable platform tactic archive card.
- A candidate missing final delivery receipts does not produce a reusable card.
- A hold-batch final review blocks reuse.
- The gate page renders the archive card and the "用这条打法开新书" link.
- The project form/source keeps the final delivery archive launch path visible.

Existing full verification remains:

- `npm test`
- `npm run build`

## 9. Implementation Boundaries

Primary files expected to change:

- `src/lib/projects/prePublishGate.ts`
- `src/app/gate/page.tsx`
- `src/test/prePublishGate.test.ts`
- `src/test/gatePageSource.test.ts`
- `src/components/projects/ProjectForm.tsx` for final-delivery-specific launch copy only; do not change creation behavior beyond existing launch parameters.

The implementation should avoid changing persistence, schemas, or platform count. It should reuse the current platform tactic experience path instead of creating a parallel archive system.

## 10. Acceptance Criteria

The feature is accepted when:

- A formally releasable project shows a platform tactic archive card in the gate.
- The card includes evidence, reuse playbook, and stop line.
- The card can send the author to create a new project with the archived tactic selected.
- Incomplete final delivery evidence blocks reuse.
- Tests cover reusable, incomplete, and blocked states.
- Full tests and build pass.
