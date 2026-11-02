"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  DISPLAY_MODE_LABELS,
  normalizeNode,
  normalizeNodes,
  STEP_TYPE_LABELS,
  type ChoiceAction,
  type GameChoice,
  type GameNode,
  type ScriptStep,
  type ScriptStepType,
  type StepDisplayMode,
} from "@/lib/types";

function newStep(type: ScriptStepType, partial?: Partial<ScriptStep>): ScriptStep {
  return {
    id: `s_${nanoid(8)}`,
    type,
    displayMode: "paired",
    ...partial,
  };
}

function newNode(): GameNode {
  return {
    id: `node_${nanoid(8)}`,
    title: "新节点",
    steps: [],
    content: "",
    media: [],
    choices: [],
    isEnding: false,
  };
}


/** 剧情/图片停留计时面板：停留秒数 · 允许跳过 · 显示倒计时 · 高级异步 */
function DwellTimerFields({
  step,
  nodes,
  onPatch,
  onClearDuration,
  hint,
}: {
  step: ScriptStep;
  nodes: GameNode[];
  onPatch: (patch: Partial<ScriptStep>) => void;
  onClearDuration: () => void;
  hint?: string;
}) {
  const hasDwell = typeof step.durationSec === "number" && step.durationSec > 0;
  return (
    <div className="rounded border border-stone-700/80 bg-stone-950/60 p-2.5 space-y-2">
      <div className="text-[11px] font-medium text-stone-400">停留与倒计时</div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300">
        <label className="flex items-center gap-1.5">
          停留秒数
          <input
            type="number"
            min={0}
            step={1}
            className="w-20 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-stone-200"
            value={step.durationSec ?? ""}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onClearDuration();
              } else {
                onPatch({ durationSec: Math.max(0, Number(raw) || 0) });
              }
            }}
          />
        </label>
        <span className="text-stone-600">
          {hint || "0/空 = 无自动翻页，只等人点"}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-stone-300">
        <label
          className={`flex items-center gap-1.5 ${hasDwell ? "" : "opacity-50"}`}
          title={hasDwell ? undefined : "请先设置停留秒数"}
        >
          <input
            type="checkbox"
            disabled={!hasDwell}
            checked={hasDwell ? step.allowSkip !== false : true}
            onChange={(e) =>
              onPatch({
                allowSkip: e.target.checked ? undefined : false,
              })
            }
          />
          允许跳过
        </label>
        <label
          className={`flex items-center gap-1.5 ${hasDwell ? "" : "opacity-50"}`}
          title={hasDwell ? undefined : "请先设置停留秒数"}
        >
          <input
            type="checkbox"
            disabled={!hasDwell}
            checked={hasDwell ? !step.hideTimer : true}
            onChange={(e) =>
              onPatch({
                hideTimer: e.target.checked ? undefined : true,
              })
            }
          />
          显示倒计时
        </label>
      </div>
      <p className="text-[11px] text-stone-600">
        停留秒数>0 时本段会倒计时后自动继续；取消「允许跳过」后玩家必须等完，点屏幕无效。
      </p>
      <details className="text-xs text-stone-400">
        <summary className="cursor-pointer select-none text-stone-500 hover:text-stone-300">
          高级：异步计时
        </summary>
        <div className="mt-2 space-y-2 pl-1">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!!step.timerAsync}
              onChange={(e) =>
                onPatch({
                  timerAsync: e.target.checked ? true : undefined,
                })
              }
            />
            异步计时（倒计时同时继续跑后续步骤）
          </label>
          {!!step.timerAsync && (
            <div className="flex flex-wrap items-center gap-2">
              <span>到期动作</span>
              <select
                className="rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                value={step.timerOnEnd || "advance"}
                onChange={(e) =>
                  onPatch({
                    timerOnEnd: e.target.value as "advance" | "goto" | "none",
                  })
                }
              >
                <option value="advance">自动继续</option>
                <option value="goto">跳转节点</option>
                <option value="none">无动作</option>
              </select>
              {(step.timerOnEnd || "advance") === "goto" && (
                <select
                  className="rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                  value={step.timerGotoNodeId || ""}
                  onChange={(e) =>
                    onPatch({
                      timerGotoNodeId: e.target.value,
                    })
                  }
                >
                  <option value="">选择节点</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || n.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function stepPreview(s: ScriptStep): string {
  if (s.type === "goto") {
    return s.targetNodeId ? `→ ${s.targetNodeId}` : "（未选目标）";
  }
  if (s.type === "say") {
    const t = (s.text || "").trim();
    const bits: string[] = [];
    bits.push(!t ? "（空剧情）" : t.length > 40 ? t.slice(0, 40) + "…" : t);
    if (typeof s.durationSec === "number" && s.durationSec > 0) {
      if (s.timerAsync) {
        bits.push(`异步${s.durationSec}s`);
      } else {
        bits.push(`停留${s.durationSec}s`);
        bits.push(s.allowSkip === false ? "不可跳过" : "可跳过");
      }
    }
    return bits.join(" · ");
  }
  if (s.type === "audioStop" || (s.type === "audio" && s.audioAction === "stop")) {
    return `停止声道 ${(s.channelId || "bgm").trim() || "bgm"}`;
  }
  if (s.type === "audio") {
    const ch = (s.channelId || "bgm").trim() || "bgm";
    const bits = [ch];
    if (s.loop) bits.push("循环");
    if (s.stopOnLeave) bits.push("离页停");
    else bits.push("跟随跳转");
    if (typeof s.durationSec === "number" && s.durationSec > 0) {
      bits.push(`${s.durationSec}秒`);
    }
    if (!s.url) bits.push("未上传");
    return bits.join(" · ");
  }
  const bits: string[] = [];
  const cap = (s.text || "").trim();
  if (cap) bits.push(cap.length > 36 ? cap.slice(0, 36) + "…" : cap);
  else if (!s.url) bits.push("（未上传）");
  else bits.push("已上传媒体");
  if (typeof s.durationSec === "number" && s.durationSec > 0) {
    if (s.timerAsync) {
      bits.push(`异步${s.durationSec}s`);
    } else {
      bits.push(`停留${s.durationSec}s`);
      bits.push(s.allowSkip === false ? "不可跳过" : "可跳过");
    }
  }
  return bits.join(" · ");
}

function StepIcon({ type }: { type: ScriptStepType }) {
  if (type === "image") {
    return (
      <span className="step-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M3 16l5-4 4 3 3-2 6 3" />
        </svg>
      </span>
    );
  }
  if (type === "say") {
    return (
      <span className="step-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 6h14a2 2 0 012 2v6a2 2 0 01-2 2H10l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
      </span>
    );
  }
  if (type === "audio" || type === "audioStop") {
    return (
      <span className="step-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 18V6l10-2v12" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="16" r="2" />
          {type === "audioStop" ? <path d="M4 4l16 16" /> : null}
        </svg>
      </span>
    );
  }
  if (type === "goto") {
    return (
      <span className="step-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </span>
    );
  }
  return (
    <span className="step-icon" aria-hidden>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export default function EditorPage() {
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [published, setPublished] = useState(false);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GameNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [menuStepId, setMenuStepId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      if (!res.ok || !data.canEdit) {
        setErr(data.error || "无权编辑");
        return;
      }
      setTitle(data.game.title);
      setDescription(data.game.description || "");
      setIsFree(!!data.game.isFree);
      setPublished(!!data.game.published);
      setStartNodeId(data.game.startNodeId);
      const ns = normalizeNodes(data.game.nodes || []);
      setNodes(ns);
      setSelectedId(data.game.startNodeId || ns[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function updateSelected(patch: Partial<GameNode>) {
    if (!selectedId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedId ? { ...n, ...patch } : n))
    );
  }

  function setSteps(steps: ScriptStep[]) {
    updateSelected({ steps });
  }

  function addNode() {
    const n = newNode();
    setNodes((prev) => [...prev, n]);
    setSelectedId(n.id);
    if (!startNodeId) setStartNodeId(n.id);
  }

  function deleteNode(nid: string) {
    setNodes((prev) => prev.filter((n) => n.id !== nid));
    if (selectedId === nid) setSelectedId(null);
    if (startNodeId === nid) setStartNodeId(null);
  }

  function addChoice() {
    if (!selected) return;
    const c: GameChoice = {
      id: `c_${nanoid(6)}`,
      text: "新选项",
      targetNodeId: nodes[0]?.id || "",
      action: "goto",
    };
    updateSelected({ choices: [...selected.choices, c] });
  }

  function updateChoice(cid: string, patch: Partial<GameChoice>) {
    if (!selected) return;
    updateSelected({
      choices: selected.choices.map((c) => {
        if (c.id !== cid) {
          if (patch.isDefault === true) {
            return { ...c, isDefault: false };
          }
          return c;
        }
        return { ...c, ...patch };
      }),
    });
  }

  function removeChoice(cid: string) {
    if (!selected) return;
    updateSelected({
      choices: selected.choices.filter((c) => c.id !== cid),
    });
  }

  function addStep(type: ScriptStepType, mode: StepDisplayMode = "paired") {
    if (!selected) return;
    let step: ScriptStep;
    if (type === "say") {
      step = newStep("say", { text: "", displayMode: mode });
    } else if (type === "goto") {
      step = newStep("goto", {
        targetNodeId: nodes.find((n) => n.id !== selected.id)?.id || nodes[0]?.id || "",
        displayMode: "paired",
      });
    } else if (type === "audio") {
      step = newStep("audio", {
        url: "",
        audioAction: "play",
        channelId: "bgm",
        volume: 1,
        loop: true,
        durationSec: 0,
        stopOnLeave: false,
        fadeMs: 0,
        displayMode: "paired",
      });
    } else if (type === "audioStop") {
      step = newStep("audioStop", {
        channelId: "bgm",
        audioAction: "stop",
        fadeMs: 0,
        displayMode: "paired",
      });
    } else {
      step = newStep(type, { url: "", text: "", displayMode: mode });
    }
    const steps = [...(selected.steps || []), step];
    setSteps(steps);
    setExpandedStepId(step.id);
  }

  /** 图文同屏快捷：一张图 + 同屏剧情字段 */
  function addImageWithStory() {
    if (!selected) return;
    const step = newStep("image", {
      url: "",
      text: "",
      displayMode: "paired",
    });
    setSteps([...(selected.steps || []), step]);
    setExpandedStepId(step.id);
  }

  function patchStep(sid: string, patch: Partial<ScriptStep>) {
    if (!selected) return;
    setSteps(
      (selected.steps || []).map((s) =>
        s.id === sid ? { ...s, ...patch } : s
      )
    );
  }

  function removeStep(sid: string) {
    if (!selected) return;
    setSteps((selected.steps || []).filter((s) => s.id !== sid));
    if (expandedStepId === sid) setExpandedStepId(null);
    setMenuStepId(null);
  }

  function moveStep(sid: string, dir: -1 | 1) {
    if (!selected) return;
    const steps = [...(selected.steps || [])];
    const i = steps.findIndex((s) => s.id === sid);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setSteps(steps);
  }

  function reorderStep(fromId: string, toId: string) {
    if (!selected || fromId === toId) return;
    const steps = [...(selected.steps || [])];
    const from = steps.findIndex((s) => s.id === fromId);
    const to = steps.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = steps.splice(from, 1);
    steps.splice(to, 0, item);
    setSteps(steps);
  }

  async function uploadForStep(sid: string, file: File, type: ScriptStepType) {
    if (!selected) return;
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("gameId", id);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "上传失败");
        return;
      }
      if (type !== "say") {
        patchStep(sid, { url: data.url, type });
      } else {
        patchStep(sid, { url: data.url });
      }
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setMsg("");
    setErr("");
    const normalized = nodes.map((n) => normalizeNode(n));
    const res = await fetch(`/api/games/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        isFree,
        published,
        startNodeId,
        nodes: normalized,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "保存失败");
      return;
    }
    if (data.game?.nodes) {
      setNodes(normalizeNodes(data.game.nodes));
    }
    setMsg("已保存");
  }

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            title,
            description,
            isFree,
            startNodeId,
            nodes: nodes.map((n) => normalizeNode(n)),
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title || "game"}.json`;
    a.click();
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.title) setTitle(data.title);
        if (data.description !== undefined) setDescription(data.description);
        if (typeof data.isFree === "boolean") setIsFree(data.isFree);
        if (Array.isArray(data.nodes)) {
          const ns = normalizeNodes(data.nodes);
          setNodes(ns);
          setStartNodeId(data.startNodeId || ns[0]?.id || null);
          setSelectedId(data.startNodeId || ns[0]?.id || null);
        }
        setMsg("已导入 JSON（请记得保存）");
      } catch {
        setErr("JSON 解析失败");
      }
    };
    reader.readAsText(file);
  }

  if (loading) return <p className="text-stone-500">加载编辑器…</p>;
  if (err && nodes.length === 0 && !title)
    return (
      <div>
        <p className="text-red-400">{err}</p>
        <Link href="/admin/games" className="text-amber-300">
          返回
        </Link>
      </div>
    );

  return (
    <div className="space-y-4" onClick={() => setMenuStepId(null)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/games"
            className="text-sm text-stone-500 hover:text-amber-300"
          >
            ← 作品
          </Link>
          <h1 className="text-xl font-bold text-amber-100">剧情编辑器</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={exportJson}
            className="rounded border border-stone-600 px-3 py-1.5"
          >
            导出 JSON
          </button>
          <label className="cursor-pointer rounded border border-stone-600 px-3 py-1.5">
            导入 JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
              }}
            />
          </label>
          <button
            onClick={save}
            className="rounded bg-amber-700 px-4 py-1.5 text-amber-50 hover:bg-amber-600"
          >
            保存
          </button>
        </div>
      </div>

      {(msg || err) && (
        <p className={msg ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>
          {msg || err}
        </p>
      )}

      <div className="grid gap-3 rounded-xl border border-stone-700 bg-stone-950/50 p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-stone-500">标题</span>
          <input
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-stone-500">起始节点</span>
          <select
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
            value={startNodeId || ""}
            onChange={(e) => setStartNodeId(e.target.value || null)}
          >
            <option value="">未设置</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || n.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-stone-500">简介</span>
          <textarea
            className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
          />
          免费作品
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          已发布
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-stone-700 bg-stone-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-300">节点</h2>
            <button
              onClick={addNode}
              className="text-xs text-amber-300 hover:underline"
            >
              + 添加
            </button>
          </div>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {nodes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    setSelectedId(n.id);
                    setExpandedStepId(null);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                    selectedId === n.id
                      ? "bg-amber-900/50 text-amber-100"
                      : "hover:bg-stone-800 text-stone-400"
                  }`}
                >
                  {n.title || n.id}
                  {startNodeId === n.id && (
                    <span className="ml-1 text-[10px] text-emerald-400">起</span>
                  )}
                  {n.isEnding && (
                    <span className="ml-1 text-[10px] text-rose-400">终</span>
                  )}
                  <span className="ml-1 text-[10px] text-stone-600">
                    {(n.steps || []).length}步
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-stone-700 bg-stone-950/60 p-4">
          {!selected ? (
            <p className="text-stone-500">选择或添加一个节点开始编辑。</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  className="flex-1 rounded border border-stone-600 bg-stone-900 px-2 py-1.5 text-lg font-semibold"
                  value={selected.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                />
                <button
                  onClick={() => deleteNode(selected.id)}
                  className="text-xs text-rose-400 hover:underline"
                >
                  删除节点
                </button>
              </div>
              <p className="font-mono text-xs text-stone-600">ID: {selected.id}</p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected.isEnding}
                  onChange={(e) =>
                    updateSelected({ isEnding: e.target.checked })
                  }
                />
                标记为结局节点
              </label>

              {/* Script timeline */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-300">
                      脚本时间线
                    </h3>
                    <p className="text-xs text-stone-500">
                      默认图文同屏。每段剧情可设停留秒数、是否允许跳过、是否显示倒计时。图片非阻塞；音频持久；「跳转」可中途换页。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => addImageWithStory()}
                      className="rounded border border-amber-700/70 bg-amber-950/40 px-2 py-1 text-amber-200 hover:border-amber-500"
                    >
                      + 图文同屏
                    </button>
                    {(
                      [
                        ["image", "图片"],
                        ["say", "剧情"],
                        ["audio", "音频"],
                        ["audioStop", "停音频"],
                        ["video", "视频"],
                        ["goto", "跳转"],
                      ] as const
                    ).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addStep(type)}
                        className="rounded border border-stone-600 px-2 py-1 hover:border-amber-600 hover:text-amber-200"
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>

                <ul className="step-list space-y-1.5">
                  {(selected.steps || []).map((s) => {
                    const open = expandedStepId === s.id;
                    return (
                      <li
                        key={s.id}
                        className={`step-row ${open ? "step-row-active" : ""} ${
                          dragId === s.id ? "opacity-60" : ""
                        }`}
                        draggable
                        onDragStart={(e) => {
                          setDragId(s.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", s.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = e.dataTransfer.getData("text/plain");
                          if (from) reorderStep(from, s.id);
                          setDragId(null);
                        }}
                      >
                        <button
                          type="button"
                          className="step-row-main"
                          onClick={() =>
                            setExpandedStepId(open ? null : s.id)
                          }
                        >
                          <StepIcon type={s.type} />
                          <span className="step-row-text">
                            <span className="step-row-type">
                              {STEP_TYPE_LABELS[s.type]}
                              {s.type !== "audio" && s.type !== "audioStop" && s.type !== "goto" && (
                                <span className="ml-1 text-[10px] font-normal text-stone-500">
                                  · {DISPLAY_MODE_LABELS[s.displayMode === "solo" ? "solo" : "paired"]}
                                </span>
                              )}
                            </span>
                            <span className="step-row-preview">
                              {stepPreview(s)}
                            </span>
                          </span>
                        </button>

                        <div className="step-row-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              type="button"
                              className="step-menu-btn"
                              title="菜单"
                              onClick={() =>
                                setMenuStepId(menuStepId === s.id ? null : s.id)
                              }
                            >
                              ⋮
                            </button>
                            {menuStepId === s.id && (
                              <div className="step-menu">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedStepId(s.id);
                                    setMenuStepId(null);
                                  }}
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveStep(s.id, -1)}
                                >
                                  上移
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveStep(s.id, 1)}
                                >
                                  下移
                                </button>
                                <button
                                  type="button"
                                  className="text-rose-400"
                                  onClick={() => removeStep(s.id)}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                          <span
                            className="step-grab"
                            title="拖拽排序"
                            aria-hidden
                          >
                            ＝
                          </span>
                        </div>

                        {open && (
                          <div
                            className="step-editor"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.type !== "audio" && s.type !== "audioStop" && s.type !== "goto" && (
                              <label className="mb-2 block text-xs text-stone-500">
                                展示方式
                                <select
                                  className="mt-1 w-full rounded border border-stone-600 bg-stone-950 px-2 py-1.5 text-sm text-stone-200"
                                  value={s.displayMode === "solo" ? "solo" : "paired"}
                                  onChange={(e) =>
                                    patchStep(s.id, {
                                      displayMode: e.target.value as StepDisplayMode,
                                    })
                                  }
                                >
                                  <option value="paired">
                                    图文同屏（默认：图片带着剧情）
                                  </option>
                                  <option value="solo">
                                    {s.type === "say"
                                      ? "剧情单独展示（纯文字）"
                                      : "图片单独展示（无旁白）"}
                                  </option>
                                </select>
                              </label>
                            )}

                            {s.type === "say" && (
                              <div className="space-y-2">
                                <label className="block text-xs text-stone-500">
                                  剧情文本
                                  <textarea
                                    className="mt-1 w-full rounded border border-stone-600 bg-stone-950 px-2 py-1.5 text-sm text-stone-200"
                                    rows={4}
                                    value={s.text || ""}
                                    onChange={(e) =>
                                      patchStep(s.id, { text: e.target.value })
                                    }
                                    placeholder="这一步显示的旁白…"
                                  />
                                </label>
                                <DwellTimerFields
                                  step={s}
                                  nodes={nodes}
                                  onPatch={(patch) => patchStep(s.id, patch)}
                                  onClearDuration={() => {
                                    const next = { ...s };
                                    delete next.durationSec;
                                    delete next.allowSkip;
                                    delete next.hideTimer;
                                    setSteps(
                                      (selected.steps || []).map((x) =>
                                        x.id === s.id ? next : x
                                      )
                                    );
                                  }}
                                  hint="本段旁白停留 N 秒后自动继续；0/空 = 只等人点"
                                />
                              </div>
                            )}

                            {s.type === "goto" && (
                              <div className="space-y-2 text-xs text-stone-400">
                                <p className="text-stone-500">
                                  脚本执行到此步时立刻跳转到目标节点（非阻塞，无需选项）。
                                </p>
                                <label className="flex items-center gap-2">
                                  目标节点
                                  <select
                                    className="flex-1 rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-200"
                                    value={s.targetNodeId || ""}
                                    onChange={(e) =>
                                      patchStep(s.id, { targetNodeId: e.target.value })
                                    }
                                  >
                                    <option value="">选择节点</option>
                                    {nodes.map((n) => (
                                      <option key={n.id} value={n.id}>
                                        {n.title || n.id}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            )}

                            {s.type === "audioStop" && (
                              <div className="space-y-2 text-xs text-stone-400">
                                <p className="text-stone-500">
                                  立刻停止指定声道（不影响剧情点击；可跨页保留的背景乐用此步关掉）。
                                </p>
                                <label className="flex items-center gap-2">
                                  声道名
                                  <input
                                    className="w-32 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                    value={s.channelId || "bgm"}
                                    onChange={(e) =>
                                      patchStep(s.id, {
                                        channelId: e.target.value || "bgm",
                                      })
                                    }
                                    placeholder="bgm"
                                  />
                                </label>
                                <label className="flex items-center gap-2">
                                  淡出毫秒
                                  <input
                                    type="number"
                                    min={0}
                                    step={50}
                                    className="w-24 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                    value={s.fadeMs ?? 0}
                                    onChange={(e) =>
                                      patchStep(s.id, {
                                        fadeMs: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                  />
                                </label>
                              </div>
                            )}

                            {s.type === "audio" && (
                              <div className="space-y-2">
                                <p className="text-xs text-stone-500">
                                  持久音频：点「继续」不会打断。可设声道、时长、是否跟随跳转。
                                </p>
                                <label className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded border border-stone-600 px-2 py-1 cursor-pointer hover:border-amber-600">
                                    {uploading ? "上传中…" : "上传音频"}
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="audio/*"
                                      disabled={uploading}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) uploadForStep(s.id, f, "audio");
                                        e.target.value = "";
                                      }}
                                    />
                                  </span>
                                  <input
                                    className="min-w-0 flex-1 rounded border border-stone-600 bg-stone-950 px-2 py-1 font-mono text-[11px] text-stone-400"
                                    value={s.url || ""}
                                    onChange={(e) =>
                                      patchStep(s.id, { url: e.target.value })
                                    }
                                    placeholder="/uploads/….mp3"
                                  />
                                </label>
                                {s.url ? (
                                  <audio controls className="w-full" src={s.url} />
                                ) : null}
                                <div className="grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                                  <label className="flex items-center gap-2">
                                    声道
                                    <input
                                      className="w-28 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                      value={s.channelId || "bgm"}
                                      onChange={(e) =>
                                        patchStep(s.id, {
                                          channelId: e.target.value || "bgm",
                                        })
                                      }
                                      placeholder="bgm / sfx"
                                    />
                                  </label>
                                  <label className="flex items-center gap-2">
                                    音量 0–1
                                    <input
                                      type="number"
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      className="w-20 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                      value={s.volume ?? 1}
                                      onChange={(e) =>
                                        patchStep(s.id, {
                                          volume: Math.min(
                                            1,
                                            Math.max(0, Number(e.target.value) || 0)
                                          ),
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="flex items-center gap-2">
                                    持续秒数
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className="w-20 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                      value={s.durationSec ?? 0}
                                      onChange={(e) =>
                                        patchStep(s.id, {
                                          durationSec: Math.max(
                                            0,
                                            Number(e.target.value) || 0
                                          ),
                                        })
                                      }
                                    />
                                    <span className="text-stone-600">0=播完/直到停</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    淡出毫秒
                                    <input
                                      type="number"
                                      min={0}
                                      step={50}
                                      className="w-24 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
                                      value={s.fadeMs ?? 0}
                                      onChange={(e) =>
                                        patchStep(s.id, {
                                          fadeMs: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs text-stone-300">
                                  <label className="flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={!!s.loop}
                                      onChange={(e) =>
                                        patchStep(s.id, { loop: e.target.checked })
                                      }
                                    />
                                    循环播放
                                  </label>
                                  <label className="flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={!!s.stopOnLeave}
                                      onChange={(e) =>
                                        patchStep(s.id, {
                                          stopOnLeave: e.target.checked,
                                        })
                                      }
                                    />
                                    离开本页时停止
                                    <span className="text-stone-600">
                                      （不勾选=跟随跳转继续播）
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {(s.type === "image" || s.type === "video") && (
                              <div className="space-y-2">
                                <label className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded border border-stone-600 px-2 py-1 cursor-pointer hover:border-amber-600">
                                    {uploading ? "上传中…" : "上传文件"}
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept={
                                        s.type === "image" ? "image/*" : "video/*"
                                      }
                                      disabled={uploading}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) uploadForStep(s.id, f, s.type);
                                        e.target.value = "";
                                      }}
                                    />
                                  </span>
                                  <input
                                    className="min-w-0 flex-1 rounded border border-stone-600 bg-stone-950 px-2 py-1 font-mono text-[11px] text-stone-400"
                                    value={s.url || ""}
                                    onChange={(e) =>
                                      patchStep(s.id, { url: e.target.value })
                                    }
                                    placeholder="/uploads/…"
                                  />
                                </label>
                                {s.type === "image" && s.url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={s.url}
                                    alt=""
                                    className="max-h-40 w-full rounded object-contain bg-black"
                                  />
                                )}
                                {s.type === "video" && s.url && (
                                  <video
                                    controls
                                    className="max-h-40 w-full bg-black"
                                    src={s.url}
                                  />
                                )}
                                {s.displayMode !== "solo" && (
                                  <label className="block text-xs text-stone-500">
                                    同屏剧情（可空；有文字时换图后会暂停等人点。多图替换请用连续「图片」步骤，旁白用后面的「剧情」）
                                    <textarea
                                      className="mt-1 w-full rounded border border-stone-600 bg-stone-950 px-2 py-1.5 text-sm text-stone-200"
                                      rows={3}
                                      value={s.text || ""}
                                      onChange={(e) =>
                                        patchStep(s.id, { text: e.target.value })
                                      }
                                      placeholder="与图片一起显示的旁白…"
                                    />
                                  </label>
                                )}
                                <DwellTimerFields
                                  step={s}
                                  nodes={nodes}
                                  onPatch={(patch) => patchStep(s.id, patch)}
                                  onClearDuration={() => {
                                    const next = { ...s };
                                    delete next.durationSec;
                                    delete next.allowSkip;
                                    delete next.hideTimer;
                                    setSteps(
                                      (selected.steps || []).map((x) =>
                                        x.id === s.id ? next : x
                                      )
                                    );
                                  }}
                                  hint="有同屏旁白时=旁白停留；无旁白且同步=换图后卡住等倒计时"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {(selected.steps || []).length === 0 && (
                  <p className="mt-2 text-xs text-stone-600">
                    还没有步骤。可先点「+ 图文同屏」，或分别加图片 / 剧情。
                  </p>
                )}
              </div>

              {/* Choice timer */}
              <div className="rounded border border-stone-700 bg-stone-900/40 p-3 space-y-2">
                <h3 className="text-sm font-semibold text-stone-300">
                  选项倒计时
                </h3>
                <p className="text-xs text-stone-500">
                  脚本播完、选项出现后开始计时；超时选中「超时默认」选项。
                </p>
                <label className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
                  <span className="text-stone-500">秒数</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-24 rounded border border-stone-600 bg-stone-950 px-2 py-1"
                    value={selected.choiceTimerSec ?? ""}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        updateSelected({ choiceTimerSec: undefined });
                      } else {
                        updateSelected({
                          choiceTimerSec: Math.max(0, Number(raw) || 0),
                        });
                      }
                    }}
                  />
                  <span className="text-stone-600">（0 或不填 = 无倒计时）</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input
                    type="checkbox"
                    checked={!!selected.choiceTimerAllowSkip}
                    onChange={(e) =>
                      updateSelected({
                        choiceTimerAllowSkip: e.target.checked,
                      })
                    }
                  />
                  允许跳过倒计时
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input
                    type="checkbox"
                    checked={!!selected.choiceTimerHide}
                    onChange={(e) =>
                      updateSelected({ choiceTimerHide: e.target.checked })
                    }
                  />
                  隐藏倒计时圆环（仍计时）
                </label>
              </div>

              {/* Choices */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-300">
                    选项分支（脚本结束后出现）
                  </h3>
                  <button
                    onClick={addChoice}
                    className="text-xs text-amber-300 hover:underline"
                  >
                    + 添加选项
                  </button>
                </div>
                <ul className="space-y-3">
                  {selected.choices.map((c) => {
                    const action: ChoiceAction =
                      c.action === "continue" ? "continue" : "goto";
                    return (
                      <li
                        key={c.id}
                        className="rounded border border-stone-700 p-3 space-y-2"
                      >
                        <input
                          className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm"
                          value={c.text}
                          onChange={(e) =>
                            updateChoice(c.id, { text: e.target.value })
                          }
                          placeholder="选项文字"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-stone-500">动作</span>
                          <select
                            className="rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm"
                            value={action}
                            onChange={(e) =>
                              updateChoice(c.id, {
                                action: e.target.value as ChoiceAction,
                              })
                            }
                          >
                            <option value="goto">跳转页面</option>
                            <option value="continue">继续剧情</option>
                          </select>
                          <label className="ml-auto flex items-center gap-1 text-xs text-stone-400">
                            <input
                              type="checkbox"
                              checked={!!c.isDefault}
                              onChange={(e) =>
                                updateChoice(c.id, {
                                  isDefault: e.target.checked,
                                })
                              }
                            />
                            超时默认
                          </label>
                          <button
                            onClick={() => removeChoice(c.id)}
                            className="text-xs text-rose-400"
                          >
                            删
                          </button>
                        </div>
                        {action === "goto" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">跳转到</span>
                            <select
                              className="flex-1 rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm"
                              value={c.targetNodeId}
                              onChange={(e) =>
                                updateChoice(c.id, {
                                  targetNodeId: e.target.value,
                                })
                              }
                            >
                              <option value="">选择节点</option>
                              {nodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.title || n.id}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <label className="block text-xs text-stone-500">
                            继续正文（可选；空行分段成多条剧情步骤）
                            <textarea
                              className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200"
                              rows={3}
                              value={c.continueBeats || ""}
                              onChange={(e) =>
                                updateChoice(c.id, {
                                  continueBeats: e.target.value,
                                })
                              }
                              placeholder="追加剧情…"
                            />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
