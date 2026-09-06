import { parseTutorRequest, type TutorRequest } from '@/lib/tutor-request';
import { difficulty } from '@/lib/difficulty';
import { NPC_PROMPT, REVIEW_PROMPT, scenarios, npcEntry } from '@/lib/dialogue';
import { requestTutor, TutorError } from '@/lib/ai-client';
import { conversationConfig } from '@/lib/service-config';
import { outputFormat } from '@/lib/ai-format';
import {
  anchorTurn,
  isKnownReply,
  hasExplicitTransition,
} from '@/lib/conversation-flow';
import { applyReviewReferences } from '@/lib/review-references';
export async function POST(request: Request) {
  let body: TutorRequest;
  try {
    body = parseTutorRequest(await request.text());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '对话内容无效。' },
      { status: 400 },
    );
  }
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
    id: scene.id,
    role: scene.role,
    description: scene.description,
    knownFacts: scene.steps.map((step) => npcEntry(step.npc).japanese),
    currentStep: index,
    currentGoal: scene.steps[index].goal,
    currentQuestion: npcEntry(scene.steps[index].npc).japanese,
    nextQuestion: scene.steps[index + 1]
      ? npcEntry(scene.steps[index + 1].npc).japanese
      : scene.end,
    isLastStep: index === scene.steps.length - 1,
    level,
    trainingStyle: difficulty(level).instruction,
  };
  try {
    let output = await requestTutor(
      config,
      [
        {
          role: 'system',
          content:
            '场景事实边界：营业规则、费用、是否限住客、开放时间、设施位置只能依据knownFacts或description中明确给出的信息。没有写明「仅限住客」就绝不能编造这个限制。未知事项用自然日语表示需要确认，不自行补全规定。用户明确不办理住宿时，应回应其实际问题，不能强索预约姓名，也不能推进入住。用户问餐厅位置，而knownFacts写了二楼餐厅，可直接告知二楼，不添加使用资格限制。',
        },
        {
          role: 'system',
          content:
            (review ? REVIEW_PROMPT : NPC_PROMPT) +
            '\n' +
            outputFormat(review) +
            '\n场景：' +
            JSON.stringify(situation) +
            '\ncurrentStep从0开始。advance只判断用户最新回答是否完成currentGoal，不判断用户是否已经回答你即将说的下一句！完成当前目标时advance=true，你的日语回应转向nextQuestion对应的下一目标；未完成时advance=false，继续解决currentGoal。例：当前要求出示护照，用户说「はい、どうぞ。」，已完成当前目标，应advance=true并转向登记。当前要求填写表，用户说「記入しました」，应advance=true。不要跨过多个目标；已经提供的信息可以简短确认，不能当作没听到。done仅在最后一个目标完成时为true。反应速度只有整段打字耗时，不能当纯听力反应；听力理解无独立证据时返回null。所有JSON字段必须齐全。',
        },
        ...(review
          ? [
              {
                role: 'user' as const,
                content:
                  '请评价下面已经结束的对话记录，不要继续对话，也不要替用户补写任何发言。只评价role=user的原句。staff字段是服务人员针对顾客这句的回应，不是给顾客句子加自敬语。written、overpolite、underpolite字段请用中文说明是否存在该问题，不要用另一个日语例句替代判断。\n对话记录：' +
                  JSON.stringify(body.messages),
              },
            ]
          : body.messages),
      ],
      review,
      AbortSignal.any([request.signal, AbortSignal.timeout(65000)]),
      fetch,
      review
        ? body.messages
            .filter((m: { role: string; content: string }) => m.role === 'user')
            .map((m: { content: string }) => m.content)
        : undefined,
    );
    if (review && output.metrics) {
      output = applyReviewReferences(output, scene.category);
      output.metrics['听力理解'] = null;
      output.metrics['反应速度'] = null;
    }
    const next = scene.steps[index + 1]
      ? npcEntry(scene.steps[index + 1].npc)
      : {
          japanese: scene.end,
          chinese: '本次场景的办理流程已结束。',
          explanation:
            '[今回|こんかい]の[手続|てつづ]きが[終|お]わったことを[伝|つた]えています。',
        };
    const result =
      !review && 'advance' in output
        ? anchorTurn(
            output as Parameters<typeof anchorTurn>[0],
            isKnownReply(
              body.messages.at(-1)!.content,
              scene.steps[index].reply,
            ) ||
              hasExplicitTransition(
                body.messages.at(-1)!.content,
                String(output.japanese),
                next.japanese,
                scene.steps[index].accept,
              ),
            {
              japanese: next.japanese,
              chinese: next.chinese,
              explanation: next.explanation,
            },
            index === scene.steps.length - 1,
          )
        : output;
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof TutorError
            ? error.message
            : 'AI 服务暂不可用。你的回答仍保留。',
        code: error instanceof TutorError ? error.code : 'service',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
