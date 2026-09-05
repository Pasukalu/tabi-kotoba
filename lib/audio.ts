export interface TTSProvider {
  /** Resolves only after the utterance has finished, not when it is queued. */
  play(text: string, rate: number, onEnd?: () => void): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
}
const cancelled = () => new DOMException('播放已取消', 'AbortError');
export class BrowserTTS implements TTSProvider {
  generation = 0;
  private pending: ((reason: Error) => void) | null = null;
  async play(text: string, rate: number, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window))
      throw Error('当前浏览器不支持语音播放。');
    this.stop();
    const generation = this.generation;
    let voices = speechSynthesis.getVoices();
    if (!voices.length) {
      await new Promise((r) => setTimeout(r, 500));
      voices = speechSynthesis.getVoices();
    }
    if (generation !== this.generation) throw cancelled();
    const ja = voices.filter((v) => /^ja[-_]JP$/i.test(v.lang));
    const voice =
      ja.find((v) =>
        /Natural|Neural|Enhanced|Premium|Google|Kyoko|Nanami/i.test(v.name),
      ) || ja[0];
    if (!voice)
      throw Error(
        '设备未安装日语语音。请添加系统日语语音，或使用已配置的云端语音。',
      );
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.voice = voice;
      utterance.rate = rate;
      let settled = false;
      let startTimer: ReturnType<typeof setTimeout> | undefined;
      const fail = (e: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        if (generation === this.generation) this.pending = null;
        reject(e);
      };
      this.pending = fail;
      startTimer = setTimeout(() => {
        fail(Error('语音未能开始播放，请重试或检查设备语音设置。'));
        if (generation === this.generation) speechSynthesis.cancel();
      }, 10000);
      utterance.onstart = () => clearTimeout(startTimer);
      utterance.onend = () => {
        if (generation !== this.generation || settled) return;
        settled = true;
        clearTimeout(startTimer);
        this.pending = null;
        resolve();
        onEnd?.();
      };
      utterance.onerror = (e) =>
        fail(
          e.error === 'canceled' || e.error === 'interrupted'
            ? cancelled()
            : Error('语音播放失败，请重试。'),
        );
      speechSynthesis.speak(utterance);
    });
  }
  stop() {
    this.generation++;
    const pending = this.pending;
    this.pending = null;
    pending?.(cancelled());
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      speechSynthesis.cancel();
  }
  pause() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      speechSynthesis.pause();
  }
  resume() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      speechSynthesis.resume();
  }
}
export class CloudTTS implements TTSProvider {
  audio: HTMLAudioElement | null = null;
  url = '';
  controller: AbortController | null = null;
  generation = 0;
  private pending: ((e: Error) => void) | null = null;
  async play(text: string, rate: number, onEnd?: () => void) {
    this.stop();
    const generation = this.generation;
    this.controller = new AbortController();
    const timeout = setTimeout(() => this.controller?.abort(), 35000);
    let blob: Blob;
    try {
      const r = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.controller.signal,
        body: JSON.stringify({ text, rate, language: 'ja-JP' }),
      });
      if (!r.ok)
        throw Error('云端语音尚未配置或服务不可用，请切换设备日语语音。');
      blob = await r.blob();
    } catch (e) {
      if (generation !== this.generation) throw cancelled();
      throw e instanceof Error && e.name === 'AbortError'
        ? Error('语音服务响应超时，请重试。')
        : e;
    } finally {
      clearTimeout(timeout);
    }
    if (generation !== this.generation) throw cancelled();
    this.url = URL.createObjectURL(blob);
    const audio = new Audio(this.url);
    this.audio = audio;
    return new Promise<void>((resolve, reject) => {
      this.pending = reject;
      audio.onended = () => {
        if (generation !== this.generation) return;
        this.pending = null;
        resolve();
        onEnd?.();
      };
      audio.onerror = () => {
        this.pending = null;
        reject(Error('音频无法播放，请重试。'));
      };
      audio.play().catch((e) => {
        this.pending = null;
        reject(e);
      });
    });
  }
  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    this.pending?.(cancelled());
    this.pending = null;
    this.audio?.pause();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = '';
    this.audio = null;
  }
  pause() {
    this.audio?.pause();
  }
  resume() {
    void this.audio?.play().catch(() => {});
  }
}
let browser: BrowserTTS, cloud: CloudTTS;
export function tts(provider = 'browser'): TTSProvider {
  return provider === 'cloud'
    ? (cloud ||= new CloudTTS())
    : (browser ||= new BrowserTTS());
}
