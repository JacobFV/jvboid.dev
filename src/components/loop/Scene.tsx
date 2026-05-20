import type { ReactNode } from "react";

// A scrollytelling section. Generous vertical room so each Scene gets
// its own beat in the reader's scroll.
export function Scene({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "12vh 24px",
      }}
    >
      {children}
    </section>
  );
}
