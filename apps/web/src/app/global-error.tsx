"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (rare) — app/error.tsx
// only covers errors in the tree BELOW the root layout. This one must
// render its own <html>/<body> and can't assume globals.css custom
// properties are safe to depend on, since the layout that would normally
// guarantee that is what failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0F172A" }}>Something went wrong.</h1>
          <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#64748B" }}>
            CA SmartPro hit an unexpected error and couldn&apos;t load. Your saved data was not affected.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#2563EB",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
