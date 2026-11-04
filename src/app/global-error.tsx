"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", background: "#F8F5EC", color: "#173E30", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1>Phalnama is having a moment.</h1>
          <p>Please refresh the page in a little while.</p>
          <button onClick={reset} style={{ padding: "12px 24px", background: "#173E30", color: "#F8F5EC", border: 0 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
