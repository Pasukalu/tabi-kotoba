/** Server-only configuration. Never return credentials to the client. */
export type ServiceEnvironment = Record<string, string | undefined>;
export function conversationConfig(env: ServiceEnvironment) {
  if (env.DEEPSEEK_API_KEY)
    return {
      endpoint: 'https://api.deepseek.com/chat/completions',
      token: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      deepseek: true,
    };
  if (env.TUTOR_API_URL && env.TUTOR_API_TOKEN && env.TUTOR_MODEL)
    return {
      endpoint: env.TUTOR_API_URL,
      token: env.TUTOR_API_TOKEN,
      model: env.TUTOR_MODEL,
      deepseek: false,
    };
  return null;
}
export function serviceCapabilities(env: ServiceEnvironment) {
  return {
    conversation: Boolean(conversationConfig(env)),
    speech: Boolean(
      (env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION) ||
      (env.TTS_API_URL && env.TTS_API_TOKEN),
    ),
    speechProvider:
      env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION
        ? 'Azure Japanese Neural'
        : env.TTS_API_URL && env.TTS_API_TOKEN
          ? '云端日语语音'
          : null,
  };
}
export function escapeXml(text: string) {
  return text.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}
export function speechRequest(
  env: ServiceEnvironment,
  text: string,
  rate: number,
): { url: string; headers: Record<string, string>; body: string } {
  if (env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION) {
    if (!/^[a-z0-9]+$/.test(env.AZURE_SPEECH_REGION))
      throw Error('Invalid region');
    const voice = env.AZURE_SPEECH_VOICE || 'ja-JP-NanamiNeural';
    if (!/^ja-JP-[A-Za-z0-9:-]+$/.test(voice))
      throw Error('Japanese voice required');
    return {
      url:
        'https://' +
        env.AZURE_SPEECH_REGION +
        '.tts.speech.microsoft.com/cognitiveservices/v1',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'TabiKotoba',
      },
      body:
        '<speak version="1.0" xml:lang="ja-JP"><voice name="' +
        voice +
        '"><prosody rate="' +
        Math.round((rate - 1) * 100) +
        '%">' +
        escapeXml(text) +
        '</prosody></voice></speak>',
    };
  }
  if (!env.TTS_API_URL || !env.TTS_API_TOKEN) throw Error('Not configured');
  return {
    url: env.TTS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + env.TTS_API_TOKEN,
    },
    body: JSON.stringify({ text, rate, language: 'ja-JP' }),
  };
}
