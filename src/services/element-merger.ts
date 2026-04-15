import { BoundingBox, OmniParserElement } from "./omniparser/interface";
import { UIAElement } from "./uia/interface";

export interface DetectedElement {
  id: string;
  bbox: BoundingBox;
  label: string;
  role?: string;
  source: "omniparser" | "uia" | "merged";
  confidence?: number;
  interactable: boolean;
  states?: string[];
}

const IOU_THRESHOLD = 0.3;

function computeIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) return 0;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Merges OmniParser visual detections with UIA semantic elements.
 * Uses IoU overlap to match corresponding elements.
 */
export function mergeElements(
  omniElements: OmniParserElement[],
  uiaElements: UIAElement[],
  screenWidth: number,
  screenHeight: number
): DetectedElement[] {
  const merged: DetectedElement[] = [];
  const matchedUIA = new Set<number>();

  // Denormalize OmniParser bboxes (they come as 0-1 normalized)
  const denormalized = omniElements.map((el) => ({
    ...el,
    bbox: {
      x: Math.round(el.bbox.x * screenWidth),
      y: Math.round(el.bbox.y * screenHeight),
      width: Math.round(el.bbox.width * screenWidth),
      height: Math.round(el.bbox.height * screenHeight),
    },
  }));

  for (const omni of denormalized) {
    let bestIdx = -1;
    let bestIoU = 0;

    for (let i = 0; i < uiaElements.length; i++) {
      if (matchedUIA.has(i)) continue;
      const iou = computeIoU(omni.bbox, uiaElements[i].bbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestIoU >= IOU_THRESHOLD) {
      matchedUIA.add(bestIdx);
      const uia = uiaElements[bestIdx];
      merged.push({
        id: `elem-${merged.length}`,
        bbox: omni.bbox,
        label: uia.name || omni.label,
        role: uia.role,
        source: "merged",
        confidence: omni.confidence,
        interactable: true,
        states: uia.states,
      });
    } else {
      merged.push({
        id: `elem-${merged.length}`,
        bbox: omni.bbox,
        label: omni.label,
        source: "omniparser",
        confidence: omni.confidence,
        interactable: omni.interactable,
      });
    }
  }

  // Add UIA-only elements
  for (let i = 0; i < uiaElements.length; i++) {
    if (matchedUIA.has(i)) continue;
    const uia = uiaElements[i];
    if (!uia.name) continue; // skip unnamed UIA elements
    merged.push({
      id: `elem-${merged.length}`,
      bbox: uia.bbox,
      label: uia.name,
      role: uia.role,
      source: "uia",
      interactable: true,
      states: uia.states,
    });
  }

  return merged;
}

/**
 * Formats element list for AI prompt context.
 */
export function formatElementsForPrompt(
  elements: DetectedElement[]
): string {
  if (elements.length === 0) return "No UI elements detected on screen.";

  const lines = elements.map((el) => {
    const role = el.role ? ` (${el.role})` : "";
    const states = el.states?.length ? `, ${el.states.join(", ")}` : "";
    const src = `[${el.source}]`;
    return `[${el.id}] "${el.label}"${role} at (${el.bbox.x}, ${el.bbox.y}) — ${el.bbox.width}×${el.bbox.height}px${states} ${src}`;
  });

  return "Available UI elements on screen:\n" + lines.join("\n");
}
