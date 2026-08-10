# Repository Guidelines

## Project Structure & Module Organization

This npm-workspaces monorepo separates extraction from network execution.

- `packages/core/src/`: `html-article-extractor` TypeScript source. `index.ts` preserves the synchronous `getArticle(dom) -> {html, text}` CommonJS API; `extractors/` contains Readability and heuristic strategies; `utils/` contains DOM helpers.
- `packages/core/test/`: core tests and synthetic HTML fixtures.
- `packages/cli/src/`: fetch, decoding, argument parsing, and the executable entry point for `@html-article-extractor/cli`.
- `packages/cli/test/`: CLI tests with injected fetch responses.
- `docs/`: architecture and algorithm research decisions.

Generated `dist/`, coverage files, secrets, and `node_modules/` must not be committed.

## Build, Test, and Development Commands

```bash
npm install          # Install and link all workspaces
npm run build        # Compile both packages and declarations
npm test             # Run core and CLI node:test suites
npm run lint         # Check TypeScript with ESLint
npm run typecheck    # Validate project references in strict mode
npm run validate     # Run lint, typecheck, and all tests
```

Use `node packages/cli/dist/bin.js --help` after building to inspect the executable locally.

## Coding Style & Naming Conventions

Use TypeScript, 4-space indentation, single quotes, and no semicolons. Name functions and variables in camelCase, types in PascalCase, and tests `*.test.ts`. Keep core independent of jsdom and network APIs. Do not suppress ESLint rules. Preserve `export = getArticle` and the `{html, text}` return contract.

## Testing Guidelines

Tests use `node:test`, strict assertions, jsdom, and the `tsx` loader. Add a minimal synthetic fixture for extraction regressions. Cover content recall, boilerplate rejection, Korean and English text, DOM immutability, and scoped Element inputs. Run `npm run validate` before committing.

## Commit & Pull Request Guidelines

History uses short imperative subjects such as `Add advantage tag list`. Keep commits focused. PRs should explain the failure mode, algorithm impact, tests run, and linked issue. Include terminal output examples when CLI behavior changes; screenshots are unnecessary for this non-visual project.

## Security

Readability output is not sanitized HTML. Document sanitizer requirements for browser rendering, never enable jsdom script execution for untrusted input, and never commit `.env` or credential files.
