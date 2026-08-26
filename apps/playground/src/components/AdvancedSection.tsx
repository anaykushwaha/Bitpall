import type { ReactNode } from "react";

interface AdvancedSectionProps {
  children: ReactNode;
}

export function AdvancedSection({ children }: AdvancedSectionProps) {
  return (
    <details className="advanced">
      <summary>Advanced — AST and detection trace</summary>
      <div className="advanced-body">{children}</div>
    </details>
  );
}
