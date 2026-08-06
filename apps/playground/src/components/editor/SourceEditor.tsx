interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <section className="panel">
      <h2>Source</h2>
      <textarea
        aria-label="AegisScript source"
        rows={22}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </section>
  );
}
