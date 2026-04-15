# ClickAssist

AI-driven real-time accessibility co-pilot for Windows. Sees your screen, hears your voice, visually guides you through any application — step by step.

## What it does

- **Sees your screen** — captures screenshots and parses UI elements via Microsoft OmniParser V2 + Windows UI Automation
- **Hears you** — push-to-talk voice input with real-time transcription
- **Speaks back** — text-to-speech via ElevenLabs, OpenAI, or Windows SAPI (local)
- **Points at things** — animated cursor overlay highlights the exact UI element to click next
- **Guides workflows** — step-by-step through multi-step processes, watching for UI state changes
- **Lives in your tray** — runs quietly as a system tray app

## Quick Start

```bash
git clone <repo-url>
cd clickassist
npm install
npm run dev
```

Open Settings from the tray icon and enter your API keys.

## API Keys

| Key | Required | Purpose |
|-----|----------|---------|
| Google Gemini | **Yes** | Core AI engine (Gemini Live API for real-time multimodal conversation) |
| Replicate | Optional | OmniParser V2 cloud inference (screen element detection) |
| OpenAI | Optional | Whisper transcription + TTS |
| Anthropic | Optional | Claude API (vision + chat) |
| OpenRouter | Optional | Access to 300+ models |
| AssemblyAI | Optional | Voice transcription |
| ElevenLabs | Optional | Premium text-to-speech |

## Architecture

```
src/
├── main/               # Electron main process
│   ├── index.ts            # App entry, window creation
│   ├── companion.ts        # Central orchestrator (voice → screen → AI → tts → overlay)
│   ├── screenshot.ts       # Screen capture via desktopCapturer
│   ├── hotkey.ts           # Global push-to-talk hotkey
│   ├── audio.ts            # Audio capture coordination
│   ├── tray.ts             # System tray setup
│   └── settings.ts         # Persistent settings (JSON store)
├── services/           # External service integrations
│   ├── gemini-live.ts      # Google Gemini Live API (streaming multimodal)
│   ├── claude.ts           # Anthropic Claude API (vision + chat)
│   ├── openai-chat.ts      # OpenAI GPT API
│   ├── openrouter-chat.ts  # OpenRouter (300+ models)
│   ├── omniparser/         # Microsoft OmniParser V2 screen parsing
│   │   ├── interface.ts        # Provider interface + factory
│   │   └── replicate.ts       # Replicate API integration
│   ├── uia/                # Windows UI Automation
│   │   ├── interface.ts        # Provider interface
│   │   └── powershell.ts      # PowerShell bridge
│   ├── element-merger.ts   # Combines OmniParser + UIA results
│   ├── transcription/      # Pluggable: OpenAI Whisper, AssemblyAI, local
│   └── tts/                # Pluggable: ElevenLabs, OpenAI, Windows SAPI
├── preload/            # Context bridge for renderer
└── renderer/           # UI windows
    ├── chat/               # Main chat interface with camera feed
    ├── overlay/            # Transparent click-through pointer overlay
    └── settings/           # Configuration panel
```

## Key Concepts

### Screen Understanding (OmniParser V2 + UIA)
ClickAssist uses two complementary approaches to understand what's on screen:
1. **OmniParser V2** — Microsoft's vision AI that detects interactable elements from raw pixels (works on ANY app)
2. **Windows UIA** — native accessibility tree with semantic element names and roles

Results are merged via IoU-based matching in `element-merger.ts`.

### AI Pointing Protocol
The AI uses two tag formats to reference UI elements:
- `[ELEMENT:name:role:screenN]` — preferred, resolved via element map
- `[POINT:x,y:label:screenN]` — fallback pixel coordinates

### HIPAA Mode
Forces all processing local (local Whisper, Windows SAPI, local OmniParser) — only the AI inference call goes external.

## Scripts

```bash
npm run dev        # Start in development mode
npm run typecheck  # Type-check without emitting
npm run build      # Compile + package
npm run lint       # ESLint
```

## License

MIT
