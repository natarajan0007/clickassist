---
inclusion: fileMatch
fileMatchPattern: "**/uia/**,**/overlay/**"
---

# Accessibility Patterns

## Windows UI Automation (UIA)
- Access via `System.Windows.Automation` namespace in PowerShell
- Returns: element name, control type (role), bounding rectangle, states (focused, disabled, etc.)
- Phase 1: PowerShell subprocess bridge
- Phase 2: NAPI-RS Rust native addon for performance

## ELEMENT Tag Protocol
AI responses can reference UI elements by name instead of pixel coordinates:
```
[ELEMENT:Submit Button:Button:screen0]
```
The overlay resolves this by looking up the element in the current element map and animating the pointer to its bounding box center.

## POINT Tag Fallback
When no matching element exists:
```
[POINT:450,320:Submit:screen0]
```

## Overlay Behavior
- Transparent, fullscreen, click-through window (`setIgnoreMouseEvents(true)`)
- Animated pulsing circle at target coordinates
- Label tooltip below the pointer
- Recording indicator (top-right) when push-to-talk is active
- AI speaking indicator (bottom) during TTS playback
- UIA element highlight mode: subtle dashed outlines on detected interactive elements

## HIPAA Mode
When enabled:
- Transcription: local Whisper only (no audio leaves device)
- TTS: Windows SAPI only (no text leaves device)
- OmniParser: local GPU inference only
- Only the AI inference API call goes external
