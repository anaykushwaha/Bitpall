/** Build a deterministic Bitpall Markdown report filename. */
export function reportFilename(ruleOrScenario: string): string {
  const slug = ruleOrScenario
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const base = slug.length > 0 ? slug : "detection";
  return `bitpall-${base}-report.md`;
}

/** Trigger a client-side download of a Markdown string. */
export function downloadMarkdown(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
