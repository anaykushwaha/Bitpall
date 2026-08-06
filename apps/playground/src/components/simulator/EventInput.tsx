interface EventInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

export function EventInput({ value, onChange, error }: EventInputProps) {
  return (
    <section className="panel">
      <h2>Mock events (JSON)</h2>
      <textarea
        aria-label="Mock security events JSON"
        rows={14}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
      {error ? <p className="diag-error">{error}</p> : null}
    </section>
  );
}
