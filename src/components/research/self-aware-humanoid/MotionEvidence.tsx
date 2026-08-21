"use client";

import Link from "next/link";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReplayPanel } from "./RobotScene";
import {
  POLICY_COLORS,
  formatSigned,
  scenarioById,
  scenarios,
  toneColor,
  type PolicyReplay,
  type Replay,
  type ScenarioId,
} from "./study-model";
import { useReplay, useReplayClock } from "./useReplay";

function maxReplayTime(data: Replay | null) {
  if (!data) return 0;
  return Math.max(
    ...Object.values(data.policies).map((policy) => policy.frames.at(-1)?.t ?? 0),
  );
}

function Loading({ error }: { error?: string | null }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-white/8 bg-white/[0.02] px-6 text-center font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.14em] text-[#778392]">
      {error ?? "loading evaluated trajectory"}
    </div>
  );
}

export function AutoplayDuel({
  initialScenario = "sensor_corruption",
  fixed = false,
}: {
  initialScenario?: ScenarioId;
  fixed?: boolean;
}) {
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const { data, error } = useReplay(scenario);
  const maxTime = maxReplayTime(data);
  const clock = useReplayClock(maxTime, { autoplay: true, loop: true });
  const meta = scenarioById[scenario];

  useEffect(() => {
    clock.setTime(0);
    clock.setPlaying(true);
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={fixed ? "mt-7" : "border-t border-white/8 px-4 py-8 sm:px-7 lg:px-10"}>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.17em] text-[#8793a2]">
            live embodied policy replay
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
            Watch the policies diverge in the body
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa6b4]">
            These articulated humanoids are replayed directly from the evaluated policy logs. The left agent uses generic recurrent state; the right agent can prospectively model and act on its own failure state.
          </p>
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-[#697584]">
          fixed seed · median paired effect · not hand animated
        </div>
      </div>

      {!fixed ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenario(item.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                scenario === item.id
                  ? "border-white/25 bg-white/8 text-white"
                  : "border-white/8 text-[#8793a2] hover:border-white/20 hover:text-white"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      ) : null}

      {!data ? <Loading error={error} /> : null}
      {data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReplayPanel data={data} policy="G+" time={clock.time} compact />
            <ReplayPanel data={data} policy="SA" time={clock.time} compact />
          </div>
          <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-[#0d1218] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div
                className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.13em]"
                style={{ color: toneColor(meta.tone) }}
              >
                {meta.verdict}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#a5afbb]">{meta.signature}</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#697584]">
                SA − G+ {formatSigned(meta.delta)} · 95% [{formatSigned(meta.ci[0])}, {formatSigned(meta.ci[1])}]
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={clock.playing ? "Pause replay" : "Play replay"}
                onClick={() => clock.setPlaying((current) => !current)}
                className="grid size-10 place-items-center rounded-full bg-[#f1b74c] text-[#0a0c0f] transition hover:scale-[1.03]"
              >
                {clock.playing ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="translate-x-px" />
                )}
              </button>
              <span className="w-14 font-[family-name:var(--font-mono)] text-[10px] text-[#8c98a7]">
                {clock.time.toFixed(1)}s
              </span>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function worldPoint(x: number, z: number): [number, number] {
  return [24 + ((x + 5.5) / 11) * 372, 216 - ((z + 4.5) / 9) * 192];
}

function pathFor(replay: PolicyReplay) {
  return replay.frames
    .map((frame, index) => {
      const [x, y] = worldPoint(frame.position[0], frame.position[2]);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function RobotGlyph({ color }: { color: string }) {
  return (
    <g>
      <circle cx="0" cy="-7" r="3.5" fill="#f3f6f8" />
      <path
        d="M0,-3 L0,7 M-6,1 L6,1 M0,7 L-5,14 M0,7 L5,14"
        fill="none"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="0" cy="1" r="10" fill="none" stroke={color} strokeOpacity=".35" />
    </g>
  );
}

function TraceCard({ scenario }: { scenario: ScenarioId }) {
  const { data, error } = useReplay(scenario);
  const meta = scenarioById[scenario];
  const duration = data ? maxReplayTime(data) : 12;
  const paths = useMemo(() => {
    if (!data) return null;
    return {
      generic: pathFor(data.policies["G+"]),
      self: pathFor(data.policies.SA),
    };
  }, [data]);

  return (
    <Link
      href={meta.href}
      className="group overflow-hidden rounded-2xl border border-white/9 bg-[#0d1218] no-underline transition hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0a0e13]">
        {!data ? (
          <div className="grid h-full place-items-center font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.12em] text-[#687483]">
            {error ? "replay unavailable" : "loading motion"}
          </div>
        ) : (
          <svg viewBox="0 0 420 240" className="h-full w-full" role="img" aria-label={`${meta.title}: G+ and SA policy trajectories`}>
            <defs>
              <linearGradient id={`fade-${scenario}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#141c25" />
                <stop offset="1" stopColor="#090d12" />
              </linearGradient>
            </defs>
            <rect width="420" height="240" fill={`url(#fade-${scenario})`} />
            <g stroke="#263342" strokeWidth="1" opacity=".55">
              {Array.from({ length: 9 }, (_, index) => (
                <line key={`v-${index}`} x1={index * 52.5} y1="0" x2={index * 52.5} y2="240" />
              ))}
              {Array.from({ length: 6 }, (_, index) => (
                <line key={`h-${index}`} x1="0" y1={index * 48} x2="420" y2={index * 48} />
              ))}
            </g>
            {data.obstacles.map(([xmin, xmax, zmin, zmax], index) => {
              const [x1, y2] = worldPoint(xmin, zmin);
              const [x2, y1] = worldPoint(xmax, zmax);
              return (
                <rect
                  key={index}
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  rx="3"
                  fill={index === 3 ? "#47232e" : "#34383c"}
                  stroke={index === 3 ? "#a84961" : "#60666b"}
                  strokeOpacity=".5"
                />
              );
            })}
            <path d={paths?.generic} fill="none" stroke={POLICY_COLORS["G+"]} strokeOpacity=".35" strokeWidth="2" />
            <path d={paths?.self} fill="none" stroke={POLICY_COLORS.SA} strokeOpacity=".35" strokeWidth="2" />
            <g>
              <RobotGlyph color={POLICY_COLORS["G+"]} />
              <animateMotion dur={`${Math.max(duration, 1)}s`} repeatCount="indefinite" path={paths?.generic} />
            </g>
            <g>
              <RobotGlyph color={POLICY_COLORS.SA} />
              <animateMotion dur={`${Math.max(duration, 1)}s`} repeatCount="indefinite" path={paths?.self} />
            </g>
            <g fontFamily="var(--font-mono)" fontSize="9" fontWeight="600">
              <text x="16" y="19" fill={POLICY_COLORS["G+"]}>G+ / GENERIC</text>
              <text x="326" y="19" fill={POLICY_COLORS.SA}>SA / SELF-MODEL</text>
            </g>
          </svg>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d1218] to-transparent" />
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <div
            className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.13em]"
            style={{ color: toneColor(meta.tone) }}
          >
            {meta.verdict}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{meta.title}</div>
          <p className="mt-2 text-xs leading-5 text-[#8793a2]">{meta.signature}</p>
        </div>
        <div
          className="font-[family-name:var(--font-mono)] text-xs"
          style={{ color: toneColor(meta.tone) }}
        >
          {formatSigned(meta.delta)}
        </div>
      </div>
    </Link>
  );
}

export function MotionGallery() {
  return (
    <section className="border-t border-white/8 px-4 py-8 sm:px-7 lg:px-10">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.17em] text-[#8793a2]">
            animated behavior signatures
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
            Six failure regimes, replayed from policy data
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa6b4]">
            Each card animates the paired trajectories. Open one for its full 3D replay, telemetry, causal interpretation, and unresolved experimental question.
          </p>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-[#697584]">
          cyan = G+ · amber = SA
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((item) => (
          <TraceCard key={item.id} scenario={item.id} />
        ))}
      </div>
    </section>
  );
}

export function ReplayControls({
  time,
  maxTime,
  playing,
  speed,
  onPlaying,
  onTime,
  onSpeed,
  onReset,
}: {
  time: number;
  maxTime: number;
  playing: boolean;
  speed: number;
  onPlaying: (value: boolean) => void;
  onTime: (value: number) => void;
  onSpeed: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1218] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={playing ? "Pause replay" : "Play replay"}
            onClick={() => onPlaying(!playing)}
            className="grid size-10 place-items-center rounded-full bg-[#f1b74c] text-[#0a0c0f]"
          >
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <button
            type="button"
            aria-label="Reset replay"
            onClick={onReset}
            className="grid size-10 place-items-center rounded-full border border-white/10 text-[#9aa6b4] hover:text-white"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-12 font-[family-name:var(--font-mono)] text-[10px] text-[#8c98a7]">
            {time.toFixed(1)}s
          </span>
          <input
            aria-label="Replay time"
            type="range"
            min={0}
            max={maxTime}
            step={0.05}
            value={Math.min(time, maxTime)}
            onChange={(event) => onTime(Number(event.currentTarget.value))}
            className="min-w-0 flex-1 accent-[#f1b74c]"
          />
          <span className="w-12 text-right font-[family-name:var(--font-mono)] text-[10px] text-[#8c98a7]">
            {maxTime.toFixed(1)}s
          </span>
        </div>
        <label className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-[#7f8b99]">
          speed
          <select
            value={speed}
            onChange={(event) => onSpeed(Number(event.currentTarget.value))}
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function ExperimentRecordLink({ scenario }: { scenario: ScenarioId }) {
  const meta = scenarioById[scenario];
  return (
    <Link
      href={meta.href}
      className="mt-4 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.11em] text-[#d9e0e7] no-underline hover:text-[#f1b74c]"
    >
      open complete experiment record <ChevronRight size={13} />
    </Link>
  );
}
