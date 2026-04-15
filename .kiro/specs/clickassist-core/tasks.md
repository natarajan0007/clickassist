# ClickAssist — Implementation Tasks

## Phase 1: OmniParser + Core Loop (Weeks 1–3)

- [x] 1. Create `src/services/omniparser/interface.ts` — OmniParserProvider interface and factory
- [x] 2. Create `src/services/omniparser/replicate.ts` — Replicate API integration
- [x] 3. Create `src/services/uia/interface.ts` — UIAProvider interface
- [x] 4. Create `src/services/uia/powershell.ts` — PowerShell UIA bridge
- [x] 5. Create `src/services/element-merger.ts` — IoU-based OmniParser + UIA merge
- [x] 6. Update `src/main/settings.ts` — add OmniParser, UIA, Gemini, capture settings
- [x] 7. Update `src/main/companion.ts` — integrate OmniParser + UIA into query pipeline
- [ ] 8. Update AI service system prompts — add ELEMENT tag protocol + element context
- [ ] 9. Update `src/renderer/overlay/index.html` — ELEMENT tag resolution
- [x] 10. Create `src/services/gemini-live.ts` — Gemini Live API WebSocket streaming

## Phase 2: Camera + Enhanced UI (Weeks 4–6)

- [ ] 11. Update `src/main/screenshot.ts` — add webcam capture
- [ ] 12. Add capture source toggle to chat UI
- [ ] 13. Add workflow progress tracking to CompanionManager
- [ ] 14. Add step progress bar to chat window
- [ ] 15. Update settings UI — OmniParser provider, API keys, capture source
- [ ] 16. Add UIA element highlight outlines to overlay

## Phase 3: Local OmniParser + HIPAA (Weeks 7–9)

- [ ] 17. Create `src/services/omniparser/local.ts` — local GPU inference
- [ ] 18. Create `src/services/omniparser/azure.ts` — Azure AI Foundry
- [ ] 19. Implement HIPAA mode enforcement
- [ ] 20. Add OmniParser result caching (perceptual hash)
- [ ] 21. Create `src/services/uia/native.ts` — NAPI-RS Rust addon

## Phase 4: Enterprise Hardening (Weeks 10–12)

- [ ] 22. MSI/MSIX packaging with code signing
- [ ] 23. Centralized config via MDM
- [ ] 24. Telemetry dashboard
- [ ] 25. Multi-language support
- [ ] 26. Security audit
