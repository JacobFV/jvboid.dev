// PDF document component. One `<ResumeDocument variant="..." projects={...} />`
// covers both software and robotics. Server-only — never import from a
// client component (it pulls in @react-pdf/renderer, which is large and
// node-only at our usage). Routes that need the PDF binary should call
// `renderResumePdf()` from a route handler.

import { Document, Page, Text, View, StyleSheet, Link, renderToBuffer } from "@react-pdf/renderer";
import type { Node } from "./graph-types";
import { contact, experience, projectFocus, variantMeta, type ResumeVariant } from "./resume-data";

const colors = {
  ink: "#111111",
  inkDim: "#3a3a3a",
  inkMute: "#6b6b6b",
  rule: "#dcdcdc",
  accent: "#b34700",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 38,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.inkDim,
    lineHeight: 1.45,
  },
  name: { fontSize: 22, color: colors.ink, fontFamily: "Helvetica-Bold", letterSpacing: 0.2 },
  headline: { marginTop: 2, fontSize: 10, color: colors.accent, fontFamily: "Helvetica-Oblique" },
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

  strengthsRow: { flexDirection: "row", flexWrap: "wrap" },
  strengthChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#f3f1ec",
    color: colors.inkDim,
    fontSize: 8.5,
    marginRight: 4,
    marginBottom: 4,
  },

  expRow: { flexDirection: "row", marginBottom: 8 },
  expDate: { width: 104, paddingRight: 8, fontSize: 8.5, color: colors.inkMute },
  expBody: { flex: 1 },
  expTitle: { fontSize: 10, color: colors.ink, fontFamily: "Helvetica-Bold" },
  expOrg: { color: colors.inkDim, fontFamily: "Helvetica" },
  expSummary: { marginTop: 1, fontSize: 9, color: colors.inkDim },
  expTags: { marginTop: 2, fontSize: 7.5, color: colors.inkMute, letterSpacing: 0.5 },

  projGroupLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 8,
    color: colors.ink,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  projCols: { flexDirection: "row", gap: 14 },
  projCol: { flex: 1 },
  projItem: { flexDirection: "row", marginBottom: 2.4 },
  projYear: { width: 28, fontSize: 7.5, color: colors.inkMute },
  projText: { flex: 1, fontSize: 8.5, color: colors.inkDim, lineHeight: 1.4 },
  projTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: colors.inkMute,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function year(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).getUTCFullYear().toString();
}

function splitColumns<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function ProjectColumn({ items }: { items: Node[] }) {
  return (
    <View style={styles.projCol}>
      {items.map((n) => (
        <View key={n.id} style={styles.projItem} wrap={false}>
          <Text style={styles.projYear}>{year(n.date)}</Text>
          <Text style={styles.projText}>
            <Text style={styles.projTitle}>{n.title}</Text>
            {n.summary ? <Text> — {n.summary}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProjectGroup({ label, items }: { label: string; items: Node[] }) {
  if (items.length === 0) return null;
  const [a, b] = splitColumns(items);
  return (
    <View>
      <Text style={styles.projGroupLabel}>{label}</Text>
      <View style={styles.projCols}>
        <ProjectColumn items={a} />
        <ProjectColumn items={b} />
      </View>
    </View>
  );
}

export function ResumeDocument({
  variant,
  projects,
}: {
  variant: ResumeVariant;
  projects: Node[];
}) {
  const meta = variantMeta[variant];

  const focused: Node[] = [];
  const adjacent: Node[] = [];
  for (const n of projects) {
    const focus = projectFocus(n);
    if (focus[variant]) focused.push(n);
    else adjacent.push(n);
  }

  const sortByDateDesc = (a: Node, b: Node) => (a.date < b.date ? 1 : -1);
  focused.sort(sortByDateDesc);
  adjacent.sort(sortByDateDesc);

  const focusLabel = variant === "software" ? "Software & AI" : "Robotics & embodied AI";

  return (
    <Document
      title={`Jacob Valdez — ${variant === "software" ? "Software" : "Robotics"} Resume`}
      author={contact.name}
      subject={`${variant} resume`}
    >
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.headline}>{meta.headline}</Text>
          <Text style={styles.summary}>{meta.summary}</Text>
          <View style={styles.contactRow}>
            <Link src={`mailto:${contact.email}`} style={styles.contactLink}>{contact.email}</Link>
            <Text style={styles.contactItem}>{contact.phone}</Text>
            <Link src={`https://${contact.website}`} style={styles.contactLink}>{contact.website}</Link>
            <Link src={`https://${contact.github}`} style={styles.contactLink}>{contact.github}</Link>
            <Text style={styles.contactItem}>{contact.twitter}</Text>
            <Text style={styles.contactItem}>{contact.location}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Highlights</Text>
        <View>
          {meta.highlights.map((h, i) => (
            <View key={i} style={styles.highlightItem} wrap={false}>
              <View style={styles.highlightBullet} />
              <Text>{h}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Strengths</Text>
        <View style={styles.strengthsRow}>
          {meta.strengths.map((s) => (
            <Text key={s} style={styles.strengthChip}>{s}</Text>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Experience</Text>
        <View>
          {experience.map((e) => (
            <View key={`${e.org}-${e.title}`} style={styles.expRow} wrap={false}>
              <Text style={styles.expDate}>{e.range}</Text>
              <View style={styles.expBody}>
                <Text>
                  <Text style={styles.expTitle}>{e.title}</Text>
                  <Text style={styles.expOrg}> · {e.org}</Text>
                </Text>
                <Text style={styles.expSummary}>{e.summary}</Text>
                <Text style={styles.expTags}>{e.tags.join(" · ")}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Projects</Text>
        <ProjectGroup label={`${focusLabel} — focus`} items={focused} />
        <ProjectGroup label="Adjacent work" items={adjacent} />

        <View style={styles.footer} fixed>
          <Text>{contact.name} — {variant === "software" ? "Software" : "Robotics"} resume</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderResumePdf(variant: ResumeVariant, projects: Node[]): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument variant={variant} projects={projects} />);
}
