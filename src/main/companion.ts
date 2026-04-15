import { BrowserWindow } from "electron";
import { ScreenCapture, ScreenshotResult } from "./screenshot";
import { SettingsStore } from "./settings";
import { ClaudeService } from "../services/claude";
import { OpenAIChatService } from "../services/openai-chat";
import { OpenRouterChatService } from "../services/openrouter-chat";
import { GeminiService } from "../services/gemini-live";
import {
  TranscriptionProvider,
  createTranscriptionProvider,
} from "../services/transcription/interface";
import { createTTSProvider } from "../services/tts/interface";
import { createOmniParserProvider, OmniParserProvider } from "../services/omniparser/interface";
import { createUIAProvider, UIAProvider } from "../services/uia/interface";
import { DetectedElement, mergeElements, formatElementsForPrompt } from "../services/element-merger";

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
}

interface AIProvider {
  query(params: {
    transcript: string;
    screenshots: ScreenshotResult[];
    cursorPosition: { x: number; y: number };
    conversationHistory: ConversationEntry[];
    elements?: DetectedElement[];
  }): Promise<{ text: string }>;
}

const MAX_CONVERSATION_HISTORY = 10;

/**
 * Central orchestrator for ClickAssist.
 *
 * Flow: voice → screenshot + OmniParser + UIA → element merge → AI → tts → overlay pointing
 */
export class CompanionManager {
  private settings: SettingsStore;
  private screenCapture: ScreenCapture;
  private transcription: TranscriptionProvider;
  private omniParser: OmniParserProvider | null;
  private uiaProvider: UIAProvider | null;
  private conversationHistory: ConversationEntry[] = [];
  private overlayWindow: BrowserWindow | null = null;
  private lastElements: DetectedElement[] = [];

  constructor(settings: SettingsStore, overlayWindow: BrowserWindow | null) {
    this.settings = settings;
    this.screenCapture = new ScreenCapture();
    this.transcription = createTranscriptionProvider(settings);
    this.omniParser = createOmniParserProvider(settings);
    this.uiaProvider = createUIAProvider(settings);
    this.overlayWindow = overlayWindow;
  }

  private getAIProvider(): AIProvider {
    const provider = this.settings.get("aiProvider");
    if (provider === "gemini") return new GeminiService(this.settings);
    if (provider === "openai") return new OpenAIChatService(this.settings);
    if (provider === "openrouter") return new OpenRouterChatService(this.settings);
    return new ClaudeService(this.settings);
  }

  /**
   * Process a user query: capture screen + parse elements + send to AI + speak + point.
   */
  async processQuery(transcript: string): Promise<string> {
    // 1. Parallel: capture screenshots + OmniParser + UIA
    const [screenshots, omniResult, uiaElements] = await Promise.all([
      this.screenCapture.captureAllScreens(),
      this.omniParser
        ? this.omniParser.parse(
            (await this.screenCapture.capturePrimaryScreen())?.data || ""
          ).catch((err) => {
            console.warn("OmniParser failed (non-fatal):", err.message);
            return { elements: [], latencyMs: 0 };
          })
        : Promise.resolve({ elements: [], latencyMs: 0 }),
      this.uiaProvider
        ? this.uiaProvider.enumerate().catch((err) => {
            console.warn("UIA failed (non-fatal):", err.message);
            return [];
          })
        : Promise.resolve([]),
    ]);

    const cursorPos = this.screenCapture.getCursorPosition();

    // 2. Merge OmniParser + UIA elements
    const primaryScreen = screenshots[0];
    const screenW = primaryScreen?.bounds.width || 1920;
    const screenH = primaryScreen?.bounds.height || 1080;
    const elements = mergeElements(omniResult.elements, uiaElements, screenW, screenH);
    this.lastElements = elements;

    if (elements.length > 0) {
      console.log(`Detected ${elements.length} UI elements (omni: ${omniResult.elements.length}, uia: ${uiaElements.length})`);
    }

    // 3. Send to AI provider with elements context
    this.conversationHistory.push({ role: "user", content: transcript });

    const ai = this.getAIProvider();
    const response = await ai.query({
      transcript,
      screenshots,
      cursorPosition: cursorPos,
      conversationHistory: this.conversationHistory,
      elements,
    });

    this.conversationHistory.push({ role: "assistant", content: response.text });

    // Trim history
    if (this.conversationHistory.length > MAX_CONVERSATION_HISTORY * 2) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY * 2);
    }

    // 4. Parse POINT and ELEMENT tags, send to overlay
    const pointTags = this.parsePointTags(response.text);
    const elementTags = this.parseElementTags(response.text, elements);
    const allPointers = [...pointTags, ...elementTags];

    if (allPointers.length > 0 && this.overlayWindow) {
      this.overlayWindow.webContents.send("overlay:point", allPointers);
    }

    // 5. Speak response (strip tags) — non-blocking
    const spokenText = response.text
      .replace(/\[POINT:[^\]]+\]/g, "")
      .replace(/\[ELEMENT:[^\]]+\]/g, "")
      .trim();

    if (this.settings.get("ttsEnabled") && spokenText) {
      try {
        const tts = createTTSProvider(this.settings);
        tts.speak(spokenText).catch((err) => {
          console.warn("TTS failed (non-fatal):", err.message);
        });
      } catch (err: unknown) {
        console.warn("TTS provider creation failed:", err instanceof Error ? err.message : err);
      }
    }

    return response.text;
  }

  private parsePointTags(
    text: string
  ): Array<{ x: number; y: number; label: string; screen: number }> {
    const regex = /\[POINT:(\d+),(\d+):([^:]+):screen(\d+)\]/g;
    const tags: Array<{ x: number; y: number; label: string; screen: number }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      tags.push({
        x: parseInt(match[1], 10),
        y: parseInt(match[2], 10),
        label: match[3],
        screen: parseInt(match[4], 10),
      });
    }
    return tags;
  }

  private parseElementTags(
    text: string,
    elements: DetectedElement[]
  ): Array<{ x: number; y: number; label: string; screen: number }> {
    const regex = /\[ELEMENT:([^:]+):([^:]+):screen(\d+)\]/g;
    const tags: Array<{ x: number; y: number; label: string; screen: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const role = match[2];
      const screen = parseInt(match[3], 10);

      // Find matching element by name (case-insensitive partial match)
      const el = elements.find(
        (e) =>
          e.label.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(e.label.toLowerCase())
      );

      if (el) {
        tags.push({
          x: el.bbox.x + Math.round(el.bbox.width / 2),
          y: el.bbox.y + Math.round(el.bbox.height / 2),
          label: el.label,
          screen,
        });
      }
    }

    return tags;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.lastElements = [];
  }

  getLastElements(): DetectedElement[] {
    return this.lastElements;
  }
}
