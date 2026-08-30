import type { ProgramNode } from "@bitpall/ast";

interface AstPanelProps {
  program: ProgramNode | null;
}

export function AstPanel({ program }: AstPanelProps) {
  return (
    <section className="panel">
      <h2>AST</h2>
      {program ? (
        <pre className="dev-output dev-output--ast">{JSON.stringify(program, null, 2)}</pre>
      ) : (
        <p className="muted">Run Check to view the abstract syntax tree.</p>
      )}
    </section>
  );
}
