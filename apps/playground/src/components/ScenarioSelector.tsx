import type { ScenarioDefinition, ScenarioId } from "../lib/scenarios";
import { SCENARIOS } from "../lib/scenarios";

interface ScenarioSelectorProps {
  selectedId: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}

export function ScenarioSelector({ selectedId, onSelect }: ScenarioSelectorProps) {
  const selected: ScenarioDefinition =
    SCENARIOS.find((scenario) => scenario.id === selectedId) ?? SCENARIOS[0]!;

  return (
    <section className="panel scenario-panel">
      <div className="scenario-header">
        <div>
          <h2>Demo scenario</h2>
          <p className="muted">{selected.summary}</p>
        </div>
        <label className="scenario-select">
          <span className="sr-only">Choose scenario</span>
          <select
            value={selectedId}
            onChange={(event) => onSelect(event.target.value as ScenarioId)}
          >
            {SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
