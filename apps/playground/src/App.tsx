import { useState } from "react";
import { PRODUCT_NAME } from "@bitpall/ast";
import { exportDocumentation } from "@bitpall/exporters";
import { AdvancedSection } from "./components/AdvancedSection";
import { ExportMarkdownButton } from "./components/ExportMarkdownButton";
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
import { canExportMarkdown } from "./lib/playgroundState";
import { downloadMarkdown, reportFilename } from "./lib/exportReport";
import { getScenario } from "./lib/scenarios";

export function App() {
  const { state, setSource, setEventsJson, loadScenario, check, runSimulation, runTests } =
    usePlayground();
  const [exportError, setExportError] = useState<string | null>(null);

  const canExport = canExportMarkdown(state);

  const handleSourceChange = (source: string) => {
    setExportError(null);
    setSource(source);
  };

  const handleEventsJsonChange = (eventsJson: string) => {
    setExportError(null);
    setEventsJson(eventsJson);
  };

  const handleExport = () => {
    if (!state.program || !state.interpretResult) {
      setExportError("Run Simulation before exporting a Markdown report.");
      return;
    }
    try {
      const scenario = getScenario(state.scenarioId);
      const matched =
        state.interpretResult.ruleResults.find((rule) => rule.matched) ??
        state.interpretResult.ruleResults[0];
      const markdown = exportDocumentation({
        format: "markdown",
        program: state.program,
        result: state.interpretResult,
        events: state.parsedEvents,
        scenarioName: scenario.label,
        ruleName: matched?.ruleName,
      });
      const filename = reportFilename(matched?.ruleName ?? scenario.id);
      downloadMarkdown(filename, markdown);
      setExportError(null);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleLoadScenario = (scenarioId: typeof state.scenarioId) => {
    setExportError(null);
    loadScenario(scenarioId);
  };

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

      <ScenarioSelector selectedId={state.scenarioId} onSelect={handleLoadScenario} />

      <div className="grid">
        <SourceEditor value={state.source} onChange={handleSourceChange} />
        <EventInput
          value={state.eventsJson}
          onChange={handleEventsJsonChange}
          error={state.eventError}
        />
      </div>

      <div className="story-grid">
        <DetectionSummary result={state.interpretResult} />
        <EventChain result={state.interpretResult} events={state.parsedEvents} />
        <ResponsePanel result={state.interpretResult} />
      </div>

      <ExportMarkdownButton disabled={!canExport} onExport={handleExport} error={exportError} />

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
