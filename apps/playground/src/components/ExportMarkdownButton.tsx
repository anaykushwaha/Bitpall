interface ExportMarkdownButtonProps {
  disabled: boolean;
  onExport: () => void;
  error: string | null;
}

export function ExportMarkdownButton({ disabled, onExport, error }: ExportMarkdownButtonProps) {
  return (
    <div className="export-bar">
      <button type="button" className="secondary" disabled={disabled} onClick={onExport}>
        Export Markdown
      </button>
      {disabled ? (
        <span className="muted">Run Simulation to enable Markdown export.</span>
      ) : (
        <span className="muted">Download a deterministic Bitpall detection report.</span>
      )}
      {error ? <p className="diag-error">{error}</p> : null}
    </div>
  );
}
