---
inclusion: fileMatch
fileMatchPattern: "**/omniparser/**"
---

# OmniParser V2 Integration Guide

## Overview
Microsoft OmniParser V2 converts UI screenshots into structured element lists. Two models:
1. Detection (YOLOv8) — finds interactable regions with bounding boxes
2. Caption (Florence-2) — describes what each element does

## Provider Interface
All OmniParser implementations must satisfy `OmniParserProvider`:
```typescript
interface OmniParserProvider {
  parse(screenshotBase64: string): Promise<OmniParserResult>;
}
```

Return type includes `elements[]` with `bbox`, `label`, `confidence`, `interactable`.

## Replicate API
- Endpoint: `https://api.replicate.com/v1/predictions`
- Model: `microsoft/omniparser-v2`
- Input: base64 JPEG image
- Async: POST creates prediction, poll GET until status=succeeded
- Latency: ~1-2s including network

## Local Inference
- Requires: Python 3.12, conda env, NVIDIA GPU (4GB+ VRAM)
- Weights: `huggingface-cli download microsoft/OmniParser-v2.0`
- Run as subprocess from Node.js, communicate via stdin/stdout JSON

## Element Output Format
```json
{
  "elements": [
    { "bbox": {"x": 45, "y": 87, "width": 92, "height": 14}, "label": "Leave Management tab", "confidence": 0.92, "interactable": true }
  ],
  "latencyMs": 820
}
```

## Merging with UIA
After OmniParser returns, the Element Merger in `src/services/element-merger.ts` combines results with UIA data using IoU > 0.5 overlap matching. See design spec for algorithm details.
