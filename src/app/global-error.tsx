"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          background: "#080909",
          color: "#efeeec",
          fontFamily: "ui-monospace, monospace",
          padding: "2rem",
        }}
      >
        <pre style={{ color: "#f87171" }}>500 · something broke</pre>
        <button onClick={reset} style={{ color: "#f3b445", marginTop: "1rem" }}>
          [ retry ]
        </button>
      </body>
    </html>
  );
}
