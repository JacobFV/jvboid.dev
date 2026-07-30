# Embodied metacognition benchmark

This directory supports the jvboid.dev article **The robot that predicts its own failure**.

The browser replays evaluated humanoid joint trajectories; it does not generate or hand-author the displayed behaviors. Each published regime uses the evaluated G+ / SA pair closest to the median paired utility contrast across five model seeds and four environment seeds.

## Layout

- `data/replays.0.b64` … `data/replays.3.b64` — a gzip-compressed replay archive split into text-safe chunks and decoded by the live 3D player.
- `data/paired_summary.csv` — paired mean effects and bootstrap intervals.
- `data/representative_seeds.json` — the declared representative-run selection.
- `data/study.json` — study configuration and result manifest.
- `figures/` — architecture, protocol, effect, and completion diagrams.
- `code/simulate.py.gz.b64` — the full Python simulation/training/evaluation source, gzip-compressed and base64 encoded for text-only repository transport.
- `data/benchmark_episode_results.csv.gz.b64` — all episode-level results, encoded the same way.

## Decode the full source and raw results

```bash
base64 -d code/simulate.py.gz.b64 | gzip -d > simulate.py
base64 -d data/benchmark_episode_results.csv.gz.b64 | gzip -d > benchmark_episode_results.csv
```

Then inspect `study.json` for the exact model/evaluation contract and the article for the limitations of the pilot.
