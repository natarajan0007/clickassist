---
inclusion: always
---

# ClickAssist — Coding Standards

## TypeScript
- Strict mode enabled. No `any` types unless interfacing with external APIs.
- Use interfaces over types for object shapes.
- All service classes follow the provider pattern with a factory function.
- Async/await over raw promises. Handle errors with try/catch.

## File Organization
- One class per file. File name matches the class/module purpose.
- Services use `interface.ts` for the provider interface + factory, separate files per implementation.
- Keep renderer HTML self-contained (inline CSS + JS, no build step for renderer).

## Electron Security
- `contextIsolation: true` and `nodeIntegration: false` on all windows.
- All main↔renderer communication via `contextBridge` + `ipcRenderer.invoke`.
- Never expose Node.js APIs directly to renderer.
- Validate all IPC inputs in main process handlers.

## Error Handling
- Services should throw descriptive errors with API status codes.
- Non-critical failures (TTS, overlay) should log warnings and continue.
- Never crash the app on a service failure — degrade gracefully.

## Naming
- Classes: PascalCase (`CompanionManager`, `OmniParserProvider`)
- Functions/methods: camelCase (`processQuery`, `captureAllScreens`)
- Constants: UPPER_SNAKE_CASE (`MAX_CONVERSATION_HISTORY`)
- Files: kebab-case (`element-merger.ts`, `gemini-live.ts`)
- IPC channels: colon-separated (`chat:query`, `audio:recording-complete`)
