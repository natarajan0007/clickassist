import { exec } from "child_process";
import { UIAProvider, UIAElement } from "./interface";

const UIA_SCRIPT = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker

$results = @()
$focusedWindow = [System.Windows.Automation.AutomationElement]::FocusedElement
try {
  $topWindow = $focusedWindow
  while ($topWindow.Current.ControlType -ne [System.Windows.Automation.ControlType]::Window -and $topWindow -ne $root) {
    $topWindow = $walker.GetParent($topWindow)
  }
} catch { $topWindow = $root }

$interactableTypes = @(
  [System.Windows.Automation.ControlType]::Button,
  [System.Windows.Automation.ControlType]::Edit,
  [System.Windows.Automation.ControlType]::ComboBox,
  [System.Windows.Automation.ControlType]::CheckBox,
  [System.Windows.Automation.ControlType]::RadioButton,
  [System.Windows.Automation.ControlType]::Hyperlink,
  [System.Windows.Automation.ControlType]::MenuItem,
  [System.Windows.Automation.ControlType]::Tab,
  [System.Windows.Automation.ControlType]::TabItem,
  [System.Windows.Automation.ControlType]::ListItem,
  [System.Windows.Automation.ControlType]::TreeItem
)

$elements = $topWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
foreach ($el in $elements) {
  try {
    $ct = $el.Current.ControlType
    if ($interactableTypes -contains $ct) {
      $rect = $el.Current.BoundingRectangle
      if ($rect.Width -gt 0 -and $rect.Height -gt 0) {
        $results += @{
          name = $el.Current.Name
          role = $ct.ProgrammaticName -replace 'ControlType\\.', ''
          x = [int]$rect.X
          y = [int]$rect.Y
          width = [int]$rect.Width
          height = [int]$rect.Height
          enabled = $el.Current.IsEnabled
          focused = $el.Current.HasKeyboardFocus
        }
      }
    }
  } catch { }
}

$results | ConvertTo-Json -Compress
`;

const TIMEOUT_MS = 5000;

/**
 * Windows UI Automation via PowerShell subprocess.
 * Enumerates interactable elements in the focused window.
 */
export class PowerShellUIAProvider implements UIAProvider {
  async enumerate(): Promise<UIAElement[]> {
    return new Promise((resolve) => {
      const escaped = UIA_SCRIPT.replace(/"/g, '`"');
      exec(
        `powershell -NoProfile -Command "${escaped}"`,
        { timeout: TIMEOUT_MS },
        (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve([]);
            return;
          }

          try {
            const raw = JSON.parse(stdout.trim());
            const arr = Array.isArray(raw) ? raw : [raw];
            const elements: UIAElement[] = arr.map((el: Record<string, unknown>) => ({
              name: (el.name as string) || "",
              role: (el.role as string) || "Unknown",
              bbox: {
                x: el.x as number,
                y: el.y as number,
                width: el.width as number,
                height: el.height as number,
              },
              interactable: true,
              states: [
                ...(el.enabled ? ["enabled"] : ["disabled"]),
                ...(el.focused ? ["focused"] : []),
              ],
            }));
            resolve(elements);
          } catch {
            resolve([]);
          }
        }
      );
    });
  }
}
