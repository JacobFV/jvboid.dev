// PDF document component, `<ResumeDocument projects={...} />`. Server-only — never import from a
// client component (it pulls in @react-pdf/renderer, which is large and
// node-only at our usage). Routes that need the PDF binary should call
// `renderResumePdf()` from a route handler.

import path from "node:path";
import { Document, Page, Text, View, StyleSheet, Link, Font, Svg, Path, renderToBuffer } from "@react-pdf/renderer";
import type { Node } from "./graph-types";
import {
  contact,
  experience,
  formatResumeDate,
  projectRepos,
  projectShowcases,
  resumeProjects,
  type ResumeMode,
  type ResumeProject,
  resumeAwards,
  resumePosts,
  packageLinks,
  type BlurbPart,
  resumeBlurb,
  resumeBlurbParts,
  resumeBriefLines,
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
  // Ink blue, the resume's one colour: section headings and their rules,
  // links, the highlight bullets. Matches --color-resume in light mode.
  accent: "#1f4e8c",
};

// Text only. The web résumé shows each job's media thumbnails; the PDF
// leaves them out, since a printed résumé is read for the words and the
// pictures only crowd the page.
const WAVE_HEIGHT = 16;

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
  headline: { fontSize: 10, color: colors.ink, fontFamily: "Helvetica-Oblique" },
  summary: { marginTop: 6, fontSize: 9.5, color: colors.inkDim, lineHeight: 1.5 },
  contactRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 10, fontSize: 8.5, color: colors.inkMute },
  contactItem: { color: colors.inkMute },
  contactLink: { color: colors.inkMute, textDecoration: "none" },

  sectionLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 8,
    color: colors.accent,
    fontFamily: "Helvetica-Bold",
    // Kept tight: wide tracking extracts as "S K I L L S", which an ATS
    // won't recognise as a heading.
    letterSpacing: 0.6,
    textTransform: "uppercase",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.accent,
    paddingBottom: 3,
  },

  highlights: { marginTop: 10 },
  highlightLink: { color: colors.accent, textDecoration: "underline" },
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

  wave: { position: "absolute", left: 0, right: 0, bottom: 0, width: 612, height: WAVE_HEIGHT },
  experience: { marginTop: 14 },
  expRow: { flexDirection: "row", marginBottom: 8 },
  expDate: { width: 104, paddingRight: 8, fontSize: 8.5, color: colors.inkMute },
  expBody: { flex: 1 },
  expTitle: { fontSize: 10, color: colors.ink, fontFamily: "Helvetica-Bold" },
  expOrg: { color: colors.inkDim, fontFamily: "Helvetica" },
  expOrgLink: { color: colors.accent, fontFamily: "Helvetica", textDecoration: "underline" },
  expPara: { marginTop: 1, fontSize: 9, color: colors.inkDim },
  expParaNext: { marginTop: 3 },

  projBlock: { flexDirection: "row", gap: 14 },
  projColumn: { flex: 1 },
  projItem: { flexDirection: "row", paddingVertical: 2 },
  projYear: { width: 46, paddingRight: 4, fontSize: 7.5, color: colors.inkMute },
  projText: { flex: 1, fontSize: 8.5, color: colors.inkDim, lineHeight: 1.4 },
  projTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },
  projAward: { color: colors.accent, fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  projRepo: { color: colors.inkMute, textDecoration: "none" },
  projIcon: { fontFamily: "ResumeIcons" },
  projInlineLink: { color: colors.accent, textDecoration: "underline" },
  projLabel: { color: colors.accent, fontFamily: "Helvetica-Bold", fontSize: 6.5, letterSpacing: 0.4 },
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
const POST_MARKS = { linkedin: "\uE003", x: "\uE004", commandagi: "\uE005" } as const;

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

function ProjectItem({ n }: { n: ResumeProject }) {
  const repos = projectRepos(n);
  const showcases = projectShowcases(n);
  const brief = resumeBriefLines(n);
  return (
    <View style={styles.projItem}>
      <Text style={styles.projYear}>{formatResumeDate(n)}</Text>
      {/* react-pdf allows a line break wherever two styles meet with no space
          between them, and charges it as a hyphenation penalty. Words are
          never hyphenated here, so those style seams are the only such breaks
          — the octocat against its repo name, the title against its colon —
          and an infinite penalty forbids them. */}
      <Text style={styles.projText} {...NO_SEAM_BREAKS}>
        <Text style={styles.projTitle}>{pdfTitle(n)}</Text>
        {brief ? (
          brief.map((line, li) => (
            <Text key={line.label}>
              {li === 0 ? ": " : " "}
              <Text style={styles.projLabel}>{line.label.toUpperCase()}</Text>{" "}
              {line.parts.map((part, i) => (
                <BlurbRun key={i} part={part} />
              ))}
            </Text>
          ))
        ) : (
          <Text>
            {": "}
            {resumeBlurbParts(n).map((part, i) => (
              <BlurbRun key={i} part={part} />
            ))}
          </Text>
        )}
        {resumeAwards(n).map((a) => (
          <Text key={a.href}>
            {" "}
            <Link src={a.href} style={styles.projAward}>{a.text}</Link>.
          </Text>
        ))}
        {repos.map((repo) => (
          <IconLink key={repo.href} href={repo.href} icon={GITHUB_MARK} label={repo.slug} />
        ))}
        {resumePosts(n).map((post) => (
          <IconLink key={post.href} href={post.href} icon={POST_MARKS[post.network]} label={post.label} />
        ))}
        {showcases.map((sc) => (
          <IconLink key={sc.href} href={sc.href} icon={GLOBE} label={sc.label} />
        ))}
        {packageLinks(n).map((pkg) => (
          <IconLink key={pkg.href} href={pkg.href} icon={PACKAGE} label={pkg.label} />
        ))}
      </Text>
    </View>
  );
}

// Projects run in two newspaper columns: down the left column to the foot
// of the page, then down the right, then on to the next page. react-pdf has
// no columns of its own, and can't break a pair of side-by-side columns
// across a page (whatever runs past the foot is drawn in a heap through the
// margin), so the breaks are worked out here. Each page of projects is one
// unsplittable block of two columns, filled from a simulation of the page
// flow: every line of the document above, and each project's text, wrapped
// with Helvetica's own widths at its real width and size.

// Helvetica's advance widths (per 1000 em) for printable ASCII, from its
// standard AFM metrics; anything else is costed as a digit.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    // The icon glyphs are a full em wide.
    units += code >= 0xe000 && code <= 0xe0ff ? 1000 : (HELVETICA[code - 32] ?? 556);
  }
  return (units / 1000) * size;
}

// How many lines `text` takes at `size` points in a box `width` wide,
// breaking between words the way the PDF does. react-pdf's line breaker
// squeezes the spaces of a line a little to fit one more word, so a space
// is costed short of its full width.
const SPACE_SQUEEZE = 0.6;

function lineCount(text: string, width: number, size: number): number {
  if (text.includes("\n")) {
    return text.split("\n").reduce((sum, line) => sum + lineCount(line, width, size), 0);
  }
  const space = textWidth(" ", size) * SPACE_SQUEEZE;
  let lines = 1;
  let x = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = textWidth(word, size);
    if (x > 0 && x + space + w > width) {
      lines += 1;
      x = w;
    } else {
      x += (x > 0 ? space : 0) + w;
    }
  }
  return lines;
}

// Geometry, in points, mirroring the styles below. Letter is 612 × 792.
const CONTENT_WIDTH = 612 - 2 * 44;
const CONTENT_HEIGHT = 792 - 38 - 56;
const LEADING = 1.45; // the page's line height
const COLUMN_GAP = 14;
const PROJ_DATE_WIDTH = 46;
const PROJ_TEXT_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2 - PROJ_DATE_WIDTH;
// The simulation is close, not exact: leave this much of each column free,
// so a column that runs a little long still fits its page.
const COLUMN_SLACK = 14;

// Helvetica has no emoji, and draws junk for one ("👩🏽‍🌾 The Fertile
// Cresent"), so titles lose them in the PDF.
function pdfTitle(n: Node): string {
  return n.title.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f]/gu, "").trim();
}

function projectHeight(n: ResumeProject): number {
  const repos = projectRepos(n);
  const showcases = projectShowcases(n);
  // A brief runs problem, task and outcome on in one paragraph after the
  // title, each behind its label.
  const brief = resumeBriefLines(n);
  const blurb = brief
    ? brief.map((l) => `${l.label} ${l.parts.map((p) => p.text).join("")}`).join(" ")
    : resumeBlurb(n).replace(/\*\*|\]\([^)]*\)|\[/g, "");
  const text = [
    `${pdfTitle(n)}:`,
    blurb,
    ...resumeAwards(n).map((a) => `${a.text}.`),
    ...repos.map((r) => `${GITHUB_MARK}${r.slug}`),
    ...resumePosts(n).map((p) => `${POST_MARKS[p.network]}${p.label}`),
    ...showcases.map((sc) => `${GLOBE}${sc.label}`),
    ...packageLinks(n).map((p) => `${PACKAGE}${p.label}`),
  ].join(" ");
  const textHeight = lineCount(text, PROJ_TEXT_WIDTH, 8.5) * 8.5 * 1.4;
  const dateHeight = lineCount(formatResumeDate(n), PROJ_DATE_WIDTH - 4, 7.5) * 7.5 * LEADING;
  return Math.max(textHeight, dateHeight) + 4; // + projItem's vertical padding
}

// Where the projects heading starts: how far down its page, after laying
// out the header, highlights and experience as the PDF will.
function projectsStart(): number {
  let y = 22 * 1.2 + 4 + 10 * LEADING + 6 + 8.5 * LEADING; // name, headline, contact row
  y += 10; // highlights' top margin
  for (const parts of meta.highlights) {
    const text = parts.map((p) => (typeof p === "string" ? p : p.text)).join("");
    y += lineCount(text, CONTENT_WIDTH - 10, 9) * 9 * LEADING + 3;
  }
  y += 14; // experience's top margin
  for (const e of experience) {
    let h = e.title ? 10 * LEADING : 0;
    e.bullets.forEach((b, i) => {
      h += (i > 0 ? 3 : 1) + lineCount(b, CONTENT_WIDTH - 104, 9) * 9 * LEADING;
    });
    h += 8; // expRow's bottom margin
    // Rows don't split: one that won't fit starts the next page.
    if (y + h > CONTENT_HEIGHT) y = 0;
    y += h;
  }
  return y;
}

// The projects heading: sectionLabel's margins, line, padding and rule.
const PROJECTS_HEADING = 14 + 8 * LEADING + 3 + 0.5 + 6;

// Pour the projects into pages of two columns.
function paginate(items: Node[]): Node[][][] {
  let room = CONTENT_HEIGHT - projectsStart() - PROJECTS_HEADING;
  // Too little left under the experience for a page of columns to be worth
  // it: the block will start the next page anyway.
  if (room < 120) room = CONTENT_HEIGHT - PROJECTS_HEADING;
  const pages: Node[][][] = [];
  let columns: Node[][] = [[]];
  let used = 0;
  for (const n of items) {
    const h = projectHeight(n);
    if (used + h > room - COLUMN_SLACK && columns[columns.length - 1].length > 0) {
      if (columns.length === 1) {
        columns.push([]);
      } else {
        pages.push(columns);
        columns = [[]];
        room = CONTENT_HEIGHT;
      }
      used = 0;
    }
    columns[columns.length - 1].push(n);
    used += h;
  }
  pages.push(columns);
  return pages;
}

function ProjectPage({ columns }: { columns: Node[][] }) {
  return (
    <View style={styles.projBlock}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.projColumn}>
          {(columns[i] ?? []).map((n) => (
            <ProjectItem key={n.id} n={n} />
          ))}
        </View>
      ))}
    </View>
  );
}

function ProjectGroup({ items }: { items: Node[] }) {
  if (items.length === 0) return null;
  const [first, ...rest] = paginate(items);
  return (
    <View>
      {/* The heading travels with the first page of columns, so it is never
          left alone at the foot of a page with its projects overleaf. */}
      <View wrap={false}>
        <Text style={styles.sectionLabel}>Projects</Text>
        <ProjectPage columns={first} />
      </View>
      {rest.map((columns) => (
        <View key={columns[0][0].id} wrap={false} break>
          <ProjectPage columns={columns} />
        </View>
      ))}
    </View>
  );
}

// One thin, pale ink-blue wave along the foot of every page, bleeding off
// both sides and the bottom edge, inside the page's deep bottom padding so
// it never touches the text. Pale on purpose: a solid band is the darkest
// thing on the page and pulls the eye to the one place with nothing to read.
function Wave() {
  const w = 612;
  const h = WAVE_HEIGHT;
  return (
    <Svg fixed style={styles.wave} viewBox={`0 0 ${w} ${h}`}>
      <Path
        d={`M0 8 C 110 1, 220 14, 330 7 S 530 2, ${w} 9 V ${h} H 0 Z`}
        fill={colors.accent}
        fillOpacity={0.2}
      />
    </Svg>
  );
}

export function ResumeDocument({ projects, mode = "resume" }: { projects: Node[]; mode?: ResumeMode }) {
  const listed = resumeProjects(projects, mode);

  return (
    <Document title="Jacob Valdez — Resume" author={contact.name} subject="resume">
      <Page size="LETTER" style={styles.page}>
        <Wave />
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
                    {e.org ? <Text style={styles.expOrg}> · </Text> : null}
                    {e.org && e.href ? (
                      <Link src={e.href} style={styles.expOrgLink}>{e.org}</Link>
                    ) : e.org ? (
                      <Text style={styles.expOrg}>{e.org}</Text>
                    ) : null}
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

// `mode: "cv"` lists every project; see ResumeMode.
export async function renderResumePdf(projects: Node[], mode: ResumeMode = "resume"): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument projects={projects} mode={mode} />);
}
