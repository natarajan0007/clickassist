# ClickAssist — Design Specification

## 1. Architecture Overview

```
USER LAYER:  Mic → Screen → Webcam → Speakers → Overlay Display
                          │
ELECTRON APP:  Main Process → Preload Bridge → Chat | Overlay | Settings
                          │
CORE ENGINE:   CompanionManager ← ScreenCapture + OmniParser + UIA + Audio + Hotkey
                          │
AI SERVICES:   Gemini Live API | OmniParser V2 (Replicate/Local/Azure) | Whisper | TTS
                          │
PLATFORM:      Windows UIA COM | desktopCapturer | globalShortcut | System Tray
```

## 2. OmniParser V2 Integration

### What it does
Microsoft's open-source screen parsing tool. Two fine-tuned models:
- YOLOv8-based detection model → bounding boxes of all interactable elements
- Florence-2-based caption model → functional descriptions ("search button", "submit form")

### Why it matters
- Works on ANY app via pure vision — no DOM, no accessibility tree needed
- V2: 39.6% on ScreenSpot Pro (vs GPT-4o's 0.8% without it)
- ~0.6s latency on A100, ~0.8s on RTX 4090
- Open source on GitHub, available on Replicate API and Azure AI Foundry

### OmniParser + UIA Strategy
Use OmniParser as primary visual parser. UIA as semantic enrichment:
- When both detect same element (IoU > 0.5): merge — use OmniParser bbox + UIA name/role
- OmniParser-only elements: keep (custom icons, canvas apps, games)
- UIA-only elements: keep (hidden but focusable elements)

#[[file:../../src/services/omniparser/interface.ts]]
#[[file:../../src/services/uia/interface.ts]]
#[[file:../../src/services/element-merger.ts]]

## 3. Query Processing Pipeline

```
1. User speaks (push-to-talk)
2. Audio → main process via IPC
3. PARALLEL:
   ├─ Transcription (Whisper) → text
   ├─ Screen capture → JPEG
   ├─ OmniParser V2 → [{bbox, label, confidence}]
   └─ UIA enumeration → [{name, role, bbox, states}]
4. Element Merger → unified element map
5. Prompt Builder → system prompt + screenshots + elements + transcript + history
6. Gemini Live API → response text
7. Response Parser → POINT/ELEMENT tags → overlay coords + clean text → TTS
8. PARALLEL:
   ├─ Overlay → animated cursor
   ├─ TTS → voice output
   └─ Chat → message display
9. Watch for UI state change → next step
```

## 4. Element Merger

IoU-based matching algorithm:
- For each OmniParser detection, find UIA element with IoU > 0.5
- Matched: merge (OmniParser bbox + UIA semantics)
- Unmatched OmniParser: keep as vision-only
- Unmatched UIA: keep as semantic-only

## 5. AI Prompt Design

System prompt includes:
- ClickAssist persona and accessibility-first behavior rules
- ELEMENT tag protocol: `[ELEMENT:name:role:screenN]`
- POINT fallback: `[POINT:x,y:label:screenN]`
- Element context list with IDs, names, roles, positions, sources
- One-step-at-a-time guidance rule
- Workflow progress tracking

## 6. New Modules

```
src/services/
├── omniparser/
│   ├── interface.ts      # OmniParserProvider + factory
│   ├── replicate.ts      # Replicate API (POC)
│   ├── local.ts          # Local GPU inference
│   └── azure.ts          # Azure AI Foundry
├── uia/
│   ├── interface.ts      # UIAProvider + factory
│   ├── powershell.ts     # PowerShell bridge (Phase 1)
│   └── native.ts         # NAPI-RS Rust addon (Phase 2)
├── element-merger.ts     # OmniParser + UIA merge
└── gemini-live.ts        # Gemini Live API streaming
```

## 7. Settings Additions

- omniparserEnabled, omniparserProvider (replicate/local/azure/disabled)
- replicateApiKey, omniparserModelPath, azureEndpoint, azureApiKey
- uiaEnabled
- captureSource (screen/camera/both), captureFps (1-5)
- geminiApiKey, geminiModel

## 8. Deployment

Build: TypeScript → tsc → Electron Forge → MSI/MSIX
Distribute: Azure Blob/S3 → Intune/SCCM/GPO → auto-install
Update: electron-updater → delta updates → silent background install
