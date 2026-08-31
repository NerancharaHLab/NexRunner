"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => window.print()}
      data-testid="smoke-runner:executive-report:btn__print"
    >
      Print / Save PDF
    </button>
  );
}
