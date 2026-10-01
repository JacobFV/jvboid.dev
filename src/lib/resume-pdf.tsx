// PDF document component, `<ResumeDocument projects={...} />`. Server-only — never import from a
// client component (it pulls in @react-pdf/renderer, which is large and
// node-only at our usage). Routes that need the PDF binary should call
// `renderResumePdf()` from a route handler.

import path from "node:path";
import { Document, Page, Text, View, StyleSheet, Link, Font, renderToBuffer } from "@react-pdf/renderer";
import type { Node } from "./graph-types";
import {
  contact,
  experience,
  formatResumeDate,
  githubRepo,
  resumeAwards,
  showcaseLink,
  packageLinks,
  type BlurbPart,
  onResume,
  resumeBlurbParts,
  resumeMeta as meta,
} from "./resume-data";

// Never hyphenate. A keyword split across lines ("reinforce-ment") comes out
// of the PDF's text layer as two fragments, and ATS parsers match on the
// text layer.
Font.registerHyphenationCallback((word) => [word]);

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
    // Kept tight: wide tracking extracts as "S K I L L S", which an ATS
    // won't recognise as a heading.
    letterSpacing: 0.6,
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

  skillsLine: { marginBottom: 2, fontSize: 9, color: colors.inkDim, lineHeight: 1.45 },
  skillsLabel: { color: colors.ink, fontFamily: "Helvetica-Bold" },

  experience: { marginTop: 14 },
  expRow: { flexDirection: "row", marginBottom: 8 },
  expDate: { width: 104, paddingRight: 8, fontSize: 8.5, color: colors.inkMute },
  expBody: { flex: 1 },
  expTitle: { fontSize: 10, color: colors.ink, fontFamily: "Helvetica-Bold" },
  expOrg: { color: colors.inkDim, fontFamily: "Helvetica" },
  expOrgLink: { color: colors.inkDim, fontFamily: "Helvetica", textDecoration: "underline" },
  expPara: { marginTop: 1, fontSize: 9, color: colors.inkDim },
  expParaNext: { marginTop: 3 },

  projItem: { flexDirection: "row", paddingVertical: 2 },
  projYear: { width: 46, paddingRight: 4, fontSize: 7.5, color: colors.inkMute },
  projText: { flex: 1, fontSize: 8.5, color: colors.inkDim, lineHeight: 1.4 },
  projTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },
  projAward: { color: colors.ink, fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  projRepo: { color: colors.inkMute, textDecoration: "none" },
  projIcon: { fontFamily: "ResumeIcons" },
  projInlineLink: { color: colors.ink, textDecoration: "underline" },
  projStrong: { color: colors.ink, fontFamily: "Helvetica-Bold" },
  projTech: { color: colors.inkMute },
});

// Icons are glyphs in a small font built by scripts/build-resume-icon-font.py
// (the octocat is the site's own, from SocialGlyphs). An inline <Image> can't
// be kept on the same line as its label; a glyph can (see the penalty on
// ProjectItem). Each glyph's advance width carries the gap before the label.
Font.register({
  family: "ResumeIcons",
  src: path.join(process.cwd(), "src/lib/resume-fonts/resume-icons.ttf"),
});
const GITHUB_MARK = "\uE000";
const GLOBE = "\uE001";
const PACKAGE = "\uE002";

// One run of a project's resume line; see BlurbPart for the markup.
function BlurbRun({ part }: { part: BlurbPart }) {
  if (part.href) return <Link src={part.href} style={styles.projInlineLink}>{part.text}</Link>;
  if (part.strong) return <Text style={styles.projStrong}>{part.text}</Text>;
  if (part.tech) return <Text style={styles.projTech}>{part.text}</Text>;
  return <Text>{part.text}</Text>;
}

// An icon + label link at the end of a project line (repo, site, package).
function IconLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link src={href} style={styles.projRepo}>
      {" "}
      <Text style={styles.projIcon}>{icon}</Text>
      {label}
    </Link>
  );
}

// The layout engine reads `hyphenationPenalty` off a Text's props, but
// @react-pdf/renderer's TextProps type doesn't declare it.
const NO_SEAM_BREAKS = { hyphenationPenalty: 10000 } as object;

function ProjectItem({ n }: { n: Node }) {
  const repo = githubRepo(n);
  const showcase = showcaseLink(n);
  return (
    <View style={styles.projItem} wrap={false}>
      <Text style={styles.projYear}>{formatResumeDate(n)}</Text>
      {/* react-pdf allows a line break wherever two styles meet with no space
          between them, and charges it as a hyphenation penalty. Words are
          never hyphenated here, so those style seams are the only such breaks
          — the octocat against its repo name, the title against its colon —
          and an infinite penalty forbids them. */}
      <Text style={styles.projText} {...NO_SEAM_BREAKS}>
        <Text style={styles.projTitle}>{n.title}</Text>
        <Text>
          {": "}
          {resumeBlurbParts(n).map((part, i) => (
            <BlurbRun key={i} part={part} />
          ))}
        </Text>
        {resumeAwards(n).map((a) => (
          <Text key={a.href}>
            {" "}
            <Link src={a.href} style={styles.projAward}>{a.text}</Link>.
          </Text>
        ))}
        {repo ? <IconLink href={repo.href} icon={GITHUB_MARK} label={repo.slug} /> : null}
        {showcase ? <IconLink href={showcase.href} icon={GLOBE} label={showcase.label} /> : null}
        {packageLinks(n).map((pkg) => (
          <IconLink key={pkg.href} href={pkg.href} icon={PACKAGE} label={pkg.label} />
        ))}
      </Text>
    </View>
  );
}

// One project per row, full width, so each is exactly as tall as its text
// and every project gets the same space above and below. (Two across meant
// rows of pairs — react-pdf can't break two side-by-side columns across a
// page — and every pair was as tall as its longer half.)
function ProjectGroup({ items }: { items: Node[] }) {
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  return (
    <View>
      {/* The heading travels with the first project, so it is never left
          alone at the foot of a page with its projects overleaf. */}
      <View wrap={false}>
        <Text style={styles.sectionLabel}>Projects</Text>
        <ProjectItem n={first} />
      </View>
      {rest.map((n) => (
        <ProjectItem key={n.id} n={n} />
      ))}
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

        {/* No heading: a gap is enough to set the experience apart. */}
        <View style={styles.experience}>
          {experience.map((e) => (
            <View key={`${e.org}-${e.title}-${e.range}`} style={styles.expRow} wrap={false}>
              <Text style={styles.expDate}>{e.range}</Text>
              <View style={styles.expBody}>
                {e.title ? (
                  <Text>
                    <Text style={styles.expTitle}>{e.title}</Text>
                    <Text style={styles.expOrg}> · </Text>
                    {e.href ? (
                      <Link src={e.href} style={styles.expOrgLink}>{e.org}</Link>
                    ) : (
                      <Text style={styles.expOrg}>{e.org}</Text>
                    )}
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
          <Text style={styles.sectionLabel}>Skills (ATS)</Text>
          {meta.skills.map((g) => (
            <Text key={g.label} style={styles.skillsLine}>
              <Text style={styles.skillsLabel}>{g.label}: </Text>
              {g.items.join(", ")}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderResumePdf(projects: Node[]): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument projects={projects} />);
}
