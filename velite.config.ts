import { defineConfig, defineCollection, s } from "velite";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Shared shape for graph nodes. Frontmatter validation. See docs/CONTENT_MODEL.md.
const lane = s.enum(["research", "building", "writing", "personal"]);
const edgeKind = s.enum(["influence", "realization", "critique", "collaboration"]);

const baseFields = {
  title: s.string().max(140),
  date: s.isodate(),
  endDate: s.isodate().optional(),
  lane,
  tags: s.array(s.string()).default([]),
  summary: s.string().max(400),
  hero: s.object({ src: s.string(), alt: s.string() }).optional(),
  influences: s.array(s.string()).default([]),
  realizes: s.array(s.string()).default([]),
  critiques: s.array(s.string()).default([]),
  // copyLinkedFiles=false: bare-path markdown links like
  // `[txt](Owner/Repo)` are common in migrated content; without this,
  // Velite tries to resolve them as filesystem assets and fails.
  // remark-math: lets `$...$` and `$$...$$` survive MDX brace/angle
  // parsing so LaTeX inside posts doesn't crash the build.
  body: s.mdx({
    copyLinkedFiles: false,
    remarkPlugins: [remarkGfm, remarkMath],
  }),
};

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({ ...baseFields, slug: s.path() })
    .transform((d) => ({ ...d, kind: "post" as const })),
});

const projects = defineCollection({
  name: "Project",
  pattern: "projects/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      status: s.enum(["idea", "active", "shipped", "shelved"]).default("active"),
      // YouTube/Vimeo/self-hosted demo video. When present, the reader
      // Hero renders it as a 16:9 embed. See docs/PORTFOLIO_PRINCIPLES.md
      // — "visuals are a must".
      video: s.string().optional(),
      links: s
        .object({
          github: s.string().optional(),
          demo: s.string().optional(),
          paper: s.string().optional(),
        })
        .optional(),
    })
    .transform((d) => ({ ...d, kind: "project" as const })),
});

const papers = defineCollection({
  name: "Paper",
  pattern: "papers/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      authors: s.array(s.string()),
      venue: s.string().optional(),
      bibKey: s.string().optional(),
      pdf: s.string().optional(),
    })
    .transform((d) => ({ ...d, kind: "paper" as const })),
});

const readings = defineCollection({
  name: "Reading",
  pattern: "readings/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      authors: s.array(s.string()).default([]),
      workType: s.enum(["book", "paper", "article", "course", "other"]).default("book"),
      status: s.enum(["queued", "reading", "finished", "paused", "reference"]).default("reading"),
      source: s.string().optional(),
      url: s.string().optional(),
    })
    .transform((d) => ({ ...d, kind: "reading" as const })),
});

const updates = defineCollection({
  name: "Update",
  pattern: "updates/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      updateType: s.enum(["note", "x-post", "link", "embed"]).default("note"),
      url: s.string().optional(),
      embed: s
        .object({
          kind: s.enum(["x", "url", "html"]).default("url"),
          url: s.string().optional(),
          urls: s.array(s.string()).optional(),
          html: s.string().optional(),
          alt: s.string().optional(),
        })
        .optional(),
    })
    .transform((d) => ({ ...d, kind: "update" as const })),
});

const skills = defineCollection({
  name: "Skill",
  pattern: "skills/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      category: s.string(),
      level: s.enum(["working", "strong", "expert"]).default("strong"),
      tools: s.array(s.string()).default([]),
      evidence: s.array(s.string()).default([]),
    })
    .transform((d) => ({ ...d, kind: "skill" as const })),
});

const friends = defineCollection({
  name: "Friend",
  pattern: "friends/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      relation: s.string().optional(),
      location: s.string().optional(),
      links: s
        .object({
          website: s.string().optional(),
          x: s.string().optional(),
          github: s.string().optional(),
          linkedin: s.string().optional(),
        })
        .optional(),
    })
    .transform((d) => ({ ...d, kind: "friend" as const })),
});

const events = defineCollection({
  name: "Event",
  pattern: "events/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      eventType: s
        .enum([
          "conference",
          "meetup",
          "talk",
          "workshop",
          "hackathon",
          "travel",
          "launch",
          "other",
        ])
        .default("other"),
      status: s
        .enum(["upcoming", "attended", "presented", "hosted", "cancelled"])
        .default("attended"),
      role: s.string().optional(),
      venue: s.string().optional(),
      location: s.string().optional(),
      url: s.string().optional(),
    })
    .transform((d) => ({ ...d, kind: "event" as const })),
});

const visions = defineCollection({
  name: "Vision",
  pattern: "visions/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      sceneId: s.string().optional(),
    })
    .transform((d) => ({ ...d, kind: "vision" as const })),
});

const experience = defineCollection({
  name: "Experience",
  pattern: "experience/**/*.mdx",
  schema: s
    .object({
      ...baseFields,
      slug: s.path(),
      org: s.string(),
      links: s.object({ org: s.string().optional() }).optional(),
    })
    .transform((d) => ({ ...d, kind: "experience" as const })),
});

const loop = defineCollection({
  name: "LoopChapter",
  pattern: "loop/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(140),
      order: s.number().int(),
      summary: s.string().max(400),
      slug: s.path(),
      body: s.mdx({
        copyLinkedFiles: false,
        remarkPlugins: [remarkGfm, remarkMath],
      }),
    })
    .transform((d) => ({ ...d, kind: "loop" as const })),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: {
    posts,
    projects,
    papers,
    readings,
    updates,
    skills,
    friends,
    events,
    visions,
    experience,
    loop,
  },
});

// Type for hand-curated edges, used in src/data/edges.ts.
export type ManualEdge = {
  source: string;
  target: string;
  kind: "influence" | "realization" | "critique" | "collaboration";
  weight?: number;
  note?: string;
};
