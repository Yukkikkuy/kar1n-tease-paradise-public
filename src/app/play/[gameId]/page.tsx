"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  continueBeatsToSteps,
  normalizeNode,
  type GameChoice,
  type GameNode,
  type ScriptStep,
} from "@/lib/types";
import { AudioManager } from "@/lib/audio-manager";

type TimerKind = "step" | "choice" | "async" | null;
type RunPhase = "script" | "choices" | "ending";

type StageMedia = {
  mediaType: "image" | "video";
  url: string;
};

type StageState = {
  media: StageMedia | null;
  caption: string | null;
};

type WaitKind = "say" | "sync" | null;

const CHOICE_STYLES = [
  "border-[#e11d48] bg-[#e11d48]/25 hover:bg-[#e11d48]/45",
  "border-[#2563eb] bg-[#2563eb]/25 hover:bg-[#2563eb]/45",
  "border-[#16a34a] bg-[#16a34a]/25 hover:bg-[#16a34a]/45",
  "border-[#ca8a04] bg-[#ca8a04]/25 hover:bg-[#ca8a04]/45",
  "border-[#9333ea] bg-[#9333ea]/25 hover:bg-[#9333ea]/45",
  "border-[#0891b2] bg-[#0891b2]/25 hover:bg-[#0891b2]/45",
];

function choiceAction(c: GameChoice): "goto" | "continue" {
  return c.action === "continue" ? "continue" : "goto";
}

function pickDefaultChoice(choices: GameChoice[]): GameChoice | null {
  if (!choices.length) return null;
  return choices.find((c) => c.isDefault) || choices[0];
}

function emptyStage(): StageState {
  return { media: null, caption: null };
}

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [title, setTitle] = useState("");
  const [node, setNode] = useState<GameNode | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stage, setStage] = useState<StageState>(emptyStage);
  const [waiting, setWaiting] = useState(false);
  const [waitKind, setWaitKind] = useState<WaitKind>(null);
  const [hideStepTimerUi, setHideStepTimerUi] = useState(false);
  /** false = 强制等倒计时；true/缺省 = 可点跳过。无同步计时时始终可点。 */
  const [allowSkipWait, setAllowSkipWait] = useState(true);
  const [runPhase, setRunPhase] = useState<RunPhase>("script");
  const [choicesLocked, setChoicesLocked] = useState(false);
  const [fromContinue, setFromContinue] = useState(false);

  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerKind, setTimerKind] = useState<TimerKind>(null);
  const [mediaBox, setMediaBox] = useState<{ w: number; h: number } | null>(
    null
  );

  const audioMgrRef = useRef<AudioManager | null>(null);
  if (!audioMgrRef.current) audioMgrRef.current = new AudioManager();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const asyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeEpoch = useRef(0);
  const choiceTimerStartedFor = useRef<string | null>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);

  // Interpreter refs — avoid stale closures in async/timer callbacks
  const stepsRef = useRef<ScriptStep[]>([]);
  const stepIndexRef = useRef(0);
  const waitingRef = useRef(false);
  const waitKindRef = useRef<WaitKind>(null);
  const runPhaseRef = useRef<RunPhase>("script");
  const nodeRef = useRef<GameNode | null>(null);
  const choicesLockedRef = useRef(false);
  const fromContinueRef = useRef(false);
  const pumpingRef = useRef(false);
  const hideStepTimerUiRef = useRef(false);
  const allowSkipWaitRef = useRef(true);

  const resumeAfterWaitRef = useRef<() => void>(() => {});
  const gotoNodeByIdRef = useRef<(id: string) => Promise<void>>(async () => {});

  stepsRef.current = steps;
  stepIndexRef.current = stepIndex;
  waitingRef.current = waiting;
  waitKindRef.current = waitKind;
  runPhaseRef.current = runPhase;
  nodeRef.current = node;
  choicesLockedRef.current = choicesLocked;
  fromContinueRef.current = fromContinue;
  hideStepTimerUiRef.current = hideStepTimerUi;
  allowSkipWaitRef.current = allowSkipWait;

  const clearUiTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerLeft(null);
    setTimerTotal(0);
    setTimerKind(null);
  }, []);

  const clearAsyncTimer = useCallback(() => {
    if (asyncTimerRef.current) {
      clearTimeout(asyncTimerRef.current);
      asyncTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearUiTimer();
    clearAsyncTimer();
  }, [clearUiTimer, clearAsyncTimer]);

  const stopAllAudio = useCallback(() => {
    audioMgrRef.current?.stopAll(0);
  }, []);

  const leaveNodeAudio = useCallback(() => {
    audioMgrRef.current?.onLeaveNode();
  }, []);

  const applyAudioStep = useCallback((s: ScriptStep) => {
    const mgr = audioMgrRef.current;
    if (!mgr) return;
    if (s.type === "audioStop" || (s.type === "audio" && s.audioAction === "stop")) {
      mgr.stop(s.channelId || "bgm", s.fadeMs || 0);
      return;
    }
    if (s.type === "audio") {
      const url = s.url || "";
      if (!url) return;
      mgr.play({
        url,
        channelId: s.channelId || "bgm",
        volume: s.volume,
        loop: !!s.loop,
        durationSec: s.durationSec,
        stopOnLeave: !!s.stopOnLeave,
        fadeMs: s.fadeMs,
      });
    }
  }, []);

  /** Visible countdown ring (step sync / choice / async display). */
  const startUiTimer = useCallback(
    (delaySec: number, epoch: number, kind: TimerKind) => {
      const delay = Math.max(0.1, delaySec);
      setTimerTotal(delay);
      setTimerLeft(delay);
      setTimerKind(kind);
      const startedAt = Date.now();
      const totalMs = delay * 1000;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = setInterval(() => {
        if (nodeEpoch.current !== epoch) return;
        const left = Math.max(0, totalMs - (Date.now() - startedAt)) / 1000;
        setTimerLeft(left);
      }, 50);
    },
    []
  );

  const finishScript = useCallback(() => {
    clearUiTimer();
    const n = nodeRef.current;
    if (!n) return;
    const locked = choicesLockedRef.current;
    const continued = fromContinueRef.current;

    if (!locked && !continued && !n.isEnding && (n.choices?.length ?? 0) > 0) {
      setRunPhase("choices");
      runPhaseRef.current = "choices";
      return;
    }
    if (!locked && !continued && (n.isEnding || !(n.choices?.length ?? 0))) {
      setRunPhase("ending");
      runPhaseRef.current = "ending";
      return;
    }
    // after continue: keep last stage; only go ending if no choices / isEnding
    if (n.isEnding || !(n.choices?.length ?? 0)) {
      setRunPhase("ending");
      runPhaseRef.current = "ending";
    } else {
      // continue finished — stay visually on last caption/image, no re-open choices
      setRunPhase("choices");
      runPhaseRef.current = "choices";
      // but choicesLocked keeps options hidden
    }
  }, [clearUiTimer]);

  const beginWait = useCallback(
    (
      kind: WaitKind,
      opts?: {
        durationSec?: number;
        hideTimer?: boolean;
        allowSkip?: boolean;
      }
    ) => {
      waitingRef.current = true;
      waitKindRef.current = kind;
      setWaiting(true);
      setWaitKind(kind);
      const dur =
        typeof opts?.durationSec === "number" && opts.durationSec > 0
          ? opts.durationSec
          : 0;
      // Only overwrite hide/ring when this wait owns a sync timer.
      // Async timers may already be showing a ring — don't clear them.
      if (dur > 0) {
        const hide = !!opts?.hideTimer;
        hideStepTimerUiRef.current = hide;
        setHideStepTimerUi(hide);
        // allowSkip: undefined/true = 可跳过；false = 强制等完
        const canSkip = opts?.allowSkip !== false;
        allowSkipWaitRef.current = canSkip;
        setAllowSkipWait(canSkip);
        startUiTimer(dur, nodeEpoch.current, "step");
      } else {
        // 无停留计时：始终允许点击继续
        allowSkipWaitRef.current = true;
        setAllowSkipWait(true);
        if (opts?.hideTimer !== undefined && !asyncTimerRef.current) {
          hideStepTimerUiRef.current = !!opts.hideTimer;
          setHideStepTimerUi(!!opts.hideTimer);
        }
      }
    },
    [startUiTimer]
  );

  const startAsyncStepTimer = useCallback(
    (s: ScriptStep) => {
      const dur =
        typeof s.durationSec === "number" && s.durationSec > 0
          ? s.durationSec
          : 0;
      if (dur <= 0) return;
      clearAsyncTimer();
      const epoch = nodeEpoch.current;
      const onEnd = s.timerOnEnd || "advance";
      const gotoId = s.timerGotoNodeId || "";
      const hide = !!s.hideTimer;
      hideStepTimerUiRef.current = hide;
      setHideStepTimerUi(hide);
      // Show ring for async timer too (unless hidden)
      startUiTimer(dur, epoch, "async");
      asyncTimerRef.current = setTimeout(() => {
        asyncTimerRef.current = null;
        if (nodeEpoch.current !== epoch) return;
        clearUiTimer();
        if (onEnd === "none") return;
        if (onEnd === "goto" && gotoId) {
          void gotoNodeByIdRef.current(gotoId);
          return;
        }
        // advance: if waiting on say/sync, auto-continue
        if (waitingRef.current && runPhaseRef.current === "script") {
          resumeAfterWaitRef.current();
        }
      }, dur * 1000);
    },
    [clearAsyncTimer, startUiTimer, clearUiTimer]
  );

  /**
   * EOS-style step pump: run non-blocking steps until a wait or end.
   * Image/audio/goto are non-blocking; say & sync timers block.
   */
  const pumpSteps = useCallback(() => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      // Safety: avoid infinite non-blocking loops
      let guard = 0;
      while (
        runPhaseRef.current === "script" &&
        !waitingRef.current &&
        guard < 500
      ) {
        guard += 1;
        const list = stepsRef.current;
        const idx = stepIndexRef.current;
        if (idx >= list.length) {
          finishScript();
          break;
        }
        const s = list[idx];
        // Advance pointer before applying (so resume continues past this step)
        stepIndexRef.current = idx + 1;
        setStepIndex(idx + 1);

        if (s.type === "audio" || s.type === "audioStop") {
          applyAudioStep(s);
          continue;
        }

        if (s.type === "goto") {
          const target = (s.targetNodeId || "").trim();
          if (!target) {
            setError("跳转步骤未设置目标节点");
            break;
          }
          // Fire-and-forget; pump stops because phase will change
          void gotoNodeByIdRef.current(target);
          break;
        }

        if (s.type === "image" || s.type === "video") {
          const url = (s.url || "").trim();
          if (url) {
            setStage((prev) => ({
              media: { mediaType: s.type as "image" | "video", url },
              caption:
                s.displayMode === "solo" ? null : prev.caption,
            }));
          } else if (s.displayMode === "solo") {
            setStage((prev) => ({ ...prev, caption: null }));
          }

          const dur =
            typeof s.durationSec === "number" && s.durationSec > 0
              ? s.durationSec
              : 0;
          const async = !!s.timerAsync;

          if (dur > 0 && async) {
            startAsyncStepTimer(s);
          }

          const inline = (s.text || "").trim();
          // Solo image: never show inline caption; paired with text → block on caption
          if (inline && s.displayMode !== "solo") {
            setStage((prev) => ({
              media: url
                ? { mediaType: s.type as "image" | "video", url }
                : prev.media,
              caption: inline,
            }));
            // Sync timer on image+inline: wait for click OR sync timer
            if (dur > 0 && !async) {
              beginWait("say", {
                durationSec: dur,
                hideTimer: s.hideTimer,
                allowSkip: s.allowSkip,
              });
            } else {
              beginWait("say", { hideTimer: s.hideTimer, allowSkip: true });
            }
            break;
          }

          // Sync timer on bare image: block until timer / skip
          if (dur > 0 && !async) {
            beginWait("sync", {
              durationSec: dur,
              hideTimer: s.hideTimer,
              allowSkip: s.allowSkip,
            });
            break;
          }
          // Non-blocking image — keep pumping
          continue;
        }

        if (s.type === "say") {
          const text = (s.text || "").trim();
          if (s.displayMode === "solo") {
            setStage({ media: null, caption: text || null });
          } else {
            setStage((prev) => ({ ...prev, caption: text || null }));
          }

          const dur =
            typeof s.durationSec === "number" && s.durationSec > 0
              ? s.durationSec
              : 0;
          const async = !!s.timerAsync;

          if (dur > 0 && async) {
            startAsyncStepTimer(s);
            // 异步：旁白仍等人点；跳过不受强制停留约束
            beginWait("say", { hideTimer: s.hideTimer, allowSkip: true });
          } else if (dur > 0 && !async) {
            beginWait("say", {
              durationSec: dur,
              hideTimer: s.hideTimer,
              allowSkip: s.allowSkip,
            });
          } else {
            beginWait("say", { allowSkip: true });
          }
          break;
        }

        // Unknown step — skip
      }
    } finally {
      pumpingRef.current = false;
    }
  }, [applyAudioStep, beginWait, finishScript, startAsyncStepTimer]);

  const resumeAfterWait = useCallback(() => {
    if (runPhaseRef.current !== "script") return;
    if (!waitingRef.current) return;
    clearUiTimer();
    // Don't clear async timer here — it may still be running across says
    waitingRef.current = false;
    waitKindRef.current = null;
    setWaiting(false);
    setWaitKind(null);
    // Clear caption only when leaving a say wait? Keep caption until next say/image updates it.
    // Pump continues from current stepIndex.
    pumpSteps();
  }, [clearUiTimer, pumpSteps]);

  resumeAfterWaitRef.current = resumeAfterWait;

  const beginNode = useCallback(
    (raw: GameNode, opts?: { keepAudio?: boolean }) => {
      const n = normalizeNode(raw);
      nodeEpoch.current += 1;
      clearAllTimers();
      if (!opts?.keepAudio) leaveNodeAudio();
      setError("");
      setNode(n);
      nodeRef.current = n;
      const list = n.steps || [];
      setSteps(list);
      stepsRef.current = list;
      setStepIndex(0);
      stepIndexRef.current = 0;
      setStage(emptyStage());
      setWaiting(false);
      waitingRef.current = false;
      setWaitKind(null);
      waitKindRef.current = null;
      setHideStepTimerUi(false);
      setAllowSkipWait(true);
      allowSkipWaitRef.current = true;
      setChoicesLocked(false);
      choicesLockedRef.current = false;
      setFromContinue(false);
      fromContinueRef.current = false;
      choiceTimerStartedFor.current = null;
      naturalRef.current = null;
      setMediaBox(null);

      if (!list.length) {
        const phase =
          n.isEnding || !(n.choices?.length ?? 0) ? "ending" : "choices";
        setRunPhase(phase);
        runPhaseRef.current = phase;
      } else {
        setRunPhase("script");
        runPhaseRef.current = "script";
        // Pump on next tick so state is committed
        window.setTimeout(() => {
          if (nodeRef.current?.id === n.id) pumpSteps();
        }, 0);
      }
    },
    [clearAllTimers, leaveNodeAudio, pumpSteps]
  );

  const gotoNodeById = useCallback(
    async (targetNodeId: string) => {
      const res = await fetch(`/api/play/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "goto", targetNodeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "跳转失败：目标节点不存在或无效");
        return;
      }
      if (!data.currentNode) {
        setError("跳转失败：目标节点不存在");
        return;
      }
      beginNode(data.currentNode);
    },
    [gameId, beginNode]
  );

  gotoNodeByIdRef.current = gotoNodeById;

  // Sync step timer expiry → resume
  useEffect(() => {
    if (!started || runPhase !== "script") return;
    if (timerKind !== "step") return;
    if (timerLeft === null || timerLeft > 0) return;
    resumeAfterWait();
  }, [timerLeft, timerKind, started, runPhase, resumeAfterWait]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      audioMgrRef.current?.dispose();
    };
  }, [clearAllTimers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/play/${gameId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "无法游玩");
        setNode(null);
        return;
      }
      setTitle(data.game.title);
      if (data.currentNode) {
        const n = normalizeNode(data.currentNode);
        setNode(n);
        nodeRef.current = n;
        setSteps(n.steps || []);
        stepsRef.current = n.steps || [];
      } else {
        setNode(null);
      }
      setStarted(false);
      setRunPhase("script");
      runPhaseRef.current = "script";
      setStepIndex(0);
      stepIndexRef.current = 0;
      setStage(emptyStage());
      setWaiting(false);
      waitingRef.current = false;
      setChoicesLocked(false);
      choicesLockedRef.current = false;
      setFromContinue(false);
      fromContinueRef.current = false;
      clearAllTimers();
      stopAllAudio();
    } finally {
      setLoading(false);
    }
  }, [gameId, clearAllTimers, stopAllAudio]);

  useEffect(() => {
    load();
  }, [load]);

  const showCaption =
    runPhase === "script" &&
    waiting &&
    !!(stage.caption || "").trim();

  // Keep last image during choices / ending
  const showStageMedia =
    !!stage.media?.url &&
    (runPhase === "script" ||
      runPhase === "choices" ||
      runPhase === "ending");

  const showChoices =
    started &&
    node &&
    runPhase === "choices" &&
    !choicesLocked &&
    !fromContinue &&
    !node.isEnding &&
    (node.choices?.length ?? 0) > 0;

  const showEnding =
    started &&
    node &&
    runPhase === "ending" &&
    (node.isEnding || !(node.choices?.length ?? 0));

  const fitMediaSize = useCallback((nw: number, nh: number) => {
    if (!nw || !nh || typeof window === "undefined") {
      setMediaBox(null);
      return;
    }
    naturalRef.current = { w: nw, h: nh };
    const maxW = Math.min(window.innerWidth * 0.96, 1100);
    const maxH = Math.min(window.innerHeight * 0.62, 820);
    const s = Math.min(maxW / nw, maxH / nh, 1);
    setMediaBox({
      w: Math.max(1, Math.round(nw * s)),
      h: Math.max(1, Math.round(nh * s)),
    });
  }, []);

  useEffect(() => {
    naturalRef.current = null;
    setMediaBox(null);
  }, [stage.media?.url, stage.media?.mediaType]);

  useEffect(() => {
    const onResize = () => {
      const n = naturalRef.current;
      if (!n) return;
      fitMediaSize(n.w, n.h);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitMediaSize]);

  function onMediaLoad(e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) {
    const el = e.currentTarget;
    if (el instanceof HTMLVideoElement) {
      fitMediaSize(
        el.videoWidth || el.clientWidth,
        el.videoHeight || el.clientHeight
      );
    } else {
      fitMediaSize(el.naturalWidth, el.naturalHeight);
    }
  }

  function handleStart() {
    if (!node) return;
    setStarted(true);
    beginNode(node);
  }

  const applyContinue = useCallback(
    (choice: GameChoice) => {
      clearAllTimers();
      choiceTimerStartedFor.current = null;
      setChoicesLocked(true);
      choicesLockedRef.current = true;
      setFromContinue(true);
      fromContinueRef.current = true;
      const extra = continueBeatsToSteps(choice.continueBeats || "");
      if (extra.length) {
        setSteps(extra);
        stepsRef.current = extra;
        setStepIndex(0);
        stepIndexRef.current = 0;
        setWaiting(false);
        waitingRef.current = false;
        setWaitKind(null);
        waitKindRef.current = null;
        setRunPhase("script");
        runPhaseRef.current = "script";
        window.setTimeout(() => pumpSteps(), 0);
      } else {
        const n = nodeRef.current;
        setRunPhase(
          n?.isEnding || !(n?.choices?.length ?? 0) ? "ending" : "choices"
        );
        runPhaseRef.current =
          n?.isEnding || !(n?.choices?.length ?? 0) ? "ending" : "choices";
      }
    },
    [clearAllTimers, pumpSteps]
  );

  const chooseGoto = useCallback(
    async (choiceId: string) => {
      const res = await fetch(`/api/play/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      if (!data.currentNode) {
        setError("目标节点不存在");
        return;
      }
      beginNode(data.currentNode);
    },
    [gameId, beginNode]
  );

  const resolveChoice = useCallback(
    (choice: GameChoice) => {
      if (choiceAction(choice) === "continue") {
        applyContinue(choice);
        return;
      }
      if (!(choice.targetNodeId || "").trim()) {
        setError("该选项未设置跳转目标");
        return;
      }
      void chooseGoto(choice.id);
    },
    [applyContinue, chooseGoto]
  );

  useEffect(() => {
    if (!showChoices || !node) return;
    const sec = node.choiceTimerSec;
    if (!sec || sec <= 0) return;
    if (choiceTimerStartedFor.current === node.id) return;
    choiceTimerStartedFor.current = node.id;
    startUiTimer(sec, nodeEpoch.current, "choice");
  }, [showChoices, node, startUiTimer]);

  useEffect(() => {
    if (!showChoices || !node) return;
    if (timerKind !== "choice") return;
    if (timerLeft === null || timerLeft > 0) return;
    const def = pickDefaultChoice(node.choices);
    if (!def) return;
    clearUiTimer();
    resolveChoice(def);
  }, [timerLeft, timerKind, showChoices, node, clearUiTimer, resolveChoice]);

  function skipChoiceTimer() {
    if (!node || !showChoices) return;
    if (!node.choiceTimerAllowSkip) return;
    const def = pickDefaultChoice(node.choices);
    if (!def) return;
    clearUiTimer();
    resolveChoice(def);
  }

  /** 有同步停留且不允许跳过时，不能点/空格提前翻页 */
  const canSkipCurrentWait =
    allowSkipWait || timerKind !== "step" || timerLeft === null;

  const canAdvanceScript =
    started && runPhase === "script" && waiting && canSkipCurrentWait;

  function tryAdvanceScript() {
    if (!(started && runPhase === "script" && waiting)) return;
    if (!canSkipCurrentWait) return;
    resumeAfterWait();
  }

  function onStageClick(e: ReactMouseEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    if (t.closest("[data-eos-no-advance]")) return;
    tryAdvanceScript();
  }

  function onStageKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (!(started && runPhase === "script" && waiting)) return;
    if (!canSkipCurrentWait) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    resumeAfterWait();
  }

  async function restart() {
    const res = await fetch(`/api/play/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restart" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "重置失败");
      return;
    }
    setStarted(false);
    clearAllTimers();
    stopAllAudio();
    if (data.currentNode) {
      const n = normalizeNode(data.currentNode);
      setNode(n);
      nodeRef.current = n;
      setSteps(n.steps || []);
      stepsRef.current = n.steps || [];
    }
    setRunPhase("script");
    runPhaseRef.current = "script";
    setStepIndex(0);
    stepIndexRef.current = 0;
    setStage(emptyStage());
    setWaiting(false);
    waitingRef.current = false;
    setChoicesLocked(false);
    choicesLockedRef.current = false;
    setFromContinue(false);
    fromContinueRef.current = false;
    choiceTimerStartedFor.current = null;
  }

  if (loading) {
    return (
      <div className="eos-player flex items-center justify-center">
        <p className="text-stone-400">加载中…</p>
      </div>
    );
  }

  if (error && !node) {
    return (
      <div className="eos-player flex items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-rose-900/50 bg-black/80 p-6 text-center">
          <p className="mb-4 text-rose-300">{error}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/activate" className="text-amber-300 hover:underline">
              去激活秘钥
            </Link>
            <Link href="/login" className="text-amber-300 hover:underline">
              登录
            </Link>
            <Link href="/" className="text-stone-400 hover:underline">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="eos-player flex items-center justify-center p-6">
        <p className="text-stone-400">该作品还没有起始节点。</p>
      </div>
    );
  }

  const timerProgress =
    timerTotal > 0 && timerLeft !== null
      ? Math.min(1, Math.max(0, 1 - timerLeft / timerTotal))
      : 0;

  const stepTimerVisible =
    runPhase === "script" &&
    (timerKind === "step" || timerKind === "async") &&
    timerLeft !== null;

  /** 有剧情字幕时，倒计时贴在字幕旁；无字幕才挂图片角 */
  const timerOnCaption = stepTimerVisible && showCaption;
  const timerOnMedia =
    stepTimerVisible && !showCaption && !!stage.media?.url;
  const timerFloating =
    stepTimerVisible && !showCaption && !stage.media?.url;

  const choiceTimerVisible =
    showChoices && timerKind === "choice" && timerLeft !== null;
  const allowChoiceSkip = !!node.choiceTimerAllowSkip;
  const hideChoiceTimerUi = !!node.choiceTimerHide;

  const textDominant =
    started &&
    runPhase === "script" &&
    !showStageMedia &&
    showCaption;

  const footerNeeded =
    started && (showCaption || showChoices || showEnding || !!error);

  // During choices/ending keep last caption off unless we want it — hide caption in choices
  const captionVisible = showCaption;

  const showStepSkipBtn = canSkipCurrentWait && waiting;

  const stepTimerChrome = (wrapClass: string) =>
    stepTimerVisible ? (
      <div className={wrapClass} data-eos-no-advance>
        {showStepSkipBtn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              tryAdvanceScript();
            }}
            className="eos-skip"
            title="跳过"
            data-eos-no-advance
          >
            跳过
          </button>
        )}
        {!hideStepTimerUi && (
          <div
            className="eos-timer-ring"
            style={{ "--p": String(timerProgress) } as CSSProperties}
            aria-label={`剩余 ${Math.ceil(timerLeft!)} 秒`}
          >
            <span>{Math.ceil(timerLeft!)}</span>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="eos-player">
      <header className="eos-topbar" data-eos-no-advance>
        <div className="eos-topbar-title">{title || "Kar1n Tease Paradise"}</div>
        <div className="eos-topbar-actions">
          {started && (
            <button
              type="button"
              onClick={restart}
              className="eos-nav-btn eos-nav-btn-muted"
              data-eos-no-advance
            >
              重新开始
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="eos-nav-btn"
            data-eos-no-advance
          >
            返回
          </button>
          <Link
            href="/"
            className="eos-nav-btn eos-nav-btn-exit"
            data-eos-no-advance
          >
            退出
          </Link>
        </div>
      </header>

      <div
        className={`eos-stage ${textDominant ? "eos-stage-textonly" : ""} ${
          canAdvanceScript ? "eos-stage-clickable" : ""
        }`}
        onClick={onStageClick}
        onKeyDown={onStageKeyDown}
        role={canAdvanceScript ? "button" : undefined}
        tabIndex={canAdvanceScript ? 0 : undefined}
        aria-label={
          canAdvanceScript
            ? "点击继续"
            : started && waiting && !canSkipCurrentWait
              ? "请等待倒计时结束"
              : undefined
        }
      >
        {showStageMedia && stage.media?.mediaType === "image" && (
          <div className="eos-image-well">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={stage.media.url}
              src={stage.media.url}
              alt=""
              className="eos-media eos-media-fitted"
              draggable={false}
              onLoad={onMediaLoad}
              style={
                mediaBox
                  ? { width: mediaBox.w, height: mediaBox.h }
                  : undefined
              }
            />
            {timerOnMedia && stepTimerChrome("eos-timer-wrap")}
          </div>
        )}

        {showStageMedia && stage.media?.mediaType === "video" && (
          <div className="eos-image-well">
            <video
              key={stage.media.url}
              className="eos-media eos-media-fitted"
              src={stage.media.url}
              autoPlay
              playsInline
              controls={false}
              muted={false}
              onLoadedMetadata={onMediaLoad}
              style={
                mediaBox
                  ? { width: mediaBox.w, height: mediaBox.h }
                  : undefined
              }
            />
            {timerOnMedia && stepTimerChrome("eos-timer-wrap")}
          </div>
        )}

        {timerFloating &&
          stepTimerChrome("eos-timer-wrap eos-timer-wrap-floating")}

        {footerNeeded && (
          <div
            className={`eos-footer ${
              textDominant || !showStageMedia ? "eos-footer-dominant" : ""
            }`}
          >
            {error && started && (
              <p
                className="mb-2 w-full text-center text-sm text-rose-300"
                data-eos-no-advance
              >
                {error}
              </p>
            )}

            {captionVisible && (
              <div
                className={`eos-caption ${
                  canAdvanceScript ? "eos-caption-clickable" : ""
                } ${
                  textDominant || !showStageMedia ? "eos-caption-dominant" : ""
                } ${timerOnCaption ? "eos-caption-with-timer" : ""}`}
              >
                {showStageMedia && <div className="eos-caption-fade" />}
                {timerOnCaption &&
                  stepTimerChrome("eos-timer-wrap eos-timer-wrap-caption")}
                <div className="eos-caption-body">
                  <p className="eos-caption-line">{stage.caption || ""}</p>
                </div>
                {canAdvanceScript ? (
                  <span className="eos-advance-cue" aria-hidden>
                    {stepTimerVisible && timerKind === "step"
                      ? "▼ 点击跳过 / 继续"
                      : "▼ 点击继续"}
                  </span>
                ) : stepTimerVisible && timerKind === "step" ? (
                  <span className="eos-advance-cue eos-advance-cue-wait" aria-hidden>
                    请等待倒计时…
                  </span>
                ) : null}
              </div>
            )}

            {showChoices && (
              <div className="eos-choices" data-eos-no-advance>
                {choiceTimerVisible && (
                  <div className="eos-choice-timer" data-eos-no-advance>
                    {allowChoiceSkip && (
                      <button
                        type="button"
                        className="eos-skip"
                        onClick={(e) => {
                          e.stopPropagation();
                          skipChoiceTimer();
                        }}
                        data-eos-no-advance
                      >
                        跳过
                      </button>
                    )}
                    {!hideChoiceTimerUi && (
                      <div
                        className="eos-timer-ring"
                        style={
                          { "--p": String(timerProgress) } as CSSProperties
                        }
                        aria-label={`选项剩余 ${Math.ceil(timerLeft!)} 秒`}
                      >
                        <span>{Math.ceil(timerLeft!)}</span>
                      </div>
                    )}
                  </div>
                )}
                {node.choices.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearUiTimer();
                      resolveChoice(c);
                    }}
                    className={`eos-choice ${CHOICE_STYLES[i % CHOICE_STYLES.length]}`}
                    data-eos-no-advance
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            )}

            {showEnding && (
              <div className="eos-choices" data-eos-no-advance>
                <p className="w-full text-center text-sm text-amber-500/80">
                  — 本章结束 —
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void restart();
                  }}
                  className={`eos-choice ${CHOICE_STYLES[0]}`}
                  data-eos-no-advance
                >
                  再玩一次
                </button>
              </div>
            )}
          </div>
        )}

        {started &&
          runPhase === "script" &&
          waiting &&
          waitKind === "sync" &&
          !captionVisible && (
            <div className="eos-slideshow-hint" aria-hidden>
              点击任意处继续
            </div>
          )}
      </div>

      {!started && (
        <button
          type="button"
          className="eos-start-gate"
          onClick={handleStart}
          aria-label="开始"
        >
          <div className="eos-start-inner">
            <h1 className="eos-start-title">{title}</h1>
            {node.title ? (
              <p className="eos-start-subtitle">{node.title}</p>
            ) : null}
            <p className="eos-start-blink">开始</p>
            <p className="eos-start-hint">点击任意处开始</p>
          </div>
        </button>
      )}
    </div>
  );
}
