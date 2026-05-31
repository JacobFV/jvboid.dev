// Streams the resume PDF for the requested variant. Two valid values:
// `software` and `robotics`. Anything else 404s.

import { NextResponse } from "next/server";
import { getGraph, isListedNode } from "@/lib/graph";
import { renderResumePdf } from "@/lib/resume-pdf";
import type { ResumeVariant } from "@/lib/resume-data";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return [{ variant: "software" }, { variant: "robotics" }];
}

function isVariant(v: string): v is ResumeVariant {
  return v === "software" || v === "robotics";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  if (!isVariant(variant)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { nodes } = getGraph();
  const projects = nodes
    .filter(isListedNode)
    .filter((n) => n.kind === "project");

  const pdf = await renderResumePdf(variant, projects);
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="jacob-valdez-${variant}-resume.pdf"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
