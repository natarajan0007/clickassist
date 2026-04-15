import { SettingsStore } from "../../main/settings";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OmniParserElement {
  bbox: BoundingBox;
  label: string;
  confidence: number;
  interactable: boolean;
}

export interface OmniParserResult {
  elements: OmniParserElement[];
  latencyMs: number;
}

export interface OmniParserProvider {
  parse(screenshotBase64: string): Promise<OmniParserResult>;
}

export function createOmniParserProvider(
  settings: SettingsStore
): OmniParserProvider | null {
  const enabled = settings.get("omniparserEnabled");
  if (!enabled) return null;

  const provider = settings.get("omniparserProvider");

  switch (provider) {
    case "replicate": {
      const { ReplicateOmniParser } = require("./replicate");
      return new ReplicateOmniParser(
        settings.get("replicateApiKey")
      );
    }
    default:
      return null;
  }
}
