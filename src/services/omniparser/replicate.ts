import { OmniParserProvider, OmniParserResult, OmniParserElement } from "./interface";

const OMNIPARSER_VERSION = "microsoft/omniparser-v2";
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 30; // 15 seconds max

/**
 * OmniParser V2 via Replicate API.
 * Sends screenshot, polls for result, returns structured element list.
 */
export class ReplicateOmniParser implements OmniParserProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parse(screenshotBase64: string): Promise<OmniParserResult> {
    const start = Date.now();

    // Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: OMNIPARSER_VERSION,
        input: {
          image: `data:image/jpeg;base64,${screenshotBase64}`,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Replicate create error (${createRes.status}): ${err}`);
    }

    const prediction = (await createRes.json()) as {
      id: string;
      urls: { get: string };
      status: string;
      output?: unknown;
    };

    // If already completed (unlikely but possible)
    if (prediction.status === "succeeded" && prediction.output) {
      return {
        elements: this.parseOutput(prediction.output),
        latencyMs: Date.now() - start,
      };
    }

    // Poll for completion
    const result = await this.pollResult(prediction.urls.get);

    return {
      elements: this.parseOutput(result.output),
      latencyMs: Date.now() - start,
    };
  }

  private async pollResult(
    url: string
  ): Promise<{ output: unknown; status: string }> {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!res.ok) {
        throw new Error(`Replicate poll error (${res.status})`);
      }

      const data = (await res.json()) as {
        status: string;
        output?: unknown;
        error?: string;
      };

      if (data.status === "succeeded") return data as { output: unknown; status: string };
      if (data.status === "failed") {
        throw new Error(`OmniParser failed: ${data.error || "unknown"}`);
      }
    }

    throw new Error("OmniParser timed out after polling");
  }

  private parseOutput(output: unknown): OmniParserElement[] {
    if (!output || typeof output !== "object") return [];

    // Replicate OmniParser returns parsed_content_list and label_coordinates
    const out = output as Record<string, unknown>;

    // Handle the structured output format
    const parsedContent = out.parsed_content_list as string[] | undefined;
    const labelCoords = out.label_coordinates as number[][] | undefined;

    if (!parsedContent || !labelCoords) return [];

    const elements: OmniParserElement[] = [];

    for (let i = 0; i < parsedContent.length; i++) {
      const label = parsedContent[i];
      const coords = labelCoords[i];
      if (!coords || coords.length < 4) continue;

      // Coords are [x_min, y_min, x_max, y_max] normalized 0-1
      elements.push({
        bbox: {
          x: coords[0],
          y: coords[1],
          width: coords[2] - coords[0],
          height: coords[3] - coords[1],
        },
        label: label || "unknown",
        confidence: 0.8, // Replicate doesn't return per-element confidence
        interactable: true,
      });
    }

    return elements;
  }
}
