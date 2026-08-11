interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <section className="panel">
      <h2>AegisScript policy</h2>
      <textarea
        aria-label="AegisScript policy"
        rows={22}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </section>
  );
}
