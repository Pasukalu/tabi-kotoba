export const levels = {
  N5: {
    rate: 0.7,
    help: true,
    instruction:
      '使用真实、自然的简短服务表达。每轮只处理一个业务问题；避免一次连续问多件事，但不要翻译或提前给答案。',
  },
  N4: {
    rate: 0.85,
    help: true,
    instruction: '使用日常礼貌日语，每次一个主要问题；保持服务业固定说法。',
  },
  N3: {
    rate: 0.85,
    help: false,
    instruction: '正常礼貌表达，可加入理由和条件；必要时提出一次确认。',
  },
  N2: {
    rate: 1,
    help: false,
    instruction:
      '使用真实服务业敬语、自然省略和间接表达，允许连续确认两项信息。',
  },
  N1: {
    rate: 1,
    help: false,
    instruction: '使用自然长句、委婉拒绝和条件说明，检验对含蓄表达的理解。',
  },
  日本生活: {
    rate: 1,
    help: false,
    instruction:
      '像面对熟悉日本生活的顾客一样交流。合理使用省略与默认流程，允许出现需要用户主动确认的情况。',
  },
  'Native Challenge': {
    rate: 1.15,
    help: false,
    instruction:
      '用日本人日常听到的自然服务表达，每轮可连续询问两三项相关信息。不给学习提示、翻译或示范答案；只有用户请求时才换说法。',
  },
} as const;
export function difficulty(level: string) {
  return levels[level as keyof typeof levels] || levels.N2;
}
