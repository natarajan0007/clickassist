---
inclusion: always
---

# ClickAssist — Project Context

## What is this project?
ClickAssist is an AI-driven real-time accessibility co-pilot for Windows. It sees the user's screen, hears their voice, and visually guides them through any application step-by-step using an animated cursor overlay.

## Tech Stack
- Runtime: Electron 33+ with TypeScript
- AI Engine: Google Gemini Live API (streaming multimodal)
- Screen Parsing: Microsoft OmniParser V2 (vision-based UI element detection)
- Accessibility: Windows UI Automation COM API
- Transcription: OpenAI Whisper / local Whisper
- TTS: ElevenLabs / OpenAI TTS / Windows SAPI
- Packaging: Electron Forge → MSI/MSIX

## Architecture
- `src/main/` — Electron main process (companion orchestrator, screen capture, hotkeys, audio, settings, tray)
- `src/services/` — AI services (claude, openai, openrouter, gemini-live), OmniParser, UIA, transcription, TTS
- `src/preload/` — Context bridge exposing `window.clicky` API to renderers
- `src/renderer/` — Chat window, overlay window, settings window (plain HTML + inline JS)

## Key Design Decisions
- OmniParser V2 is the primary screen parser (pure vision, works on any app). UIA is enrichment/fallback.
- Element Merger combines OmniParser + UIA via IoU-based matching.
- AI uses [ELEMENT:name:role:screenN] tags for robust pointing, [POINT:x,y:label:screenN] as fallback.
- HIPAA mode forces all processing local except the AI inference API call.
- System tray app pattern — stays running when windows close.

## Build & Run
```bash
cd clickassist
npm install
npm run dev        # electron-forge start
npm run typecheck  # tsc --noEmit
npm run build      # tsc + electron-forge make
```
