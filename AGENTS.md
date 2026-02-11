# AGENTS.md

## Scope

- Applies to the whole repository.

## Stack

- React + TypeScript + Vite (`rolldown-vite`).

## Core Commands

- `npm run dev` - run local dev server.
- `npm run format` - format code (`oxfmt`).
- `npm run lint` - type-aware linting (`oxlint --type-aware .`).
- `npm run build` - TypeScript project build (`tsc -b`) + production bundle.

## Coding Standards

- Use modern TypeScript and strict typing; avoid `any` and unsafe assertions.
- Follow existing patterns and keep changes focused/minimal.
- Use conventional commits (`feat:`, `fix:`, `chore:`, ...).

## Agent Workflow (Important)

- During normal agentic code-modification work, run continuous checks:
  - lint frequently while iterating (`npm run lint`)
  - typecheck/build before finishing (`npm run build`)
- Fix issues as they appear; do not defer validation to the end.
