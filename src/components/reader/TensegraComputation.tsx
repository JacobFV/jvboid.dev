import React from "react";

// Deterministic vector geometry. Transparent, theme-aware, and exactly as
// wide as the 70ch / 17px paragraph column; no inset canvas or frame.
export function TensegraComputation() {
  const nodes = [[0, 42], [32, 0], [32, 84], [78, 20], [78, 65], [116, 42]];
  const edges = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5]];
  return (
    <figure className="my-8 w-full max-w-[70ch] text-[17px] text-[var(--color-ink)]" aria-label="Latent projection, symbolic microsteps, and return reintegration">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 330" role="img" aria-labelledby="tensegra-diagram-title" className="block h-auto w-full overflow-visible">
        <title id="tensegra-diagram-title">Latent tensor components crystallize into typed operations, execute across microsteps, and reintegrate into the continuing latent state</title>
        <g fill="currentColor" fontFamily="monospace" fontSize="15" letterSpacing="1">
          <text x="0" y="16">LATENT STATE</text>
          <text x="256" y="16">PROJECT / BIND</text>
          <text x="516" y="16">SYMBOLIC MICROSTEPS</text>
          <text x="960" y="16" textAnchor="end">REINTEGRATE</text>
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          {/* Persistent latent components span both exact text boundaries. */}
          {Array.from({ length: 18 }, (_, i) => (
            <path key={`state-${i}`} opacity={i % 4 === 0 ? .64 : .25}
              d={`M0 ${215 + i * 3.8} C130 ${192 + i * 5.4} 172 ${258 - i * 1.5} 295 ${234 + i * 2.7} S520 ${208 + i * 4.3} 680 ${227 + i * 2.6} S846 ${191 + i * 5} 960 ${213 + i * 3.8}`} />
          ))}
          {/* Tensor slices, not a decorative enclosing box. */}
          {[0, 15, 30].map((offset) => (
            <g key={offset} transform={`translate(${35 + offset} 185)`} opacity=".55">
              <path d="M0 0 72 24 72 111 0 87 Z" />
              {[1, 2, 3, 4, 5].map((j) => (
                <path key={j} strokeWidth=".65" d={`M${j * 12} ${j * 4} v87 M0 ${j * 14.5} l72 24`} />
              ))}
            </g>
          ))}
          {/* Selected components resolve into a compact, typed operand set. */}
          {Array.from({ length: 10 }, (_, i) => (
            <path key={`project-${i}`} opacity={.3 + i * .045}
              d={`M${108 + i * 3} ${218 + i * 4.2} C${199 + i * 4} ${220 + i * 2} ${177 + i * 5} ${99 + i * 3} 296 ${85 + i * 5}`} />
          ))}
          {[296, 470, 644].map((x, step) => (
            <g key={x} transform={`translate(${x} 65)`}>
              {edges.map(([a, b], i) => <path key={i} opacity=".48" d={`M${nodes[a][0]} ${nodes[a][1]} L${nodes[b][0]} ${nodes[b][1]}`} />)}
              <path strokeWidth="2" opacity=".85" d={step === 0 ? "M0 42 32 0 78 20" : step === 1 ? "M32 0 78 20 78 65" : "M78 20 116 42 78 65"} />
              {nodes.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="3" />)}
              {step < 2 && <path d="M126 42 h37 m-7 -4 7 4 -7 4" opacity=".65" />}
            </g>
          ))}
          {/* Completed result is encoded back into a distributed update. */}
          {Array.from({ length: 10 }, (_, i) => (
            <path key={`return-${i}`} opacity={.72 - i * .045}
              d={`M760 ${96 + i * 2.2} C${817 + i * 2} ${110 + i * 3} ${811 + i * 5} ${233 + i * 2} 960 ${213 + i * 3.8}`} />
          ))}
          {Array.from({ length: 29 }, (_, i) => <path key={`step-${i}`} opacity={i % 7 === 0 ? .6 : .24} d={`M${280 + i * 18} 172 v${i % 7 === 0 ? 11 : 5}`} />)}
        </g>
        <g fill="currentColor" fontFamily="Georgia,serif" fontSize="20" fontStyle="italic">
          <text x="0" y="326">hₜ ∈ ℝᴸˣᵈ</text>
          <text x="354" y="49" textAnchor="middle">typed operands</text>
          <text x="528" y="49" textAnchor="middle">exact transition</text>
          <text x="702" y="49" textAnchor="middle">verified return</text>
          <text x="960" y="326" textAnchor="end">hₜ₊ₘ = F(h, E(r))</text>
        </g>
        <text x="535" y="199" textAnchor="middle" fill="currentColor" opacity=".65" fontFamily="monospace" fontSize="14">τ₁ · τ₂ · τ₃ · · · τₘ</text>
      </svg>
    </figure>
  );
}
