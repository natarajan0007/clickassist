import { SettingsStore } from "../../main/settings";
import { BoundingBox } from "../omniparser/interface";

export interface UIAElement {
  name: string;
  role: string;
  bbox: BoundingBox;
  interactable: boolean;
  states: string[];
}

export interface UIAProvider {
  enumerate(): Promise<UIAElement[]>;
}

export function createUIAProvider(
  settings: SettingsStore
): UIAProvider | null {
  const enabled = settings.get("uiaEnabled");
  if (!enabled) return null;

  const { PowerShellUIAProvider } = require("./powershell");
  return new PowerShellUIAProvider();
}
