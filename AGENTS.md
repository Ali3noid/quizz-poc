# AGENTS.md

Guidance for AI agents working in this repository.

# Karpathy behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Project Overview

This is a SvelteKit quiz proof of concept using Svelte 5 runes, TypeScript, Tailwind CSS, Vite, and Supabase.

Key entry points:

- `src/routes/+page.svelte`: main gate, authentication, quiz, hints, and answer UI.
- `src/routes/+page.server.ts`: server loader that exposes only safe riddle fields to the client.
- `src/routes/ranking/`: ranking pages and server-side ranking data loading.
- `src/hooks.server.ts`: reads auth cookies into `event.locals`.
- `src/routes/api/**/+server.ts`: server-only API endpoints.
- `src/lib/server/riddle.ts`: server-only riddle data, including answers and hints.
- `src/lib/server/auth.ts`: password hashing and verification helpers.
- `src/lib/types/database.ts`: Supabase database types.

# Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Type and Svelte check: `npm run check`

Run `npm run check` after changing TypeScript or Svelte code.

There are currently no automated tests such as Vitest or Playwright. After making changes, agents must perform thorough manual verification of the affected user flows, including gate access, authentication, quiz submission, hints, and ranking behavior when relevant.

# Svelte and TypeScript Conventions

- Use Svelte 5 runes. The Vite config forces runes mode for project files.
- Use `$state`, `$derived`, `$effect`, and `$props`.
- Do not use Svelte 4 component patterns such as `export let`, `$:`, `on:click`, or `on:submit`.
- Prefer generated SvelteKit types from `./$types` for loaders and endpoints.
- Keep props, API payloads, and database payloads explicitly typed.
- Avoid `any` unless there is a concrete reason and the boundary is documented.

# Security Boundaries

- Never import `src/lib/server/*` into client-side Svelte components.
- `src/lib/server/riddle.ts` contains secret answers. Expose only safe fields through server loaders or API endpoints.
- Validate `GATE_PASSWORD` only server-side.
- Keep Supabase service-role usage server-only in `+server.ts`, `+page.server.ts`, hooks, or files under `src/lib/server`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, riddle answers, or password hashes to the browser.
- Auth cookies should remain HttpOnly where possible, SameSite strict/lax as appropriate, and scoped deliberately.

# Environment

- `empty.env` is a committed placeholder template for other developers.
- To set up a local environment, copy `empty.env` to `.env.local` and fill in real values.
- `.env.local` contains sensitive local configuration and must not be committed.

Server-only values include:

- `GATE_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

# Styling

- Tailwind CSS is configured with `tailwind.config.js` and `postcss.config.js`.
- Global CSS lives in `src/app.css`.
- Prefer local utility classes in Svelte components unless a global rule is truly shared.
- Keep UI changes consistent with the existing single-page quiz flow.

# API and Data Handling

- Wrap external calls and database writes in `try/catch`.
- Return clear HTTP status codes from API routes: `400` for bad input, `401` for unauthorized, `404` for missing records, and `500` for unexpected failures.
- Keep client responses minimal and avoid returning internal error details.
- Use SvelteKit primitives (`cookies`, `json`, `error`, server loaders, normal `fetch`) before adding dependencies.

# Git and Generated Files

- Do not edit `node_modules`, `.svelte-kit`, or build output.
- Treat `.env.local` as local-only and secret-bearing.
- Keep `.env.local` ignored by git. Do not add exceptions that allow it to be committed.
- Preserve unrelated user changes in the working tree.
