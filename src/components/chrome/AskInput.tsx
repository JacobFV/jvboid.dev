"use client";

import { useEffect, useRef, useState } from "react";
import { CallSheet } from "./CallSheet";
import { TextSheet } from "./TextSheet";

// Web Speech API isn't in lib.dom.d.ts yet — declare just what we touch.
type SRResultItem = { transcript: string };
type SRResult = { 0: SRResultItem; isFinal: boolean; length: number };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SRInstance = {
  start(): void;
  stop(): void;
  abort(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SRCtor = new () => SRInstance;
declare global {
  interface Window {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  }
}

// "Ask me anything" prompt on the home hero.
//   [text input grows] [mic] [submit]
// Submit morphs between phone (empty → CallSheet) and arrow-up
// (has text → TextSheet which gates the reveal of phone/email with the
// same captcha CallSheet uses).
export function AskInput() {
  const [value, setValue] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recRef = useRef<SRInstance | null>(null);
  // Text the user has typed before this dictation chunk started, plus a
  // trailing space if needed. We append interim/final transcript to this.
  const baseTextRef = useRef("");
  const hasText = value.trim().length > 0;

  // Lazy-construct one SpeechRecognition. Some browsers throw if start()
  // is called on a finished recognizer, so we re-use a single instance.
  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSttSupported(false);
      return;
    }
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (ev) => {
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const item = ev.results[i];
        const text = item[0].transcript;
        if (item.isFinal) final += text;
        else interim += text;
      }
      const next = baseTextRef.current + (final || interim);
      setValue(next);
      if (final) baseTextRef.current = next + " ";
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const toggleMic = () => {
    const r = recRef.current;
    if (!r) return;
    if (listening) {
      r.stop();
      setListening(false);
      return;
    }
    baseTextRef.current = value ? (value.endsWith(" ") ? value : value + " ") : "";
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const onSubmitClick = () => {
    if (hasText) {
      setTextOpen(true);
      return;
    }
    setCallOpen(true);
  };

  return (
    <>
      <div className="mt-8 flex w-full max-w-xl items-center gap-1 rounded-full bg-[var(--color-bg-1)] py-2 pr-2 pl-5 shadow-[var(--shadow-soft),var(--ring-soft)] focus-within:shadow-[var(--shadow-soft),inset_0_0_0_1px_var(--color-accent)]">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmitClick();
            }
          }}
          placeholder="Ask me anything!"
          aria-label="Ask me anything"
          className="flex-1 bg-transparent text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-mute)]"
        />

        <button
          type="button"
          aria-label={listening ? "Stop voice input" : "Voice input"}
          onClick={toggleMic}
          disabled={!sttSupported}
          title={sttSupported ? undefined : "Speech recognition not supported in this browser"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            listening
              ? "bg-[var(--color-accent)] text-white"
              : sttSupported
                ? "text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-ink)]"
                : "cursor-not-allowed text-[var(--color-ink-mute)] opacity-50"
          }`}
        >
          <MicIcon />
        </button>

        <button
          type="button"
          onClick={onSubmitClick}
          aria-label={hasText ? "Send a message" : "Call Jacob"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors"
          style={{
            background: hasText ? "var(--color-accent)" : "var(--color-phone)",
          }}
        >
          <span className="relative block h-[18px] w-[18px]">
            <span
              className={`absolute inset-0 grid place-items-center transition-all duration-200 ${
                hasText ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            >
              <ArrowUpIcon />
            </span>
            <span
              className={`absolute inset-0 grid place-items-center transition-all duration-200 ${
                hasText ? "scale-75 opacity-0" : "scale-100 opacity-100"
              }`}
            >
              <PhoneIcon />
            </span>
          </span>
        </button>
      </div>

      <CallSheet open={callOpen} onClose={() => setCallOpen(false)} />
      <TextSheet open={textOpen} message={value} onClose={() => setTextOpen(false)} />
    </>
  );
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="20" x2="12" y2="6" />
      <polyline points="6 12 12 6 18 12" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
