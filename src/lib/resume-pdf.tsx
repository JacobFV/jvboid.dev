// PDF document component, `<ResumeDocument projects={...} />`. Server-only — never import from a
// client component (it pulls in @react-pdf/renderer, which is large and
// node-only at our usage). Routes that need the PDF binary should call
// `renderResumePdf()` from a route handler.

import { Document, Page, Text, View, StyleSheet, Link, renderToBuffer } from "@react-pdf/renderer";
import type { Node } from "./graph-types";
import {
  contact,
  experience,
  formatResumeDate,
  onResume,
  resumeBlurb,
  resumeMeta as meta,
} from "./resume-data";

const colors = {
  ink: "#111111",
  inkDim: "#3a3a3a",
  inkMute: "#6b6b6b",
  rule: "#dcdcdc",
  accent: "#b34700",
};

// Text only. The web résumé shows each job's media thumbnails; the PDF
// leaves them out, since a printed résumé is read for the words and the
// pictures only crowd the page.
const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    // Deeper than the top, so the last line on a page stops well short of
    // the paper's edge.
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.inkDim,
    lineHeight: 1.45,
  },
  name: {
    fontSize: 22,
    lineHeight: 1.2,
    color: colors.ink,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  headline: { fontSize: 10, color: colors.accent, fontFamily: "Helvetica-Oblique" },
  summary: { marginTop: 6, fontSize: 9.5, color: colors.inkDim, lineHeight: 1.5 },
  contactRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 10, fontSize: 8.5, color: colors.inkMute },
  contactItem: { color: colors.inkMute },
  contactLink: { color: colors.inkMute, textDecoration: "none" },

  sectionLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 8,
    color: colors.inkMute,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.rule,
    paddingBottom: 3,
  },

  highlights: { marginTop: 10 },
  highlightLink: { color: colors.ink, textDecoration: "underline" },
  highlightItem: {
    position: "relative",
    marginBottom: 3,
    paddingLeft: 10,
    fontSize: 9,
    color: colors.inkDim,
  },
  highlightBullet: {
    position: "absolute",
    left: 0,
    top: 5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },

  skillsLine: { fontSize: 9, color: colors.inkDim, lineHeight: 1.45 },

  expRow: { flexDirection: "row", marginBottom: 8 },
  expDate: { width: 104, paddingRight: 8, fontSize: 8.5, color: colors.inkMute },
  expBody: { flex: 1 },
  expTitle: { fontSize: 10, color: colors.ink, fontFamily: "Helvetica-Bold" },
  expOrg: { color: colors.inkDim, fontFamily: "Helvetica" },
  expPara: { marginTop: 1, fontSize: 9, color: colors.inkDim },
  expParaNext: { marginTop: 3 },

  projRow: { flexDirection: "row", gap: 14 },
  projItem: { flex: 1, flexDirection: "row", marginBottom: 2.4 },
  projYear: { width: 46, paddingRight: 4, fontSize: 7.5, color: colors.inkMute },
  projText: { flex: 1, fontSize: 8.5, color: colors.inkDim, lineHeight: 1.4 },
  projTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },
});

function ProjectItem({ n }: { n: Node }) {
  return (
    <View style={styles.projItem}>
      <Text style={styles.projYear}>{formatResumeDate(n)}</Text>
      <Text style={styles.projText}>
        <Text style={styles.projTitle}>{n.title}</Text>
        {resumeBlurb(n) ? <Text> — {resumeBlurb(n)}</Text> : null}
      </Text>
    </View>
  );
}

// Two across, set as rows of pairs rather than two tall columns. react-pdf
// cannot break a flex row across pages: two columns side by side are one
// row, so whatever ran past the page was drawn in a heap at its foot and
// through the bottom margin. A row per pair is an ordinary block, and
// rows break between pages cleanly.
function ProjectGroup({ items }: { items: Node[] }) {
  if (items.length === 0) return null;
  const rows: Node[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  const renderRow = (row: Node[]) => (
    <View key={row[0].id} style={styles.projRow} wrap={false}>
      {row.map((n) => (
        <ProjectItem key={n.id} n={n} />
      ))}
      {row.length === 1 && <View style={{ flex: 1 }} />}
    </View>
  );
  const [first, ...rest] = rows;
  return (
    <View>
      {/* The heading travels with the first row, so it is never left
          alone at the foot of a page with its projects overleaf. */}
      <View wrap={false}>
        <Text style={styles.sectionLabel}>Projects</Text>
        {renderRow(first)}
      </View>
      {rest.map(renderRow)}
    </View>
  );
}

export function ResumeDocument({ projects }: { projects: Node[] }) {
  const sortByDateDesc = (a: Node, b: Node) => (a.date < b.date ? 1 : -1);
  const listed = projects.filter(onResume).sort(sortByDateDesc);

  return (
    <Document title="Jacob Valdez — Resume" author={contact.name} subject="resume">
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.headline}>{meta.headline}</Text>
          {meta.summary ? <Text style={styles.summary}>{meta.summary}</Text> : null}
          <View style={styles.contactRow}>
            <Link src={`mailto:${contact.email}`} style={styles.contactLink}>{contact.email}</Link>
            <Text style={styles.contactItem}>{contact.phone}</Text>
            <Link src={`https://${contact.website}`} style={styles.contactLink}>{contact.website}</Link>
            <Link src={`https://${contact.github}`} style={styles.contactLink}>{contact.github}</Link>
            <Text style={styles.contactItem}>{contact.twitter}</Text>
            <Text style={styles.contactItem}>{contact.location}</Text>
          </View>
        </View>

        {/* No heading: the highlights follow the contact line directly. */}
        <View style={styles.highlights}>
          {meta.highlights.map((parts, i) => (
            <View key={i} style={styles.highlightItem} wrap={false}>
              <View style={styles.highlightBullet} />
              <Text>
                {parts.map((part, j) =>
                  typeof part === "string" ? (
                    part
                  ) : (
                    <Link key={j} src={part.href} style={styles.highlightLink}>
                      {part.text}
                    </Link>
                  ),
                )}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Experience</Text>
        <View>
          {experience.map((e) => (
            <View key={`${e.org}-${e.title}-${e.range}`} style={styles.expRow} wrap={false}>
              <Text style={styles.expDate}>{e.range}</Text>
              <View style={styles.expBody}>
                {e.title ? (
                  <Text>
                    <Text style={styles.expTitle}>{e.title}</Text>
                    <Text style={styles.expOrg}> · {e.org}</Text>
                  </Text>
                ) : null}
                {/* Paragraphs, not bullets: each entry reads as prose. */}
                {e.bullets.map((b, i) => (
                  <Text key={b} style={[styles.expPara, i > 0 ? styles.expParaNext : {}]}>
                    {b}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <ProjectGroup items={listed} />

        <View wrap={false}>
          <Text style={styles.sectionLabel}>Skills</Text>
          <Text style={styles.skillsLine}>{meta.strengths.join(", ")}</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function renderResumePdf(projects: Node[]): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument projects={projects} />);
}
