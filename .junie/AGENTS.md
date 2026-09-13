Markdown# System Instructions for AI Agents (Quiz PoC)

You are an AI assistant working on the "Quiz PoC" project. Read these rules carefully before writing or modifying any code.

## 1. Tech Stack
- **Framework:** SvelteKit 2.x
- **UI Engine:** Svelte 5 (Strictly **Runes** mode)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Language:** TypeScript (Strict mode)
- **Backend / DB:** Supabase (`@supabase/supabase-js`, PostgreSQL)
- **Bundler:** Vite 8.x

## 2. Project Structure & File Roles
```text
quiz-poc/
├── src/
│   ├── app.d.ts                 # Global TS types (e.g., App.Locals)
│   ├── app.css                  # Tailwind v4 entry (@import "tailwindcss";)
│   ├── hooks.server.ts          # Server hook (validates 'gate_access' cookie, sets locals)
│   ├── lib/
│   │   ├── index.ts             # Public exports
│   │   └── server/
│   │       └── riddle.ts        # SECRET riddle data (questions, answers, hints)
│   └── routes/
│       ├── +layout.svelte       # Global layout
│       ├── +page.server.ts      # SSR loader (returns auth status & safe riddle data)
│       ├── +page.svelte         # Main UI (Gate + Quiz)
│       └── api/
│           ├── gate/+server.ts  # Gatekeeper auth endpoint (sets HttpOnly cookie)
│           ├── hint/+server.ts  # Endpoint for safely delivering hints
│           └── submit/+server.ts# Verifies answers, saves submissions to Supabase
├── .env.local                   # Local env variables
└── package.json
```
## 3. Critical Security & Data Boundaries (NEVER VIOLATE)
1. **Riddle Secrets Isolation:** `src/lib/server/riddle.ts` contains correct answers. **NEVER** import from `src/lib/server/*` into client components (`*.svelte`). Only expose safe fields (id, question, images) via `+page.server.ts` or API endpoints.
2. **Gatekeeper Auth:** `GATE_PASSWORD` must only be validated server-side (`/api/gate`). On success, set a `gate_access=granted` cookie (HttpOnly, SameSite=Strict, Path=/).
3. **Supabase Privileges:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS). It MUST ONLY be used server-side (`+server.ts` or `+page.server.ts`). NEVER expose it to the client.

## 4. Svelte 5 & TypeScript Coding Standards
### Svelte 5 (Runes Mode)
- **NO Svelte 4 Syntax:** NEVER use `export let`, reactive declarations (`$:`), or classical reactivity.
- **State Management:**
    - Local state: `let foo = $state(initialValue);`
    - Derived values: `let doubled = $derived(foo * 2);`
    - Side effects: `$effect(() => { ... });`
    - Props: `let { data, prop1 } = $props<{ data: PageData; prop1?: string }>();`
- **Event Handling:** Use modern DOM events: `onclick={...}`, `onsubmit={...}`. **DO NOT** use `on:click` or `on:submit`.
- **Bindings:** Use `bind:value={...}` and `bind:this={...}` standard syntax.

### TypeScript & Styling
- **Types:** Always define explicit types for props, loaders, API responses, and DB payloads. Avoid `any`. Use generated SvelteKit types (`PageServerLoad`, `./$types`).
- **Tailwind CSS v4:** Use utility classes directly in `.svelte`. There is NO `tailwind.config.js`. Global config belongs in `src/app.css`.

## 5. Environment Variables
| Variable | Purpose | Scope |
| :--- | :--- | :--- |
| `GATE_PASSWORD` | Password for the quiz gatekeeper | Server-only (`$env/dynamic/private`) |
| `SUPABASE_URL` | Supabase instance URL | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | Server-only |

## 6. Agent Workflow & Verification
1. **Always Verify Types:** After modifying TS/Svelte code, you MUST run `npm run check` (runs `svelte-kit sync` & `svelte-check`). Fix all type errors before completing the task.
2. **Error Handling:** Wrap API and DB calls in `try/catch`. Return appropriate HTTP status codes (400, 401, 404, 500) and clear error messages.
3. **Keep it Native:** Rely on SvelteKit built-ins (Form Actions, standard `fetch`, `cookies`, `invalidateAll`) rather than introducing third-party libraries unnecessarily.