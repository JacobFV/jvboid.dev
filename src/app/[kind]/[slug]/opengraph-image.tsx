import { ImageResponse } from "next/og";
import { getGraph, KIND_PREFIX, type Lane } from "@/lib/graph";

export const alt = "Jacob Valdez";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// One OG per route — Next derives the image URL from the route params.
// No generateImageMetadata needed.

const laneHex: Record<Lane, string> = {
  research: "#6FA8DC",
  building: "#93C47D",
  writing: "#C27BA0",
  personal: "#F1C232",
};

export default async function OG({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}) {
  const { kind, slug } = await params;
  const looked = getGraph().byId.get(slug);
  // Only render OG for the canonical (kind, slug) pair. Otherwise treat as
  // an unknown route — the og will fall back to the generic Jacob image.
  const node = looked && KIND_PREFIX[looked.kind] === kind ? looked : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "radial-gradient(ellipse at top left, #0E1014 0%, #04050A 75%)",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          color: "#F2F4F8",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#9097A3",
            fontSize: 22,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: node ? laneHex[node.lane] : "#9097A3",
            }}
          />
          <div>{node ? `${node.lane} · ${node.kind}` : "Jacob Valdez"}</div>
        </div>

        <div
          style={{
            fontSize: node && node.title.length > 60 ? 64 : 84,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#F2F4F8",
            marginBottom: 32,
          }}
        >
          {node ? node.title : "Jacob Valdez"}
        </div>

        <div
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            color: "#9097A3",
            maxWidth: 940,
          }}
        >
          {node ? node.summary : "A navigable map of projects, writing, and visions."}
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#5A6070",
            fontSize: 20,
          }}
        >
          <span>jacobfv.com</span>
          <span>{node?.date ?? ""}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
