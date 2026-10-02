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
  bulletText,
  resumeBlurb,
  resumeBlurbParts,
  resumeBriefLines,
  resumeStack,
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
  // links. Matches --color-resume in light mode.
  accent: "#1f4e8c",
};

// Text only. The web résumé shows each job's media thumbnails; the PDF
// leaves them out, since a printed résumé is read for the words and the
// pictures only crowd the page.
const WAVE_HEIGHT = 16;

// Type sizes, in points, shared by the styles and the layout simulation.
const SIZE = {
  name: 20,
  headline: 9.5,
  page: 8.5, // summary
  contact: 8,
  label: 7.5, // section headings
  text: 8, // experience, projects, skills
  briefLabel: 6,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    // Deeper than the top, so the last line on a page stops well short of
    // the paper's edge.
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: SIZE.page,
    color: colors.inkDim,
    lineHeight: 1.45,
  },
  name: {
    fontSize: SIZE.name,
    lineHeight: 1.2,
    color: colors.ink,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  headline: { fontSize: SIZE.headline, color: colors.ink, fontFamily: "Helvetica-Oblique" },
  summary: { marginTop: 6, fontSize: SIZE.page, color: colors.inkDim, lineHeight: 1.5 },
  contactRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 10, fontSize: SIZE.contact, color: colors.inkMute },
  contactItem: { color: colors.inkMute },
  contactLink: { color: colors.inkMute, textDecoration: "none" },

  sectionLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: SIZE.label,
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

  skillsLine: { marginBottom: 3, fontSize: SIZE.text, color: colors.inkDim, lineHeight: 1.4 },
  skillsLabel: { color: colors.ink, fontFamily: "Helvetica-Bold" },

  wave: { position: "absolute", left: 0, right: 0, bottom: 0, width: 612, height: WAVE_HEIGHT },

  // Everything under the hero runs in two newspaper columns; see flow().
  flowPage: { flexDirection: "row", gap: 14 },
  flowFirst: { marginTop: 14 },
  flowColumn: { flex: 1 },
  columnLabel: { marginTop: 10 },
  columnLabelTop: { marginTop: 0 },

  // An experience entry is laid out like a project: date beside, text after.
  expRow: { flexDirection: "row", paddingVertical: 3 },
  expBody: { flex: 1, fontSize: SIZE.text, color: colors.inkDim, lineHeight: 1.4 },
  expTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },
  expOrg: { color: colors.inkDim, fontFamily: "Helvetica" },
  expOrgLink: { color: colors.accent, fontFamily: "Helvetica", textDecoration: "underline" },
  expPara: { marginTop: 2 },

  projItem: { flexDirection: "row", paddingVertical: 2 },
  // Dates follow the title, muted, rather than taking a column of their own.
  date: { color: colors.inkMute, fontFamily: "Helvetica" },
  projText: { flex: 1, fontSize: SIZE.text, color: colors.inkDim, lineHeight: 1.4 },
  projTitle: { color: colors.ink, fontFamily: "Helvetica-Bold" },
  projAward: { color: colors.accent, fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  projRepo: { color: colors.inkMute, textDecoration: "none" },
  projIcon: { fontFamily: "ResumeIcons" },
  projInlineLink: { color: colors.accent, textDecoration: "underline" },
  projLabel: { color: colors.accent, fontFamily: "Helvetica-Bold", fontSize: SIZE.briefLabel, letterSpacing: 0.4 },
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
  const stack = resumeStack(n);
  return (
    <View style={styles.projItem}>
      {/* react-pdf allows a line break wherever two styles meet with no space
          between them, and charges it as a hyphenation penalty. Words are
          never hyphenated here, so those style seams are the only such breaks
          — the octocat against its repo name, the title against its colon —
          and an infinite penalty forbids them. */}
      <Text style={styles.projText} {...NO_SEAM_BREAKS}>
        <Text style={styles.projTitle}>{pdfTitle(n)}</Text>
        <Text style={styles.date}> · {pdfDate(n)}</Text>
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
        {stack && <Text style={styles.projTech}> · {stack}</Text>}
      </Text>
    </View>
  );
}

// Below the hero, the whole resume — experience, projects, skills — runs in
// two newspaper columns: down the left column to the foot of the page, then
// down the right, then on to the next page. react-pdf has no columns of its
// own, and can't break a pair of side-by-side columns across a page
// (whatever runs past the foot is drawn in a heap through the margin), so
// the breaks are worked out here. Each page is one unsplittable block of
// two columns, filled from a simulation of the flow: the hero above, and
// each block's text, wrapped with Helvetica's own widths at its real width
// and size.

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
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const PROJ_TEXT_WIDTH = COLUMN_WIDTH;
// The simulation is close, not exact, and it runs short: bold metrics and
// the brief labels set wider than the plain Helvetica it measures, and over
// a full column of projects that adds up to more than a line or two. A
// column that runs past the page doesn't spill — react-pdf squashes the
// whole page to fit, every line on top of the next — so fill each column
// only to this share of its room.
const COLUMN_FILL = 0.94;

// A project's date on the title line: the narrow-column line breaks in a
// multi-stretch label ("Apr 2022 –\nDec 2022,\nSep 2026") become spaces.
function pdfDate(n: Node): string {
  return unbroken(formatResumeDate(n).replace(/\n/g, " "));
}

// A date range kept on one line: its spaces made non-breaking, so the line
// breaker never strands "2024" below "Sep 2024 – Dec". The simulation
// splits words on \s, which matches a non-breaking space, so it costs the
// range with "_" instead — about the same width, and not a break.
const NBSP = "\u00a0";
function unbroken(range: string): string {
  return range.replace(/ /g, NBSP);
}
function simDate(range: string): string {
  return range.replace(/[ \u00a0]/g, "_");
}

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
  const stack = resumeStack(n);
  const blurb = brief
    ? brief.map((l) => `${l.label} ${l.parts.map((p) => p.text).join("")}`).join(" ")
    : resumeBlurb(n).replace(/\*\*|\]\([^)]*\)|\[/g, "");
  const text = [
    `${pdfTitle(n)} · ${simDate(pdfDate(n))}:`,
    blurb,
    ...resumeAwards(n).map((a) => `${a.text}.`),
    ...repos.map((r) => `${GITHUB_MARK}${r.slug}`),
    ...resumePosts(n).map((p) => `${POST_MARKS[p.network]}${p.label}`),
    ...showcases.map((sc) => `${GLOBE}${sc.label}`),
    ...packageLinks(n).map((p) => `${PACKAGE}${p.label}`),
    stack ? `· ${stack}` : "",
  ].join(" ");
  return lineCount(text, PROJ_TEXT_WIDTH, SIZE.text) * SIZE.text * 1.4 + 4; // + projItem's vertical padding
}

// The hero's height: name, headline and contact row.
function heroHeight(): number {
  return SIZE.name * 1.2 + 4 + SIZE.headline * LEADING + 6 + SIZE.contact * LEADING;
}

// One unsplittable piece of the flow. `top` is whether it opens a column,
// where a heading drops its top margin.
type Block = {
  key: string;
  height: (top: boolean) => number;
  render: (top: boolean) => React.ReactElement;
  // A heading: never left alone at the foot of a column.
  keepWithNext?: boolean;
};

function textHeight(text: string, width: number): number {
  return lineCount(text, width, SIZE.text) * SIZE.text * 1.4;
}

function heading(label: string): Block {
  return {
    key: `h-${label}`,
    keepWithNext: true,
    // sectionLabel's line, padding, rule and bottom margin, plus its top
    // margin unless it opens a column.
    height: (top) => (top ? 0 : 10) + SIZE.label * LEADING + 3 + 0.5 + 6,
    render: (top) => (
      <Text style={[styles.sectionLabel, top ? styles.columnLabelTop : styles.columnLabel]}>{label}</Text>
    ),
  };
}

type Job = (typeof experience)[number];

function experienceBlock(e: Job): Block {
  const head = [e.title, e.org, simDate(e.range)].filter(Boolean).join(" · ");
  return {
    key: `exp-${e.org}-${e.title}-${e.range}`,
    height: () => {
      let h = textHeight(head, PROJ_TEXT_WIDTH) * 1.05; // bold runs wide
      for (const b of e.bullets) h += 2 + textHeight(bulletText(b), PROJ_TEXT_WIDTH);
      return h + 6; // + expRow's vertical padding
    },
    render: () => (
      <View style={styles.expRow}>
        <View style={styles.expBody}>
          {/* An entry with no title (the career break) shows its dates alone. */}
          <Text>
            {e.title ? <Text style={styles.expTitle}>{e.title}</Text> : null}
            {e.org ? <Text style={styles.expOrg}> · </Text> : null}
            {e.org && e.href ? (
              <Link src={e.href} style={styles.expOrgLink}>{e.org}</Link>
            ) : e.org ? (
              <Text style={styles.expOrg}>{e.org}</Text>
            ) : null}
            <Text style={styles.date}>{e.title ? " · " : ""}{unbroken(e.range)}</Text>
          </Text>
          {/* Paragraphs, not bullets: each entry reads as prose. */}
          {e.bullets.map((b) => (
            <Text key={bulletText(b)} style={styles.expPara}>
              {typeof b === "string"
                ? b
                : b.map((part, j) =>
                    typeof part === "string" ? (
                      part
                    ) : (
                      <Link key={j} src={part.href} style={styles.expOrgLink}>
                        {part.text}
                      </Link>
                    ),
                  )}
            </Text>
          ))}
        </View>
      </View>
    ),
  };
}

function projectBlock(n: ResumeProject): Block {
  return { key: `proj-${n.id}`, height: () => projectHeight(n), render: () => <ProjectItem n={n} /> };
}

function skillsBlock(g: (typeof meta.skills)[number]): Block {
  return {
    key: `skills-${g.label}`,
    height: () => textHeight(`${g.label}: ${g.items.join(", ")}`, COLUMN_WIDTH) * 1.02 + 3,
    render: () => (
      <Text style={styles.skillsLine}>
        <Text style={styles.skillsLabel}>{g.label}: </Text>
        {g.items.join(", ")}
      </Text>
    ),
  };
}

// Pour the blocks into pages of two columns. Each entry in a column is a
// block and whether it opens that column.
type Placed = { block: Block; top: boolean };

function flow(blocks: Block[]): Placed[][][] {
  // The first page's columns start under the hero and flowFirst's margin.
  let room = CONTENT_HEIGHT - heroHeight() - 14;
  const pages: Placed[][][] = [];
  let columns: Placed[][] = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    const column = () => columns[columns.length - 1];
    const need = (top: boolean) =>
      b.height(top) + (b.keepWithNext && blocks[i + 1] ? blocks[i + 1].height(false) : 0);
    if (column().length > 0 && used + need(false) > room * COLUMN_FILL) {
      if (columns.length === 1) {
        columns.push([]);
      } else {
        pages.push(columns);
        columns = [[]];
        room = CONTENT_HEIGHT;
      }
      used = 0;
    }
    const top = column().length === 0;
    column().push({ block: b, top });
    used += b.height(top);
  });
  pages.push(columns);
  return pages;
}

function Columns({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {flow(blocks).map((columns, p) => (
        <View
          key={columns[0][0]?.block.key ?? p}
          wrap={false}
          break={p > 0}
          style={[styles.flowPage, p === 0 ? styles.flowFirst : {}]}
        >
          {[0, 1].map((i) => (
            <View key={i} style={styles.flowColumn}>
              {(columns[i] ?? []).map(({ block, top }) => (
                <View key={block.key}>{block.render(top)}</View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </>
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

        {/* No heading: a gap is enough to set the experience apart. */}
        <Columns
          blocks={[
            ...experience.map(experienceBlock),
            ...(listed.length ? [heading("Projects"), ...listed.map(projectBlock)] : []),
            heading("Skills (ATS)"),
            ...meta.skills.map(skillsBlock),
          ]}
        />
      </Page>
    </Document>
  );
}

// `mode: "cv"` lists every project; see ResumeMode.
export async function renderResumePdf(projects: Node[], mode: ResumeMode = "resume"): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument projects={projects} mode={mode} />);
}
