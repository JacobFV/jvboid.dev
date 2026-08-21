"use client";

import { useEffect, useRef, useState } from "react";
import { loadReplay, type Replay, type ScenarioId } from "./study-model";

export function useReplay(scenario: ScenarioId) {
  const [data, setData] = useState<Replay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    loadReplay(scenario)
      .then((replay) => {
        if (active) setData(replay);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load replay");
        }
      });
    return () => {
      active = false;
    };
  }, [scenario]);

  return { data, error };
}

export function useReplayClock(
  maxTime: number,
  { autoplay = false, loop = false, initialSpeed = 1 } = {},
) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(initialSpeed);
  const frameRequest = useRef<number | null>(null);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || maxTime <= 0) return;
    const tick = (now: number) => {
      if (lastTick.current == null) lastTick.current = now;
      const elapsed = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setTime((current) => {
        const next = current + elapsed * speed;
        if (next >= maxTime) {
          if (loop) return 0;
          setPlaying(false);
          return maxTime;
        }
        return next;
      });
      frameRequest.current = requestAnimationFrame(tick);
    };
    frameRequest.current = requestAnimationFrame(tick);
    return () => {
      if (frameRequest.current != null) cancelAnimationFrame(frameRequest.current);
      frameRequest.current = null;
      lastTick.current = null;
    };
  }, [loop, maxTime, playing, speed]);

  const reset = () => {
    setPlaying(false);
    setTime(0);
  };

  return { time, setTime, playing, setPlaying, speed, setSpeed, reset };
}
