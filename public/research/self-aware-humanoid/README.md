# Embodied metacognition benchmark

This directory supports the jvboid.dev article **The robot that predicts its own failure**.

The browser replays evaluated humanoid joint trajectories; it does not generate or hand-author the displayed behaviors. Each published regime uses the evaluated G+ / SA pair closest to the median paired utility contrast across five model seeds and four environment seeds.

## Layout

- `data/replays-v2.0.b64` … `data/replays-v2.11.b64` — one gzip-compressed replay archive split into text-safe chunks and decoded by the live 3D player.
- `data/paired_summary.csv` — paired mean effects and bootstrap intervals.
- `data/representative_seeds.json` — the declared representative-run selection.
- `data/study.json` — study configuration and result manifest.
- `figures/` — matched architecture, protocol, and paired-effect diagrams.
- `code/simulate.py.gz.b64` — the full Python simulation/training/evaluation source, gzip-compressed and base64 encoded for text-only repository transport.
- `data/benchmark_episode_results.0.b64` … `data/benchmark_episode_results.3.b64` — all 360 episode-level policy results, encoded the same way.

## Decode the full source and raw results

```bash
base64 -d code/simulate.py.gz.b64 | gzip -d > simulate.py
cat data/benchmark_episode_results.{0,1,2,3}.b64 | base64 -d | gzip -d > benchmark_episode_results.csv
cat data/replays-v2.{0..11}.b64 | base64 -d | gzip -d > replays.json
```

Then inspect `study.json` for the exact model/evaluation contract and the article for the limitations of the pilot.
