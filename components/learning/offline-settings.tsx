'use client';
import { useEffect, useRef, useState } from 'react';
import { cacheLearningPages } from '@/lib/offline';
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function OfflineSettings() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [count, setCount] = useState({ done: 0, total: 0 });
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', capture);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      request.current?.abort();
    };
  }, []);
  async function download() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage('正在保存课程页面和本页已加载的资源…');
    try {
      const result = await cacheLearningPages(
        controller.signal,
        (done, total) => setCount({ done, total }),
      );
      if (controller.signal.aborted) return;
      setMessage(
        result.failed.length
          ? `已保存 ${result.saved}/${result.total} 项。部分内容未保存成功，可联网后重试。`
          : `已保存 ${result.saved} 项课程页面与资源。出发前请断网试开一次需要的课程。`,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error ? error.message : '保存未完成，请重试。',
        );
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  return (
    <section className="panel settings-panel">
      <h2>旅行前のオフライン準備</h2>
      <p>
        联网时保存课程页面。离线可学习已缓存内容、进行本地模拟和复习；在线 AI
        与未缓存的云端发音仍需网络。
      </p>
      <button
        className="primary"
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? '正在保存…' : '保存离线课程'}
      </button>
      {busy && (
        <>
          <progress
            aria-label="课程保存进度"
            max={count.total || 1}
            value={count.done}
          />
          <button
            className="secondary"
            onClick={() => {
              request.current?.abort();
              setMessage('已取消。已保存的内容可继续使用。');
              setBusy(false);
            }}
          >
            取消保存
          </button>
        </>
      )}
      <output aria-live="polite">{message}</output>
      {install ? (
        <button
          className="secondary"
          onClick={async () => {
            await install.prompt();
            const result = await install.userChoice;
            setMessage(
              result.outcome === 'accepted'
                ? '已接受安装，请查看主屏幕。'
                : '可以稍后再安装。',
            );
            setInstall(null);
          }}
        >
          安装到主屏幕
        </button>
      ) : (
        <p className="muted">
          iPhone 可在 Safari
          的分享菜单选择「添加到主屏幕」。其他浏览器可查看菜单中的安装选项；是否提供取决于浏览器。
        </p>
      )}
      <p className="muted">
        浏览器可能自动清理缓存。离线内容保存状态与学习进度备份是两回事，重要进度请另行导出。
      </p>
      <p className="muted">
        安装说明：
        <a
          href="https://support.apple.com/en-gb/guide/iphone/iphea86e5236/ios"
          target="_blank"
          rel="noreferrer"
        >
          Apple 官方指南
        </a>{' '}
        ·{' '}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event"
          target="_blank"
          rel="noreferrer"
        >
          浏览器兼容性
        </a>
      </p>
    </section>
  );
}
