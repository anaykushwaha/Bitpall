import { PRODUCT_NAME } from "@bitpall/ast";
import { AdvancedSection } from "./components/AdvancedSection";
import { ScenarioSelector } from "./components/ScenarioSelector";
import { AstPanel } from "./components/visualization/AstPanel";
import { DiagnosticsPanel } from "./components/visualization/DiagnosticsPanel";
import { DetectionSummary } from "./components/simulator/DetectionSummary";
import { EventChain } from "./components/simulator/EventChain";
import { EventInput } from "./components/simulator/EventInput";
import { ResponsePanel } from "./components/response/ResponsePanel";
import { SourceEditor } from "./components/editor/SourceEditor";
import { TestResultsPanel } from "./components/simulator/TestResultsPanel";
import { TracePanel } from "./components/simulator/TracePanel";
import { usePlayground } from "./hooks/usePlayground";

export function App() {
  const { state, setSource, setEventsJson, loadScenario, check, runSimulation, runTests } =
    usePlayground();

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1 className="brand">{PRODUCT_NAME} Playground</h1>
          <p className="tagline">
            A cybersecurity language for deterministic detection and safe response automation.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => check()}>
            Check
          </button>
          <button type="button" onClick={() => runSimulation()}>
            Run Simulation
          </button>
          <button type="button" className="secondary" onClick={() => runTests()}>
            Run Tests
          </button>
        </div>
      </header>

      <div className="warning" role="status">
        <strong>Simulation mode.</strong> Responses are evaluated with a mock executor. No external
        systems are modified — Bitpall never isolates devices, disables accounts, revokes sessions,
        or terminates processes for real.
      </div>

      <ScenarioSelector selectedId={state.scenarioId} onSelect={loadScenario} />

      <div className="grid">
        <SourceEditor value={state.source} onChange={setSource} />
        <EventInput value={state.eventsJson} onChange={setEventsJson} error={state.eventError} />
      </div>

      <div className="story-grid">
        <DetectionSummary result={state.interpretResult} />
        <EventChain result={state.interpretResult} events={state.parsedEvents} />
        <ResponsePanel result={state.interpretResult} />
      </div>

      <TestResultsPanel result={state.testResult} />

      <DiagnosticsPanel diagnostics={state.diagnostics} />

      <AdvancedSection>
        <div className="grid">
          <AstPanel program={state.program} />
          <TracePanel result={state.interpretResult} />
        </div>
      </AdvancedSection>
    </div>
  );
}
