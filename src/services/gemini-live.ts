import { SettingsStore } from "../main/settings";
import { ScreenshotResult } from "../main/screenshot";
import { DetectedElement, formatElementsForPrompt } from "./element-merger";

interface GeminiQueryParams {
  transcript: string;
  screenshots: ScreenshotResult[];
  cursorPosition: { x: number; y: number };
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  elements?: DetectedElement[];
}

interface GeminiResponse {
  text: string;
}

const SYSTEM_PROMPT = `You are ClickAssist, an AI accessibility co-pilot. You can see the user's screen, hear their voice, and understand every UI element on screen.

You have two sources of UI understanding:
1. VISUAL (OmniParser): Detected interactable elements with bounding boxes and captions
2. SEMANTIC (UIA): Accessibility tree elements with names, roles, and states

When guiding the user to interact with a UI element, use this tag format:
[ELEMENT:element_label:element_role:screen0]

If no matching element exists, fall back to pixel coordinates:
[POINT:x,y:label:screen0]

RULES:
- Guide ONE step at a time. Wait for the user to complete each action before giving the next.
- Be concise. The user may have cognitive or visual difficulties.
- Describe the element clearly: "the blue Submit button in the top-right corner"
- If the user seems stuck, offer to repeat or rephrase.
- Always describe what you see — never assume the user can see the screen.
- Track workflow progress when applicable: "Step 2 of 5: Now click..."
- Keep responses under 3 sentences unless the user asks for more detail.`;

/**
 * Google Gemini API service for ClickAssist.
 * Uses the Gemini REST API with vision (multimodal) support.
 * Gemini Live (WebSocket streaming) can be added later for real-time audio.
 */
export class GeminiService {
  private settings: SettingsStore;

  constructor(settings: SettingsStore) {
    this.settings = settings;
  }

  async query(params: GeminiQueryParams): Promise<GeminiResponse> {
    const apiKey = this.settings.get("geminiApiKey");
    const model = this.settings.get("geminiModel") || "gemini-2.0-flash";

    if (!apiKey) {
      throw new Error("Gemini API key not configured. Add it in Settings.");
    }

    // Build parts array for the current user turn
    const parts: Array<Record<string, unknown>> = [];

    // Add screenshots as inline images
    for (const screenshot of params.screenshots) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: screenshot.data,
        },
      });
    }

    // Build text context
    const textParts: string[] = [
      `User says: "${params.transcript}"`,
      `Cursor position: (${params.cursorPosition.x}, ${params.cursorPosition.y})`,
      `Screens: ${params.screenshots.map((s, i) =>
        `screen${i} ${s.bounds.width}x${s.bounds.height} at (${s.bounds.x},${s.bounds.y})`
      ).join(", ")}`,
    ];

    // Add element context if available
    if (params.elements && params.elements.length > 0) {
      textParts.push("");
      textParts.push(formatElementsForPrompt(params.elements));
    }

    parts.push({ text: textParts.join("\n") });

    // Build contents array from conversation history
    const contents: Array<Record<string, unknown>> = [];

    for (const entry of params.conversationHistory) {
      const role = entry.role === "user" ? "user" : "model";

      if (entry.role === "user" && entry.content === params.transcript) {
        // Latest user message gets the multimodal parts
        contents.push({ role: "user", parts });
      } else {
        contents.push({
          role,
          parts: [{ text: entry.content }],
        });
      }
    }

    // If history is empty, just send the current message
    if (contents.length === 0) {
      contents.push({ role: "user", parts });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text?: string }> };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        .map((p) => p.text)
        .join("") || "";

    return { text };
  }
}
