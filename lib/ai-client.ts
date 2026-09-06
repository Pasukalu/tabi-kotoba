import { validateAIOutput } from './ai-contract';
import { outputFormat } from './ai-format';
import { normalizeTutorReadings } from './known-readings';
import type { conversationConfig } from './service-config';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
type Config = NonNullable<ReturnType<typeof conversationConfig>>;
export class TutorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function parseModelJSON(content: string) {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
}

/** Retry malformed model output once; never retry credential, balance or transport failures. */
export async function requestTutor(
  config: Config,
  messages: ChatMessage[],
  review: boolean,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  originals?: readonly string[],
) {
  let lastContent = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetcher(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          max_tokens: review ? 7000 : 1600,
          ...(config.deepseek ? { thinking: { type: 'disabled' } } : {}),
          ...(review ? { response_format: { type: 'json_object' } } : {}),
          messages:
            attempt === 0
              ? messages
              : [
                  ...messages,
                  { role: 'assistant', content: lastContent.slice(0, 28000) },
                  {
                    role: 'user',
                    content:
                      '上一条输出未通过字段或振假名检查。仅修复返回格式，保持同一场景事实与用户原话，不推进额外业务步骤。每个日语汉字都必须标注读音。\n' +
                      outputFormat(review),
                  },
                ],
        }),
        signal,
      });
    } catch {
      throw new TutorError(
        signal.aborted ? 'timeout' : 'connection',
        'AI 连接中断或等待超时。你的回答仍保留，请重试。',
      );
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'AI 密钥未通过验证，请核对服务端配置。',
        402: 'AI 账户余额不足。',
        429: 'AI 请求较多，请稍后重试。',
      };
      throw new TutorError(
        'upstream-' + response.status,
        messages[response.status] || 'AI 服务暂不可用，请稍后重试。',
      );
    }
    try {
      const raw: unknown = await response.json();
      if (
        !object(raw) ||
        !Array.isArray(raw.choices) ||
        !object(raw.choices[0])
      )
        throw Error('Invalid envelope');
      const choice = raw.choices[0];
      if (!object(choice.message) || typeof choice.message.content !== 'string')
        throw Error('Missing content');
      lastContent = choice.message.content;
      if (lastContent.length > 60000 || choice.finish_reason !== 'stop')
        throw Error('Incomplete content');
      const output = validateAIOutput(
        normalizeTutorReadings(parseModelJSON(lastContent), review),
        review,
      );
      if (
        review &&
        originals &&
        output.items &&
        output.items.some(
          (item) =>
            typeof item.original !== 'string' ||
            !originals.includes(item.original),
        )
      )
        throw Error('Unmatched review original');
      return output;
    } catch (error) {
      if (signal.aborted)
        throw new TutorError(
          'timeout',
          'AI 等待超时。你的回答仍保留，请重试。',
        );
      if (attempt === 1) {
        const safeIssues = [
          'Invalid envelope',
          'Missing content',
          'Incomplete content',
          'Invalid review',
          'Invalid metric',
          'Invalid review item',
          'Invalid review text',
          'Japanese readings missing',
          'Invalid stars',
          'Invalid expressions',
          'Unmatched review original',
        ];
        const issue =
          error instanceof Error &&
          (safeIssues.includes(error.message) ||
            /^NPC_[A-Z]+$/.test(error.message))
            ? error.message.toLowerCase().replaceAll(' ', '-')
            : 'json';
        throw new TutorError(
          'validation-' + issue,
          'AI 返回内容仍未通过完整性检查。你的回答仍保留，请重试。',
        );
      }
    }
  }
  throw new TutorError('validation', 'AI 返回内容不完整。');
}
