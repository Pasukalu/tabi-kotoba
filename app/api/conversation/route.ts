import { difficulty } from '@/lib/difficulty';
import { NPC_PROMPT, REVIEW_PROMPT, scenarios, npcEntry } from '@/lib/dialogue';
import { validateAIOutput } from '@/lib/ai-contract';
import { conversationConfig } from '@/lib/service-config';
export async function POST(request: Request) {
  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > 40000) throw Error();
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: '对话请求格式不正确或内容过长。' },
      { status: 400 },
    );
  }
  if (
    !body ||
    !Array.isArray(body.messages) ||
    !body.messages.length ||
    body.messages.length > 80 ||
    body.messages.some(
      (m: any) =>
        !m ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string' ||
        m.content.length > 2000,
    )
  )
    return Response.json(
      { error: '对话内容无效，请重新开始。' },
      { status: 400 },
    );
  const scene = scenarios.find((s) => s.id === body.scenario?.id);
  const review = body.review === true,
    index = body.scenario?.currentStep ?? 0;
  if (
    !scene ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= scene.steps.length
  )
    return Response.json({ error: '场景步骤无效。' }, { status: 400 });
  const config = conversationConfig(process.env);
  if (!config)
    return Response.json(
      { error: 'AI 尚未连接，请填写服务端 DeepSeek 配置。' },
      { status: 503 },
    );
  const level = [
    'N5',
    'N4',
    'N3',
    'N2',
    'N1',
    '日本生活',
    'Native Challenge',
  ].includes(body.scenario?.level)
    ? body.scenario.level
    : 'N2';
  const situation = {
    ...scene,
    steps: scene.steps.map((s) => ({ ...s, npc: npcEntry(s.npc).japanese })),
    currentStep: index,
    level,
    trainingStyle: difficulty(level).instruction,
  };
  try {
    const r = await fetch(config.endpoint, {
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
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              (review ? REVIEW_PROMPT : NPC_PROMPT) +
              '\n场景：' +
              JSON.stringify(situation) +
              '\n反应速度只有整段打字耗时，不能当纯听力反应；听力理解无独立证据时返回null。所有JSON字段必须齐全。',
          },
          ...body.messages,
        ],
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
    });
    if (!r.ok) {
      const error =
        r.status === 401
          ? 'DeepSeek 密钥未通过验证。'
          : r.status === 402
            ? 'DeepSeek 账户余额不足。'
            : r.status === 429
              ? 'AI 请求较多，请稍后重试。'
              : 'AI 服务暂不可用。';
      return Response.json({ error }, { status: 502 });
    }
    const raw: any = await r.json();
    if (raw.choices?.[0]?.finish_reason !== 'stop')
      throw Error('Incomplete response');
    const output = validateAIOutput(
      JSON.parse(raw.choices[0].message.content),
      review,
    );
    return Response.json(output, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'AI 回应超时或格式不完整。你的回答仍保留，请重试。' },
      { status: 502 },
    );
  }
}
