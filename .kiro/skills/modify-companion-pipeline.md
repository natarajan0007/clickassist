# Skill: Modify the Companion Pipeline

The CompanionManager in `src/main/companion.ts` is the central orchestrator. When modifying the query pipeline:

## Key Flow
```
processQuery(transcript) →
  1. captureAllScreens()
  2. OmniParser.parse(screenshot)     ← parallel
  3. UIA.enumerate()                  ← parallel
  4. ElementMerger.merge(omni, uia)
  5. AI.query({ transcript, screenshots, elements, history })
  6. parsePointTags(response) + parseElementTags(response)
  7. overlay.send(pointerCoords)
  8. TTS.speak(cleanText)
```

## Rules
- Steps 1-3 should run in parallel (`Promise.all`) for latency.
- Element merger runs after both OmniParser and UIA complete.
- AI prompt must include the unified element list as structured text.
- Response parsing must handle both POINT and ELEMENT tags.
- TTS is non-blocking (fire and forget with error catch).
- Always trim conversation history to MAX_CONVERSATION_HISTORY * 2 entries.

## Files to touch
- `src/main/companion.ts` — the orchestrator
- `src/services/*/interface.ts` — provider interfaces
- `src/services/claude.ts` / `openai-chat.ts` / `openrouter-chat.ts` — system prompts
- `src/renderer/overlay/index.html` — pointer rendering
