"use client";

import { useId, useState } from "react";
import { EchoFigure } from "./figure";

/**
 * The information clock. In the symmetric two-alternative reference design
 * a correct-match probability q carries i = 1 − h₂(q) bits per comparison,
 * an apparatus making r comparisons per second has a useful rate J = r·i,
 * and a reconstruction missing b bits has a reference discovery time
 * t ≈ b / J. The curve is the whole sensitivity story: a tenfold weaker
 * effect costs a hundredfold more time. The sliders let the reader put
 * their own numbers on the bench.
 */

const h2 = (q: number) => (q <= 0 || q >= 1 ? 0 : -q * Math.log2(q) - (1 - q) * Math.log2(1 - q));
const bitsPer = (q: number) => 1 - h2(q);
/** The essay's accounting: $500 hosts, five productive years, 10 W, $0.15/kWh. */
const PAIR_COST_PER_HOUR = (2 * 500) / 43800 + 2 * 0.01 * 0.15;

const W = 640;
const H = 300;
const PAD = { l: 62, r: 22, t: 30, b: 48 };
const Q_MIN = 50.02;
const Q_MAX = 52;
const T_MIN = 0.1; // hours
const T_MAX = 1e5;

const X = (q: number) => PAD.l + ((q - Q_MIN) / (Q_MAX - Q_MIN)) * (W - PAD.l - PAD.r);
const Y = (t: number) => {
  const lt = Math.log10(Math.max(T_MIN, Math.min(T_MAX, t)));
  return PAD.t + ((Math.log10(T_MAX) - lt) / (Math.log10(T_MAX) - Math.log10(T_MIN))) * (H - PAD.t - PAD.b);
};

function fmtHours(t: number): string {
  if (t < 1) return `${(t * 60).toFixed(0)} min`;
  if (t < 48) return `${t.toFixed(1)} h`;
  if (t < 24 * 60) return `${(t / 24).toFixed(1)} days`;
  return `${(t / 24 / 365).toFixed(1)} years`;
}
function fmtMoney(x: number): string {
  if (x < 1) return `$${x.toFixed(3)}`;
  if (x < 100) return `$${x.toFixed(2)}`;
  return `$${Math.round(x).toLocaleString()}`;
}

export function EchoClock() {
  const [q, setQ] = useState(51);
  const [rate, setRate] = useState(100);
  const [bits, setBits] = useState(1000);
  const id = useId();

  const hours = (qq: number) => bits / (rate * 3600 * bitsPer(qq / 100));
  const cur = hours(q);
  const perHour = rate * 3600 * bitsPer(q / 100);
  const pts: string[] = [];
  for (let k = 0; k <= 200; k += 1) {
    const qq = Q_MIN + ((Q_MAX - Q_MIN) * k) / 200;
    pts.push(`${X(qq).toFixed(1)},${Y(hours(qq)).toFixed(1)}`);
  }
  const yTicks = [0.1, 1, 10, 100, 1000, 1e4, 1e5];
  const xTicks = [50, 50.5, 51, 51.5, 52];

  return (
    <EchoFigure
      label={`A chart of reference discovery time against the symmetric match probability, on a log scale from six minutes to ten years. The curve falls steeply: at the current setting of ${q.toFixed(2)} percent, ${rate} comparisons per second and ${bits} unresolved bits, discovery takes ${fmtHours(cur)}. Sliders below set the match probability, the comparison rate and the unresolved bits.`}
      caption={
        <>
          A tenfold weaker effect costs a hundredfold more time. Per comparison i = 1 − h₂(q); the useful
          rate is J = r·i; the reference discovery time is b / J. Drag the match probability from 51% to
          50.1% and the same experiment moves from an afternoon to forty days. Hardware is priced at the
          essay&rsquo;s allocation, ${PAIR_COST_PER_HOUR.toFixed(4)} per pair-hour.
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-svg" aria-hidden="true">
        {/* grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} className="echo-grid" />
            <text x={PAD.l - 8} y={Y(t) + 3.5} className="echo-text-small echo-mono" textAnchor="end">
              {t >= 1000 ? `${(t / 1000).toLocaleString()}k h` : t < 1 ? "6 min" : `${t} h`}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={t}>
            <line y1={PAD.t} y2={H - PAD.b} x1={X(t)} x2={X(t)} className="echo-grid" />
            <text x={X(t)} y={H - PAD.b + 16} className="echo-text-small echo-mono" textAnchor="middle">
              {t.toFixed(1)}%
            </text>
          </g>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} className="echo-text-small" textAnchor="middle">
          symmetric match probability q
        </text>
        <text x={PAD.l + 8} y={PAD.t - 12} className="echo-text-small">
          reference discovery time
        </text>

        {/* the curve, and the chosen point */}
        <polyline points={pts.join(" ")} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" />
        <line x1={X(q)} x2={X(q)} y1={Y(cur)} y2={H - PAD.b} className="echo-grid" strokeDasharray="3 3" />
        <circle cx={X(q)} cy={Y(cur)} r={5} fill="var(--color-accent)" stroke="var(--color-bg-0)" strokeWidth={2} />
        <g transform={`translate(${Math.min(X(q) + 12, W - 190)}, ${Math.max(Y(cur) - 30, PAD.t + 4)})`}>
          <text className="echo-text-title" style={{ fontSize: 13 }}>
            {fmtHours(cur)}
          </text>
          <text y={16} className="echo-text-small">
            {perHour < 10 ? perHour.toFixed(2) : Math.round(perHour).toLocaleString()} bits / hour · {fmtMoney(cur * PAIR_COST_PER_HOUR)} allocated
          </text>
        </g>
      </svg>
      <div className="echo-controls">
        <label htmlFor={`${id}-q`}>
          <span>match q</span>
          <input
            id={`${id}-q`}
            type="range"
            min={Q_MIN}
            max={Q_MAX}
            step={0.01}
            value={q}
            onChange={(e) => setQ(Number(e.target.value))}
          />
          <output>{q.toFixed(2)}%</output>
        </label>
        <label htmlFor={`${id}-r`}>
          <span>comparisons / s</span>
          <select id={`${id}-r`} value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[1, 10, 100, 1000].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-b`}>
          <span>unresolved bits</span>
          <select id={`${id}-b`} value={bits} onChange={(e) => setBits(Number(e.target.value))}>
            {[100, 1000, 10000].map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      </div>
    </EchoFigure>
  );
}
