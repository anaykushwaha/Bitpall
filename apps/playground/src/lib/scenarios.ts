import ransomwarePolicy from "@examples/exploit-to-ransomware/policy.bitpall?raw";
import ransomwareEvents from "@examples/exploit-to-ransomware/events.json?raw";
import accountTakeoverPolicy from "@examples/account-takeover/policy.bitpall?raw";
import accountTakeoverEvents from "@examples/account-takeover/events.json?raw";
import dataExfiltrationPolicy from "@examples/data-exfiltration/policy.bitpall?raw";
import dataExfiltrationEvents from "@examples/data-exfiltration/events.json?raw";

export type ScenarioId = "ransomware" | "account-takeover" | "data-exfiltration";

export interface ScenarioDefinition {
  readonly id: ScenarioId;
  readonly label: string;
  readonly summary: string;
  readonly policy: string;
  readonly eventsJson: string;
}

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: "ransomware",
    label: "Exploit → Ransomware",
    summary: "Ordered exploit/encryption chain with endpoint containment.",
    policy: ransomwarePolicy.trimEnd() + "\n",
    eventsJson: ransomwareEvents.trimEnd() + "\n",
  },
  {
    id: "account-takeover",
    label: "Account Takeover",
    summary: "Suspicious identity chain with session revoke and pending disable.",
    policy: accountTakeoverPolicy.trimEnd() + "\n",
    eventsJson: accountTakeoverEvents.trimEnd() + "\n",
  },
  {
    id: "data-exfiltration",
    label: "Data Exfiltration",
    summary: "Sensitive access, staging, and outbound transfer containment.",
    policy: dataExfiltrationPolicy.trimEnd() + "\n",
    eventsJson: dataExfiltrationEvents.trimEnd() + "\n",
  },
];

export function getScenario(id: ScenarioId): ScenarioDefinition {
  const scenario = SCENARIOS.find((entry) => entry.id === id);
  if (!scenario) {
    throw new Error(`Unknown scenario '${id}'`);
  }
  return scenario;
}

export const DEFAULT_SCENARIO_ID: ScenarioId = "ransomware";
