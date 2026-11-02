export type MediaType = "image" | "audio" | "video";

/** @deprecated Prefer ScriptStep; kept for migration from older saves. */
export interface NodeMedia {
  type: MediaType;
  url: string;
  label?: string;
  durationSec?: number;
  hideTimer?: boolean;
  layout?: "slide" | "layer";
  layer?: boolean;
  zIndex?: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  widthPct?: number;
}

export type ScriptStepType =
  | "image"
  | "video"
  | "audio"
  | "audioStop"
  | "say"
  | "goto";

export type AudioAction = "play" | "stop";

/**
 * paired（默认）: 图片/视频与相邻剧情同屏展示
 * solo: 单独展示（仅图 或 仅剧情）
 */
export type StepDisplayMode = "paired" | "solo";

/** 异步计时到期动作 */
export type TimerOnEnd = "advance" | "goto" | "none";

/** Ordered timeline beat inside a node (Image → Say → Image …). */
export interface ScriptStep {
  id: string;
  type: ScriptStepType;
  /** Media URL for image / video / audio */
  url?: string;
  /** Caption / story text (say steps, or inline caption on image/video) */
  text?: string;
  /**
   * 停留/计时秒数。
   * - 剧情（say）：>0 = 本段旁白停留 N 秒后自动继续；0/缺省 = 只等人点
   * - 图片/视频：>0 启动倒计时（配合 timerAsync）；有同屏旁白时也作停留
   * - 音频：0=播完或直到停；>0=播放 N 秒后停
   */
  durationSec?: number;
  /**
   * 有停留计时（durationSec>0）时是否允许提前结束。
   * undefined/true = 允许点击/空格/「跳过」提前翻页；
   * false = 必须等倒计时结束（EOS 常见强制停留）。
   */
  allowSkip?: boolean;
  /** 隐藏倒计时环但仍计时（durationSec>0 时）。默认显示环。 */
  hideTimer?: boolean;
  /**
   * false/缺省 = 同步计时（阻塞，等倒计时结束或允许时点击跳过再往下）
   * true = 异步计时（立刻继续后续步骤；到期按 timerOnEnd 处理）
   */
  timerAsync?: boolean;
  /**
   * 异步计时到期动作。默认 advance = 自动推进当前等待（等同点继续）。
   * goto 需配合 timerGotoNodeId。
   */
  timerOnEnd?: TimerOnEnd;
  /** 异步计时到期且 timerOnEnd=goto 时跳转的目标节点 */
  timerGotoNodeId?: string;
  /**
   * paired = 图文同屏（默认，图片带着相邻剧情）
   * solo = 单独展示
   */
  displayMode?: StepDisplayMode;
  /** audio: play | stop（默认 play）。audioStop 步骤等价于 stop */
  audioAction?: AudioAction;
  /** 声道名，如 bgm / sfx；同声道后起覆盖先起 */
  channelId?: string;
  /** 0–1，默认 1 */
  volume?: number;
  /** 循环播放（直到停止 / 时长结束 / 离开节点） */
  loop?: boolean;
  /** 离开本节点（跳转）时是否停止该声道。false=跟随跳转继续播 */
  stopOnLeave?: boolean;
  /** 淡出毫秒（停止时，可选） */
  fadeMs?: number;
  /** goto 步骤：目标节点 id */
  targetNodeId?: string;
  /** Optional layer fields (timeline sequencing takes priority in play) */
  layout?: "slide" | "layer";
  layer?: boolean;
  zIndex?: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  widthPct?: number;
}

export type ChoiceAction = "goto" | "continue";

export interface GameChoice {
  id: string;
  text: string;
  /** Target node when action is goto (default). */
  targetNodeId: string;
  /** goto = jump to another node; continue = append say beats on this node. */
  action?: ChoiceAction;
  /** Extra caption text when action is continue (blank paragraphs = say steps). */
  continueBeats?: string;
  /** Auto-picked when choice timer expires (else first choice). */
  isDefault?: boolean;
}

export interface GameNode {
  id: string;
  title: string;
  /** Ordered script timeline — primary content model. */
  steps: ScriptStep[];
  /**
   * @deprecated Legacy body text. Migrated into `say` steps when `steps` missing.
   */
  content?: string;
  /**
   * @deprecated Legacy media list. Migrated into media steps when `steps` missing.
   */
  media?: NodeMedia[];
  choices: GameChoice[];
  isEnding?: boolean;
  /** Countdown seconds while choices are shown. 0 / omit = no timer. */
  choiceTimerSec?: number;
  /** Show Skip during choice countdown (triggers default choice). */
  choiceTimerAllowSkip?: boolean;
  /** Hide the choice timer ring (timer still runs). */
  choiceTimerHide?: boolean;
}

export interface GameData {
  nodes: GameNode[];
  startNodeId: string | null;
}

export type KeyMode = "onetime" | "permanent";

export interface SessionUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export type PlayBeatKind = "paired" | "imageOnly" | "storyOnly" | "audio" | "audioStop";

/** Compiled runtime beat shown on one screen. Kept for migration / tools. */
export interface PlayBeat {
  id: string;
  kind: PlayBeatKind;
  mediaType?: "image" | "video";
  url?: string;
  text?: string;
  durationSec?: number;
  hideTimer?: boolean;
  timerAsync?: boolean;
  /** @deprecated use audio fields below */
  audioUrl?: string;
  channelId?: string;
  volume?: number;
  loop?: boolean;
  stopOnLeave?: boolean;
  fadeMs?: number;
  audioAction?: AudioAction;
}

export function isLayerMedia(
  m: Pick<NodeMedia, "layout" | "layer"> | Pick<ScriptStep, "layout" | "layer">
): boolean {
  return m.layout === "layer" || m.layer === true;
}

export function isSoloStep(s: Pick<ScriptStep, "displayMode">): boolean {
  return s.displayMode === "solo";
}

export function isPairedStep(s: Pick<ScriptStep, "displayMode">): boolean {
  return s.displayMode !== "solo";
}

export function splitCaptionBeats(content: string): string[] {
  const raw = (content || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function newStepId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Build steps from legacy content + media (media first, then say beats). */
export function migrateLegacyToSteps(
  content: string | undefined,
  media: NodeMedia[] | undefined
): ScriptStep[] {
  const steps: ScriptStep[] = [];
  for (const m of media || []) {
    if (m.type !== "image" && m.type !== "video" && m.type !== "audio") continue;
    const step: ScriptStep = {
      id: newStepId(),
      type: m.type,
      url: m.url,
      displayMode: "paired",
    };
    if (typeof m.durationSec === "number") step.durationSec = m.durationSec;
    if (m.hideTimer) step.hideTimer = true;
    if (m.layout) step.layout = m.layout;
    if (m.layer) step.layer = m.layer;
    if (typeof m.zIndex === "number") step.zIndex = m.zIndex;
    if (typeof m.x === "number") step.x = m.x;
    if (typeof m.y === "number") step.y = m.y;
    if (typeof m.scale === "number") step.scale = m.scale;
    if (typeof m.opacity === "number") step.opacity = m.opacity;
    if (typeof m.widthPct === "number") step.widthPct = m.widthPct;
    steps.push(step);
  }
  for (const beat of splitCaptionBeats(content || "")) {
    steps.push({
      id: newStepId(),
      type: "say",
      text: beat,
      displayMode: "paired",
    });
  }
  return steps;
}

/** Ensure a node has a usable `steps` array (migrates legacy fields in memory). */
export function normalizeNode(raw: GameNode | Record<string, unknown>): GameNode {
  const n = raw as GameNode;
  // Only migrate when `steps` is missing. Empty array means intentionally empty.
  const steps = Array.isArray(n.steps)
    ? n.steps.map((s) => ({
        ...s,
        id: s.id || newStepId(),
        displayMode: s.displayMode === "solo" ? ("solo" as const) : ("paired" as const),
      }))
    : migrateLegacyToSteps(n.content, n.media);

  return {
    id: String(n.id || ""),
    title: String(n.title || ""),
    steps,
    content: typeof n.content === "string" ? n.content : "",
    media: Array.isArray(n.media) ? n.media : [],
    choices: Array.isArray(n.choices) ? n.choices : [],
    isEnding: !!n.isEnding,
    choiceTimerSec: n.choiceTimerSec,
    choiceTimerAllowSkip: n.choiceTimerAllowSkip,
    choiceTimerHide: n.choiceTimerHide,
  };
}

export function normalizeNodes(
  nodes: GameNode[] | Record<string, unknown>[] | undefined
): GameNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n) => normalizeNode(n));
}

/** Turn continueBeats text into temporary say steps for play（保留舞台图）. */
export function continueBeatsToSteps(text: string): ScriptStep[] {
  return splitCaptionBeats(text).map((t) => ({
    id: newStepId(),
    type: "say" as const,
    text: t,
    displayMode: "paired" as const,
  }));
}

/**
 * Compile timeline steps into on-screen beats.
 * Kept for tools / migration; play runtime uses the step interpreter instead.
 */
export function compilePlayBeats(steps: ScriptStep[]): PlayBeat[] {
  const beats: PlayBeat[] = [];
  let i = 0;
  const list = steps || [];

  while (i < list.length) {
    const s = list[i];

    if (s.type === "goto") {
      i += 1;
      continue;
    }

    if (s.type === "audioStop" || (s.type === "audio" && s.audioAction === "stop")) {
      beats.push({
        id: s.id,
        kind: "audioStop",
        channelId: s.channelId || "bgm",
        fadeMs: s.fadeMs,
        audioAction: "stop",
      });
      i += 1;
      continue;
    }

    if (s.type === "audio") {
      beats.push({
        id: s.id,
        kind: "audio",
        audioUrl: s.url,
        url: s.url,
        channelId: s.channelId || "bgm",
        volume: s.volume,
        loop: s.loop,
        durationSec: s.durationSec,
        stopOnLeave: s.stopOnLeave,
        fadeMs: s.fadeMs,
        audioAction: "play",
      });
      i += 1;
      continue;
    }

    if (s.type === "image" || s.type === "video") {
      if (isSoloStep(s)) {
        beats.push({
          id: s.id,
          kind: "imageOnly",
          mediaType: s.type,
          url: s.url,
          durationSec: s.durationSec,
          hideTimer: s.hideTimer,
          timerAsync: s.timerAsync,
        });
        i += 1;
        continue;
      }

      const captions: { id: string; text: string }[] = [];
      const inline = (s.text || "").trim();
      if (inline) captions.push({ id: `${s.id}_cap`, text: inline });

      let j = i + 1;
      while (j < list.length && list[j].type === "say" && isPairedStep(list[j])) {
        captions.push({
          id: list[j].id,
          text: (list[j].text || "").trim(),
        });
        j += 1;
      }

      if (captions.length === 0) {
        beats.push({
          id: s.id,
          kind: "imageOnly",
          mediaType: s.type,
          url: s.url,
          durationSec: s.durationSec,
          hideTimer: s.hideTimer,
          timerAsync: s.timerAsync,
        });
      } else {
        captions.forEach((cap, idx) => {
          beats.push({
            id: cap.id,
            kind: "paired",
            mediaType: s.type as "image" | "video",
            url: s.url,
            text: cap.text,
            durationSec: idx === 0 ? s.durationSec : undefined,
            hideTimer: idx === 0 ? s.hideTimer : undefined,
            timerAsync: idx === 0 ? s.timerAsync : undefined,
          });
        });
      }
      i = j;
      continue;
    }

    if (s.type === "say") {
      if (
        isPairedStep(s) &&
        i + 1 < list.length &&
        (list[i + 1].type === "image" || list[i + 1].type === "video") &&
        isPairedStep(list[i + 1])
      ) {
        const media = list[i + 1];
        const captions: { id: string; text: string }[] = [
          { id: s.id, text: (s.text || "").trim() },
        ];
        const inline = (media.text || "").trim();
        if (inline) captions.push({ id: `${media.id}_cap`, text: inline });

        let j = i + 2;
        while (j < list.length && list[j].type === "say" && isPairedStep(list[j])) {
          captions.push({
            id: list[j].id,
            text: (list[j].text || "").trim(),
          });
          j += 1;
        }

        captions.forEach((cap, idx) => {
          beats.push({
            id: cap.id,
            kind: "paired",
            mediaType: media.type as "image" | "video",
            url: media.url,
            text: cap.text,
            durationSec: idx === 0 ? media.durationSec : undefined,
            hideTimer: idx === 0 ? media.hideTimer : undefined,
            timerAsync: idx === 0 ? media.timerAsync : undefined,
          });
        });
        i = j;
        continue;
      }

      beats.push({
        id: s.id,
        kind: "storyOnly",
        text: (s.text || "").trim(),
        durationSec: s.durationSec,
        hideTimer: s.hideTimer,
        timerAsync: s.timerAsync,
      });
      i += 1;
      continue;
    }

    i += 1;
  }

  return beats;
}

export const STEP_TYPE_LABELS: Record<ScriptStepType, string> = {
  image: "图片",
  say: "剧情",
  audio: "音频",
  audioStop: "停止音频",
  video: "视频",
  goto: "跳转",
};

export const DISPLAY_MODE_LABELS: Record<StepDisplayMode, string> = {
  paired: "图文同屏",
  solo: "单独展示",
};
