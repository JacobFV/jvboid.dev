"use client";

import { useEffect, useState } from "react";
import { ReplayPanel } from "./RobotScene";
import { ReplayControls } from "./MotionEvidence";
import {
  scenarioById,
  scenarios,
  type PolicyName,
  type ScenarioId,
} from "./study-model";
import { useReplay, useReplayClock } from "./useReplay";

export function InteractiveReplay({
  initialScenario = "sensor_corruption",
  compact = false,
}: {
  initialScenario?: ScenarioId;
  compact?: boolean;
}) {
  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const [mode, setMode] = useState<"comparison" | "ablation">("comparison");
  const { data, error } = useReplay(scenario);
  const maxTime = data
    ? Math.max(
        ...Object.values(data.policies).map((policy) => policy.frames.at(-1)?.t ?? 0),
      )
    : 0;
  const clock = useReplayClock(maxTime);
  const left: PolicyName = mode === "ablation" ? "SA" : "G+";
  const right: PolicyName = mode === "ablation" ? "SA gate-off" : "SA";
  const meta = scenarioById[scenario];

  useEffect(() => {
    clock.reset();
    setMode("comparison");
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={compact ? "mt-8" : "border-t border-white/8 px-4 py-8 sm:px-7 lg:px-10"}>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.17em] text-[#8793a2]">
            interactive fixed-seed replay
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
            Rotate the world. Scrub the fault. Inspect the self-model.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa6b4]">
            The browser replays the published joint coordinates and policy telemetry. Switch to the causal ablation to compare SA with the same trained network after self-model-guided intervention selection is disabled.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("comparison")}
            className={`rounded-full border px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] ${
              mode === "comparison"
                ? "border-[#f1b74c]/70 bg-[#f1b74c]/10 text-[#f1b74c]"
                : "border-white/10 text-[#8d99a8] hover:border-white/25"
            }`}
          >
            G+ vs SA
          </button>
          <button
            type="button"
            onClick={() => setMode("ablation")}
            className={`rounded-full border px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] ${
              mode === "ablation"
                ? "border-[#e26571]/70 bg-[#e26571]/10 text-[#e26571]"
                : "border-white/10 text-[#8d99a8] hover:border-white/25"
            }`}
          >
            SA causal gate-off
          </button>
        </div>
      </div>

      {!compact ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenario(item.id)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                scenario === item.id
                  ? "border-white/25 bg-white/8 text-white"
                  : "border-white/8 bg-white/[0.025] text-[#84909f] hover:border-white/18 hover:text-white"
              }`}
            >
              <span className="block text-xs font-medium">{item.title}</span>
              <span className="mt-0.5 block font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.11em]">
                {item.short}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#e26571]/30 bg-[#e26571]/8 p-6 text-sm text-[#f0a3ad]">
          {error}
        </div>
      ) : null}
      {!data && !error ? (
        <div className="grid min-h-[540px] place-items-center rounded-2xl border border-white/8 bg-white/[0.02] font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.14em] text-[#778392]">
          loading trajectory log
        </div>
      ) : null}
      {data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReplayPanel data={data} policy={left} time={clock.time} />
            <ReplayPanel data={data} policy={right} time={clock.time} />
          </div>
          <ReplayControls
            time={clock.time}
            maxTime={maxTime}
            playing={clock.playing}
            speed={clock.speed}
            onPlaying={clock.setPlaying}
            onTime={(value) => {
              clock.setPlaying(false);
              clock.setTime(value);
            }}
            onSpeed={clock.setSpeed}
            onReset={clock.reset}
          />
          <div className="mt-3 flex flex-col justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-[#8e9aa8] sm:flex-row">
            <span>
              {meta.verdict}: {meta.signature}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em]">
              model seed {data.selection.model_seed} · environment seed {data.selection.seed} · median-effect selection
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}
