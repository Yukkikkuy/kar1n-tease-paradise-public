/**
 * EOS / Milovana-style multi-channel audio for a play session.
 * Channels persist across story clicks; optionally across node jumps.
 */

export type AudioPlayOpts = {
  url: string;
  channelId?: string;
  volume?: number;
  loop?: boolean;
  /** 0 / omit = until natural end or explicit stop; >0 = stop after N seconds */
  durationSec?: number;
  /** true = stop this channel when leaving the current node */
  stopOnLeave?: boolean;
  fadeMs?: number;
};

type ChannelState = {
  el: HTMLAudioElement;
  stopOnLeave: boolean;
  durationTimer: ReturnType<typeof setTimeout> | null;
  fadeTimer: ReturnType<typeof setInterval> | null;
  url: string;
};

function clampVol(v: number | undefined): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

export class AudioManager {
  private channels = new Map<string, ChannelState>();

  play(opts: AudioPlayOpts): void {
    const channelId = (opts.channelId || "bgm").trim() || "bgm";
    const url = (opts.url || "").trim();
    if (!url) return;

    this.stopChannel(channelId, 0);

    const el = new Audio();
    el.preload = "auto";
    el.src = url;
    el.loop = !!opts.loop;
    el.volume = clampVol(opts.volume);

    const state: ChannelState = {
      el,
      // Default false = 跟随跳转（Milovana BGM）；勾选 stopOnLeave 则离开节点时停
      stopOnLeave: opts.stopOnLeave === true,
      durationTimer: null,
      fadeTimer: null,
      url,
    };

    this.channels.set(channelId, state);

    const dur =
      typeof opts.durationSec === "number" && opts.durationSec > 0
        ? opts.durationSec
        : 0;
    if (dur > 0) {
      state.durationTimer = setTimeout(() => {
        this.stopChannel(channelId, opts.fadeMs || 0);
      }, dur * 1000);
    }

    void el.play().catch(() => {});
  }

  stop(channelId?: string, fadeMs = 0): void {
    const id = (optsChannel(channelId));
    if (!id) {
      this.stopAll(fadeMs);
      return;
    }
    this.stopChannel(id, fadeMs);
  }

  /** Call when leaving a node (goto / restart). Keeps channels with stopOnLeave=false. */
  onLeaveNode(): void {
    Array.from(this.channels.entries()).forEach(([id, state]) => {
      if (state.stopOnLeave) this.stopChannel(id, 0);
    });
  }

  stopAll(fadeMs = 0): void {
    Array.from(this.channels.keys()).forEach((id) => {
      this.stopChannel(id, fadeMs);
    });
  }

  dispose(): void {
    this.stopAll(0);
  }

  private stopChannel(channelId: string, fadeMs: number): void {
    const state = this.channels.get(channelId);
    if (!state) return;

    if (state.durationTimer) {
      clearTimeout(state.durationTimer);
      state.durationTimer = null;
    }
    if (state.fadeTimer) {
      clearInterval(state.fadeTimer);
      state.fadeTimer = null;
    }

    const { el } = state;
    const finish = () => {
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* ignore */
      }
      this.channels.delete(channelId);
    };

    if (fadeMs > 0 && el.volume > 0) {
      const steps = Math.max(4, Math.floor(fadeMs / 40));
      const startVol = el.volume;
      let i = 0;
      state.fadeTimer = setInterval(() => {
        i += 1;
        el.volume = Math.max(0, startVol * (1 - i / steps));
        if (i >= steps) {
          if (state.fadeTimer) clearInterval(state.fadeTimer);
          state.fadeTimer = null;
          finish();
        }
      }, fadeMs / steps);
    } else {
      finish();
    }
  }
}

function optsChannel(channelId?: string): string {
  return (channelId || "").trim();
}
