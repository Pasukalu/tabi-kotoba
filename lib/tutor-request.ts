import type { ChatMessage } from './ai-client';
export type TutorRequest = {
  review: boolean;
  scenario: { id: string; currentStep: number; level: string };
  messages: (ChatMessage & { role: 'user' | 'assistant' })[];
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export function parseTutorRequest(raw: string): TutorRequest {
  if (raw.length > 40000) throw Error('对话内容过长，请开始新的练习。');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error('对话请求格式不正确。');
  }
  if (
    !object(value) ||
    !object(value.scenario) ||
    typeof value.scenario.id !== 'string' ||
    !Array.isArray(value.messages) ||
    value.messages.length === 0 ||
    value.messages.length > 80
  )
    throw Error('对话内容无效，请重新开始。');
  const messages = value.messages.map(
    (message): TutorRequest['messages'][number] => {
      if (
        !object(message) ||
        (message.role !== 'user' && message.role !== 'assistant') ||
        typeof message.content !== 'string' ||
        message.content.length > 2000
      )
        throw Error('对话内容无效，请重新开始。');
      return { role: message.role, content: message.content };
    },
  );
  if (
    !messages.some((message) => message.role === 'user') ||
    (value.review !== true && messages.at(-1)?.role !== 'user')
  )
    throw Error('请先提交你的日语回答。');
  const index = value.scenario.currentStep ?? 0;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0)
    throw Error('场景步骤无效。');
  return {
    review: value.review === true,
    scenario: {
      id: value.scenario.id,
      currentStep: index,
      level:
        typeof value.scenario.level === 'string' ? value.scenario.level : 'N2',
    },
    messages,
  };
}
