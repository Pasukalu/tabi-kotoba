import { serviceCapabilities, speechRequest } from '@/lib/service-config';
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '音频请求格式不正确。' }, { status: 400 });
  }
  const input = body as { text?: unknown; rate?: unknown } | null;
  if (
    !input ||
    typeof input.text !== 'string' ||
    !input.text.trim() ||
    input.text.length > 2000 ||
    ![0.7, 0.85, 1, 1.15].includes(Number(input.rate))
  )
    return Response.json(
      { error: '请选择有效的文本和播放速度。' },
      { status: 400 },
    );
  if (!serviceCapabilities(process.env).speech)
    return Response.json({ error: '云端语音尚未连接。' }, { status: 503 });
  try {
    const upstream = speechRequest(process.env, input.text, Number(input.rate));
    const r = await fetch(upstream.url, {
      method: 'POST',
      headers: upstream.headers as Record<string, string>,
      body: upstream.body,
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok || !r.headers.get('Content-Type')?.startsWith('audio/'))
      throw Error('upstream');
    return new Response(r.body, {
      headers: {
        'Content-Type': r.headers.get('Content-Type')!,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { error: '云端发音暂不可用，请稍后重试。' },
      { status: 502 },
    );
  }
}
