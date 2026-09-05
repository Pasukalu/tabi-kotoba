# 旅ことば / TABI KOTOBA

日本旅行・生活日语训练第一版。面向日语专业学生。

## 本版可用
- 多页面学习主页、场景课程、对话、听力、菜单、词典、日本生活、SRS、个人设置。
- 212 条结构化学习内容，含114个词条、9道仿真菜单；9个完整离线对话场景。
- 每条内容七种显示，HTML Ruby、词语点读、四档速度、单句/连续/A-B逐句循环。
- 日语设备语音、MediaRecorder录音回听、浏览器识别适配器。录音不自动上传。
- 打字回答的离线流程：酒店入住、退房、行李寄存、订名异常、餐厅售罄、交通余额、新干线购票、便利店追问、预约迟到。
- 学习进度/收藏/掌握/SRS存储于LocalStorage，可导出恢复。PWA缓存已访问内容与资源。
- 现实规则独立于语言语料，包含官方来源、核验日期与适用范围。

## 启动
Node 22.13+。`npm install`、`npm run dev`、`npm run build`。使用 Sites Vinext（Next.js兼容）、React、TypeScript与Tailwind。

## 内容架构
`data/*.json`为可扩充课程。`lib/content.ts`统一读取与检索。日语注音格式为`[予約|よやく]`，由安全React渲染转成`ruby/rt`，不接受原始HTML。
词条字段包含 id, japanese, kana, romaji, chinese, jlpt, category, scene, formality, frequency, nativeFrequency, example, audio, notes, pitfalls, explanation。
频度为教学优先级，不是语料库统计；JLPT标为生活表示未做级别归属。
`data/curriculum.json`包含完整扩展地图。本版没有把每一个目录项伪装成已完成课程。
`data/culture.json`区分经官方核验的rule与需要现场确认的memo。
`data/scenarios.json`为离线步骤、必要信息、示例与角色设定。示例不是唯一正确答案。

## 在线能力
`.env.example`为服务端配置范式。不把密钥写入浏览器或NEXT_PUBLIC变量。
- `TUTOR_API_URL`、`TUTOR_API_TOKEN`、`TUTOR_MODEL`：兼容chat-completions的JSON端点。
- `TTS_API_URL`、`TTS_API_TOKEN`：接受 `{text,rate,language}` 并返回 `audio/*` 的适配端点，可归一化Azure、Google、ElevenLabs或其他语音提供者。
- AI NPC与复盘Prompt在`lib/dialogue.ts`；语音Provider和RecognitionAdapter可替换。
- 当前没有配置在线密钥。在线按钮明确报未连接，离线流程可用。自然度/听力等无证据维度不生成虚假分数。

## 已知范围与后续
- 9个离线场景按关键信息推进，不能穷尽所有同义说法或替代真正AI。当前AI返回格式及对话上下文适配已实现，需配置与真实服务联调。
- 真人语音、Whisper识别、账号同步尚未接入；浏览器语音音质与识别支持依设备。
- A-B为句子索引区间，不是波形时间剪辑。
- N5至N1是偏好标签；Native改变显示、提示和语速。尚无按所有级别分别编写的独立题库。
- 每日挑战目前是串联8个已实现任务，未实现无限随机剧情。
- 票务练习不下真实订单，车次、时间、价格均是虚构练习设定。
- PWA可缓存访问过的资源，首次必须联网，在线AI/TTS不离线运行。
- WebMCP增加复习工具已做能力检测，当前环境未提供可验证的WebMCP上下文；未宣称完成实际注册测试。

## 验证
TypeScript检查、生产构建、10个主要页面响应检查通过；核心数据检查覆盖重复ID、汉字注音、搜索、罗马字与每条模拟示例推进。未进行浏览器交互或设备实测，也未验证未配置的AI/TTS。

## 来源
现实规则核验日期2026-09-05：厚生劳动省旅馆护照说明、Tokyo Metro出站指南、SmartEX乘车凭证指南及特大行李预约说明，完整链接在culture.json。
照片：Sei / Unsplash，https://unsplash.com/photos/empty-streets-w-Z49ZYO_gg 。
