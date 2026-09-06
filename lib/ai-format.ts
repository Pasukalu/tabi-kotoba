export const NPC_FORMAT = `严格返回一个 JSON 对象，键名只能使用以下英文名称：japanese, chinese, explanation, advance, done。
japanese 是字符串。每一处日语汉字必须写成 [汉字|平假名读音]，不能使用 HTML ruby、圆括号、另一个 kana 字段或省略注音。
例如：{"japanese":"ご[予約|よやく]のお[名前|なまえ]をお[願|ねが]いいたします。","chinese":"请告知预约姓名。","explanation":"[予約|よやく]した[人|ひと]の[名前|なまえ]を[確認|かくにん]しています。","advance":true,"done":false}
示例仅说明格式，不是本轮必须说的台词。chinese 只供隐藏的辅助显示。explanation 是日语字符串，也必须逐处标注汉字。advance 和 done 必须为 JSON 布尔值。`;

export const REVIEW_FORMAT = `返回 JSON，顶层键为 metrics, items, remember。
metrics 的键必须恰好包含：自然度、语法、词汇、敬语、反应速度、场景适切度、听力理解、表达效率。每个值为0至100数字或null；无证据使用null。
items 为数组，每项包含 original,natural,common,staff,why,written,overpolite,underpolite,stars。前8个字段均为字符串，stars为1至5整数。
natural/common/staff 是日语，所有汉字使用 [汉字|平假名]。例如 natural: "お[水|みず]、お[願|ねが]いします。"。original 保留用户原话；why/written/overpolite/underpolite 用中文。
remember 为最多5项的数组，每项是 {"japanese":"[予約|よやく]しているパスカルです。","chinese":"我是预约了的パスカル。","explanation":"[名前|なまえ]と[予約|よやく]があることを[伝|つた]えます。"} 这样的对象。
日语汉字不得用HTML、圆括号或额外字段注音；必须嵌入对应字符串。不要添加Markdown围栏。`;

export function outputFormat(review: boolean) {
  return review ? REVIEW_FORMAT : NPC_FORMAT;
}
