"use client";

import Link from "next/link";
import {
  Activity,
  BrainCircuit,
  ChevronRight,
  Database,
  Download,
  Eye,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { InteractiveReplay } from "./InteractiveReplay";
import { AutoplayDuel, MotionGallery } from "./MotionEvidence";
import {
  ASSET_ROOT,
  FULL_BLEED,
  SOURCE_ROOT,
  formatSigned,
  scenarioById,
  scenarios,
  toneColor,
  type ScenarioId,
} from "./study-model";

function HeroMetric({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-[#f1b74c]">
        {icon}
        <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-[#7f8b99]">
          study
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-[#8f9baa]">{label}</div>
    </div>
  );
}

function Claim({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-[#dfe5ec]">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#85919f]">{body}</p>
    </div>
  );
}

function StudyHeader() {
  return (
    <header className="relative overflow-hidden px-4 pb-8 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pb-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_5%,rgba(241,183,76,.14),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(82,199,226,.1),transparent_34%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[#8793a2]">
            JVBOID research release · embodied metacognition 001
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-[#5cd199]/25 bg-[#5cd199]/8 px-3 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.11em] text-[#7fe0af]">
              reproducible
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.11em] text-[#9ca7b4]">
              fixed-seed motion
            </span>
          </div>
        </div>
        <div className="grid gap-7 pt-7 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[#f1b74c]">
              predictive self-modeling in a humanoid body
            </div>
            <h2 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-[.98] tracking-[-.035em] text-white sm:text-6xl lg:text-7xl">
              A robot that predicts its own failure
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#a7b1bd] sm:text-lg">
              Two parameter-matched recurrent policies inhabit the same articulated humanoid. One predicts the world. The other also predicts how its own sensors, memory, actuators, and learning operator will fail—and can act on that forecast.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <HeroMetric value="120" label="paired evaluations" icon={<Activity size={15} />} />
            <HeroMetric value="9,307" label="parameters each" icon={<BrainCircuit size={15} />} />
            <HeroMetric value="6" label="fault regimes" icon={<ShieldAlert size={15} />} />
            <HeroMetric value="3D" label="live policy replay" icon={<Eye size={15} />} />
          </div>
        </div>
        <AutoplayDuel />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Claim
            icon={<BrainCircuit size={16} />}
            title="Operational self-awareness"
            body="Measured by prospective self-transition accuracy and causal intervention value—not verbal self-description."
          />
          <Claim
            icon={<Wrench size={16} />}
            title="Exact-capacity comparison"
            body="The recurrent core, inputs, body, action set, parameter count, and training budget are matched."
          />
          <Claim
            icon={<Database size={16} />}
            title="Every pose is recorded"
            body="The browser replays published joint trajectories and telemetry from median-effect evaluated runs."
          />
        </div>
      </div>
    </header>
  );
}

function EvidenceMatrix() {
  return (
    <section className="border-t border-white/8 px-4 py-8 sm:px-7 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[.62fr_1.38fr]">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.17em] text-[#8793a2]">
            result matrix
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
            The answer is conditional
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#9ca7b4]">
            Self-awareness is not a global capability multiplier in this study. It helps when a predictable internal failure changes which experiment or repair should be selected. It hurts when the ordinary controller already adapts or the self-model over-diagnoses.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {scenarios.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group rounded-2xl border border-white/8 bg-white/[0.025] p-4 no-underline transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.045]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.13em]"
                    style={{ color: toneColor(item.tone) }}
                  >
                    {item.verdict}
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-white">{item.title}</h4>
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-xs"
                  style={{ color: toneColor(item.tone) }}
                >
                  {formatSigned(item.delta)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#8793a2]">{item.signature}</p>
              <div className="mt-3 flex items-center gap-1 font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.11em] text-[#687483] group-hover:text-[#dfe5ec]">
                full record <ChevronRight size={11} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Downloads() {
  const downloads = [
    ["Published artifact directory", SOURCE_ROOT, "replays, figures, data, and source"],
    [
      "Full simulation source",
      `${ASSET_ROOT}/code/simulate.py.gz.b64`,
      "gzip + base64 · decoding instructions in README",
    ],
    [
      "All episode-level results",
      `${ASSET_ROOT}/data/benchmark_episode_results.csv.gz.b64`,
      "360 policy episodes · gzip + base64",
    ],
    [
      "Paired statistical summary",
      `${ASSET_ROOT}/data/paired_summary.csv`,
      "means, medians, bootstrap intervals",
    ],
    [
      "Representative seed record",
      `${ASSET_ROOT}/data/representative_seeds.json`,
      "declared anti-cherry-picking selection",
    ],
    [
      "Study manifest",
      `${ASSET_ROOT}/data/study.json`,
      "architectures, regimes, and evaluation contract",
    ],
    [
      "Integrity manifest",
      `${ASSET_ROOT}/data/asset-manifest.json`,
      "byte counts and SHA-256 hashes",
    ],
  ] as const;

  return (
    <section className="border-t border-white/8 px-4 py-8 sm:px-7 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.17em] text-[#8793a2]">
            open artifact
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
            Audit the claim from the raw traces
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#96a2b0]">
            Every live animation above is reconstructed from the published fixed-seed trajectory logs. The artifact directory includes compact replay data, statistical summaries, architecture figures, and integrity metadata.
          </p>
        </div>
        <div className="grid gap-2">
          {downloads.map(([label, href, description]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 no-underline transition hover:border-white/20 hover:bg-white/[0.045]"
            >
              <span>
                <span className="block text-sm font-medium text-white">{label}</span>
                <span className="mt-0.5 block font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#74808e]">
                  {description}
                </span>
              </span>
              <Download size={16} className="shrink-0 text-[#7f8b99] group-hover:text-[#f1b74c]" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.12em] text-[#778392]">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

export function HumanoidStudy() {
  return (
    <div className={FULL_BLEED}>
      <StudyHeader />
      <MotionGallery />
      <InteractiveReplay />
      <EvidenceMatrix />
      <Downloads />
    </div>
  );
}

export function HumanoidExperiment({ scenario }: { scenario: ScenarioId }) {
  const selected = scenarioById[scenario] ?? scenarioById.sensor_corruption;
  return (
    <div className={FULL_BLEED}>
      <div className="px-4 pb-3 pt-6 sm:px-7 lg:px-10">
        <div
          className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em]"
          style={{ color: toneColor(selected.tone) }}
        >
          {selected.verdict}
        </div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-5xl">
          {selected.title}
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-[#9ca7b4]">{selected.result}</p>
      </div>
      <div className="px-4 pb-8 sm:px-7 lg:px-10">
        <AutoplayDuel initialScenario={scenario} fixed />
        <InteractiveReplay initialScenario={scenario} compact />
      </div>
      <div className="grid gap-3 border-t border-white/8 p-5 sm:grid-cols-3 sm:p-7 lg:p-10">
        <Metric label="SA − G+" value={formatSigned(selected.delta)} />
        <Metric
          label="95% interval"
          value={`${formatSigned(selected.ci[0])} … ${formatSigned(selected.ci[1])}`}
        />
        <Metric label="paired runs" value="20" />
      </div>
    </div>
  );
}
