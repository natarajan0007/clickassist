# ClickAssist — Requirements

## Goal
Build an AI accessibility co-pilot that guides users with disabilities through any Windows application in real-time using voice, screen understanding (OmniParser V2 + Windows UIA), and visual cursor pointing.

## User Stories

- US-1: As a visually impaired user, I want to say "How do I submit a leave request?" and get step-by-step voice + visual pointer guidance through the HR portal.
- US-2: As a user with cognitive difficulties, I want the assistant to watch my screen after each action and automatically guide me to the next step.
- US-3: As a motor-impaired user, I want to control the assistant entirely by voice so I can navigate enterprise software hands-free.
- US-4: As an IT admin, I want to deploy ClickAssist to Windows endpoints via Intune/SCCM with centralized config.
- US-5: As a compliance officer, I want HIPAA mode that keeps all voice/screen processing local.

## Functional Requirements

- FR-1: Capture screen at 1-2 fps via Electron desktopCapturer, send to AI engine.
- FR-2: Optionally capture webcam feed alongside screen for physical-world context.
- FR-3: Use Microsoft OmniParser V2 to detect interactable UI elements (bounding boxes + captions) from screenshots.
- FR-4: Use Windows UIA COM API to enumerate accessible elements (names, roles, bounding rects) as enrichment/fallback.
- FR-5: Merge OmniParser + UIA results into a unified element map via IoU-based matching.
- FR-6: Use Google Gemini Live API for real-time multimodal conversation (streaming audio + video).
- FR-7: Support push-to-talk voice input via configurable global hotkey.
- FR-8: Display animated cursor overlay on transparent fullscreen window pointing at referenced UI elements.
- FR-9: Parse [POINT:x,y:label:screenN] and [ELEMENT:name:role:screenN] tags from AI responses.
- FR-10: Provide TTS output via ElevenLabs, OpenAI TTS, or Windows SAPI (local).
- FR-11: Maintain conversation history (max 10 exchanges) for context-aware guidance.
- FR-12: Track workflow progress (step N of M) during multi-step processes.
- FR-13: Run as system tray app with chat, settings, and overlay windows.

## Non-Functional Requirements

- NFR-1: Screen parsing (OmniParser + UIA) under 1 second per frame.
- NFR-2: End-to-end response (voice in → AI → voice out) under 3 seconds.
- NFR-3: Memory usage under 500MB during normal operation.
- NFR-4: HIPAA mode: zero audio/text leaves device except AI inference call.
- NFR-5: Deployable as MSI/MSIX via enterprise MDM.
- NFR-6: Auto-updates via electron-updater.
