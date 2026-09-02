export default function NotFound() {
  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          background: "#080909",
          color: "#efeeec",
          fontFamily: "ui-monospace, monospace",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <pre style={{ color: "#f87171" }}>404 · not found</pre>
      </body>
    </html>
  );
}
