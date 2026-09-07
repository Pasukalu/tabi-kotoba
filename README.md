# 旅ことば · TABI KOTOBA

面向日语专业学生，以**实战形式**练习日本旅行与日常生活交流的 PWA。
酒店、餐厅、便利店、车站、新干线、预约、付款和突发情况都以真实服务流程组织，重点训练「听懂对方下一步要什么」「自然回应」「根据场合调整礼貌程度」。

> 这是一个可运行的第一版产品。课程数据、对话流程和现实规则分开维护；尚未把所有日本地区、店铺和业务差异都编写成完整题库。

## 在线体验

- **Live Demo**: <https://tabi-nihongo-lab.pasukalu0.chatgpt.site>
- **GitHub**: <https://github.com/Pasukalu/tabi-kotoba>
- **CI**: [Verify application](https://github.com/Pasukalu/tabi-kotoba/actions/workflows/verify.yml)

## 已实现的训练链路

| 模块 | 现在可以做什么 |
| --- | --- |
| 学习 | 场景课程、结构化词典、Ruby 振假名、原文 / 假名 / 罗马字 / 中文 / 日语解释切换 |
| 听力 | 店员高速表达、车站广播、菜单和标识阅读；支持字幕隐藏、逐句播放和速度调整 |
| 模拟 | 酒店入住、餐厅点单、便利店连续提问、交通换乘、新干线购票、预约、付款和异常处理 |
| 口语 | 独立输入、自然表达对照、顾客 / 店员角色线、离线练习进度保存；不包含语音识别 |
| 复盘 | 复习模式、SRS 到期队列、错误 / 慢答 / 使用提示的优先级、每日生活挑战 |
| 视觉阅读 | 酒店设施、用品台、食券机、出口牌、IC 充值机、储物柜、自动售货机和预约页面 |
| 音频 | 浏览器 ja-JP SpeechSynthesis；可替换的云端 TTS 适配层，支持单句、连续和 A–B 循环 |

## 内容和数据

课程内容不硬编码在页面中，按领域放在 data/：

~~~text
data/
├─ hotel.json              # 酒店流程与服务表达
├─ restaurant.json         # 餐厅、居酒屋、拉面店等
├─ train.json              # 地铁、JR、电车和广播相关内容
├─ shinkansen.json         # 新干线任务与机器界面
├─ convenience-store.json  # 便利店连续提问
├─ booking.json            # 预约、变更、取消和迟到
├─ payment.json            # 现金、信用卡、交通 IC、二维码
├─ vocabulary.json         # 词条主数据
├─ vocabulary-examples.json # 独立例句、读音和发音信息
└─ culture.json            # 日本生活备忘与现实规则来源
~~~

语言知识和现实规则保持分离。涉及铁路、酒店政策、票务等会变化的信息，应在数据中记录 source、sourceUrl、lastVerified 和适用范围；课程模拟里的时间、费用或受理条件不代表当前真实交易结果。

## 本地运行

要求 Node.js 22.13+。

~~~bash
npm install
npm run dev
~~~

常用命令：

~~~bash
npm test                 # 运行学习逻辑、内容、音频和持久化测试
npm run build            # 生产构建
npm run start            # 使用构建产物启动 Wrangler
npm run check:secrets    # 扫描工作区和 Git 历史中的凭证
npm run lint             # oxlint（仓库仍有少量旧代码规则提示）
~~~

## AI 和发音配置

复制 .env.example 为 .env.local，所有密钥只放在服务端变量中。**不要使用 NEXT_PUBLIC_*，也不要把密钥写进 README、截图、日志或提交记录。**

| 能力 | 变量 | 说明 |
| --- | --- | --- |
| DeepSeek | DEEPSEEK_API_KEY、DEEPSEEK_MODEL | 原生 DeepSeek 对话接口，默认模型为 deepseek-v4-flash |
| 兼容对话接口 | TUTOR_API_URL、TUTOR_API_TOKEN、TUTOR_MODEL | 未配置原生 DeepSeek key 时使用 |
| 通用云端 TTS | TTS_API_URL、TTS_API_TOKEN | 适配返回 audio/* 的服务，可接 Azure、Google、ElevenLabs 或 OpenAI TTS |
| Azure TTS | AZURE_SPEECH_KEY、AZURE_SPEECH_REGION、AZURE_SPEECH_VOICE | 可选的 ja-JP Neural Voice，默认 ja-JP-NanamiNeural |

AI 请求只接收受限场景和对话数据，服务端会校验返回结构、评分范围和读音字段。模型不可用时，课程流程仍可离线练习；语音识别没有加入产品，录音仅供本机回听，不上传、不转写。

## 目录结构

~~~text
app/                    # 页面路由与全局样式
components/learning/    # 首页、课程、对话、复习和每日挑战视图
components/ui/          # 基于 shadcn / Base UI 的界面组件
data/                   # 可扩展的课程、词典、菜单、规则和任务数据
lib/                    # 内容解析、对话流程、SRS、音频、AI 契约和持久化
public/                 # PWA manifest、Service Worker、图标
tests/                  # 自动化内容、流程、音频、备份和接口契约测试
scripts/                # 凭证扫描等维护脚本
~~~

## 验证和安全

提交前建议按下面的顺序执行：

~~~bash
npm run check:secrets
npm test
node node_modules/typescript/bin/tsc --noEmit
npm run build
~~~

GitHub Actions 会在 push 和 pull request 上重复凭证扫描、测试、类型检查和生产构建。安全相关说明见 [SECURITY.md](SECURITY.md)。

本项目使用浏览器本地存储保存学习进度，提供备份导出与校验后恢复；账号同步、真实设备音质验收以及所有地区的现实规则覆盖仍属于后续工作。

## 贡献内容时的原则

1. 优先记录真实服务表达，再补充教科书式解释。
2. 现实规则注明适用范围，例如「ホテルによる」「店舗による」「地域による」「鉄道会社による」。
3. 新增词条同时提供读音、例句、场景、礼貌程度、自然表达说明和必要的来源。
4. 不把“语法正确”直接标成“日本人最常说”，也不把一次模型输出当作语言学验收。
