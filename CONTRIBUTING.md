# Contributing

Thanks for helping build AI Webnovel Writing Platform.

This project welcomes both code and non-code contributions. 网文作者、编辑、提示词玩家、平台研究者和开发者都可以参与。

## Good Contributions

- Platform rules backed by examples.
- Writing workflow feedback from real samples.
- First-chapter hook breakdowns.
- AI editorial role prompts.
- Failure retrospectives.
- Documentation fixes.
- Bug fixes and focused product improvements.

## Before You Open an Issue

Please include the user type, target platform, current workflow step, expected result, actual result, and evidence.

## Before You Open a Pull Request

- Keep changes focused.
- Explain user value.
- Do not add new platforms without discussion.
- Do not let AI overwrite accepted manuscript content.
- Run the build check before submitting.

## Local Checks

```bash
npm run check
```

`npm run check` generates and validates Prisma, runs lint and all TypeScript tests, then builds the production application. Prisma validation supplies a local SQLite URL when `DATABASE_URL` and `.env` are absent, so this command works in a clean clone after `npm install`.

The test suite includes real fresh-database and legacy-baseline SQLite migration rehearsals. With Docker installed, also verify the Compose environment handoff:

```bash
npm run test:compose-config
```
