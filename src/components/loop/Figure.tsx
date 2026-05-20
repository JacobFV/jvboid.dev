import type { ReactNode } from "react";

// Wide figure container. Phase 6 keeps it static; scroll-driven figure
// animation moves with the rest of `animate` work in Phase 8.
export function Figure({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure
      style={{
        maxWidth: 1100,
        margin: "8vh auto",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.04)",
          borderRadius: 8,
          padding: 16,
        }}
      >
        {children}
      </div>
      {caption && (
        <figcaption
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-ink-mute)",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
