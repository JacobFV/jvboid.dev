// Streams the resume PDF.

import { NextResponse } from "next/server";
import { getGraph, isListedNode } from "@/lib/graph";
import { renderResumePdf } from "@/lib/resume-pdf";

export const dynamic = "force-static";

export async function GET() {
  const { nodes } = getGraph();
  const projects = nodes
    .filter(isListedNode)
    .filter((n) => n.kind === "project");

  const pdf = await renderResumePdf(projects);
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="jacob-valdez-resume.pdf"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
