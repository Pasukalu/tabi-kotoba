'use client';
import { useEffect, useState } from 'react';
import { useLearning } from '@/lib/learning';
import { Choice } from './text';
export function useCapabilities() {
  const [state, setState] = useState<{
    conversation: boolean;
    speech: boolean;
    speechProvider: string | null;
    loaded: boolean;
    error: boolean;
  }>({
    conversation: false,
    speech: false,
    speechProvider: null,
    loaded: false,
    error: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/capabilities', { signal: controller.signal, cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d: any) =>
        setState({
          conversation: d?.conversation === true,
          speech: d?.speech === true,
          speechProvider:
            typeof d?.speechProvider === 'string' ? d.speechProvider : null,
          loaded: true,
          error: false,
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted)
          setState((s) => ({ ...s, loaded: true, error: true }));
      });
    return () => controller.abort();
  }, []);
  return state;
}
export default function ServiceStatus() {
  const c = useCapabilities(),
    { settings, setSettings } = useLearning();
  return (
    <section className="panel settings-panel">
      <h2>对话与发音连接</h2>
      <p role="status">
        {!c.loaded
          ? '正在检查连接配置…'
          : c.error
            ? '暂时无法检查服务配置。'
            : `网站 AI：${c.conversation ? '已配置' : '尚未配置'} · 云端发音：${c.speechProvider || '尚未配置'}`}
      </p>
      <p className="muted">
        已配置表示服务端有连接设置，实际可用性以播放或对话请求为准。
      </p>
      <Choice
        label="网站内对话方式"
        value={settings.ai && c.conversation ? 'ai' : 'offline'}
        onChange={(v) => setSettings({ ...settings, ai: v === 'ai' })}
        items={
          c.conversation
            ? [
                ['offline', '离线情景模拟'],
                ['ai', '在线 AI 对话'],
              ]
            : [['offline', '离线情景模拟']]
        }
      />
      <p>
        在线模式由 AI
        理解回答并处理澄清；完成当前目标后，下一步使用课程中已校对的服务台词，避免遗漏办理事项或临时编造规则。
      </p>
      <p>
        发音可使用设备或浏览器提供的日语声音，也可连接独立云端日语语音。DeepSeek
        负责文字对话与复盘，发音服务单独配置。
      </p>
    </section>
  );
}
