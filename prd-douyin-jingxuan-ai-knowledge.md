# PRD: 抖音精选 AI 笔记与知识库增强

## 1. Introduction

本项目面向黑客松 Demo，目标是在网页端复刻抖音精选的核心 UI 与内容消费体验，并在不破坏原有产品结构的前提下，加入 AI 信息总结与知识库收藏能力。

产品不重新定义一个独立平台，而是把抖音精选已有的“双列瀑布流发现 + 中视频沉浸消费”流程升级为“发现内容、快速判断价值、沉淀到知识库”的闭环。用户可以在推荐流中双击内容卡片快速获得 AI 笔记、时间戳跳转和信息图总结，也可以在视频播放页把内容加入自定义知识库分区，像 B 站收藏夹一样管理长期有价值的内容。

## 2. Goals

- 复刻抖音精选移动端网页 UI，包括首页推荐流、负反馈弹窗、个人页和视频消费页的关键视觉与交互。
- 保留抖音精选原有首页顶部导航、底部导航、双列瀑布流、视频播放页核心消费控件，不改变用户熟悉路径。
- 在推荐流卡片上加入低打扰的 AI 总结入口，使用户不用进入完整视频也能判断内容是否值得看。
- 在 AI 总结中提供结构化摘要、可跳转时间戳和信息图总结，解决中视频“封面标题无法判断价值”的问题。
- 在视频消费页右上角加入“添加到知识库”功能，支持创建分区、选择分区、保存视频和查看已保存内容。
- 做出适合黑客松演示的完整用户路径，而不是只做静态 UI。

## 3. Target Users

- 对知识类、财经类、技能类、认知类中视频感兴趣的抖音精选用户。
- 会收藏视频但缺少整理习惯的用户。
- 想在短时间内判断一个中视频是否值得完整观看的用户。
- 需要把公开视频内容沉淀为个人知识资产的学习型用户。

## 4. Core User Journey

### Journey 1: 推荐流中快速总结

1. 用户进入首页推荐栏。
2. 用户浏览双列瀑布流内容。
3. 用户对某个内容卡片感兴趣，但不确定是否值得看完整视频。
4. 用户在该内容卡片的标题或封面区域双击。
5. 系统弹出 AI 笔记面板。
6. 用户查看内容摘要、关键时间戳和信息图。
7. 用户点击某个时间戳后进入视频消费页，并定位到对应片段。

### Journey 2: 视频页加入知识库

1. 用户进入视频消费页。
2. 用户观看视频，并看到右上角的“添加到知识库”入口。
3. 用户点击入口。
4. 系统弹出知识库保存面板。
5. 用户可以选择已有分区，也可以新建分区。
6. 用户确认保存后，系统提示保存成功。
7. 用户进入“我”页面，在 AI 笔记或知识库区域查看已保存内容。

### Journey 3: 个人页管理知识沉淀

1. 用户进入底部导航的“我”页面。
2. 页面保留抖音精选原有个人页结构，包括收藏、点赞、AI 笔记、离线缓存等入口。
3. 用户点击 AI 笔记或知识库入口。
4. 用户查看按分区整理的视频内容、AI 摘要和信息图。
5. 用户可以继续打开原视频，或回看指定时间戳。

## 5. User Stories

### US-001: 复刻抖音精选首页推荐流

**Description:** As a user, I want to see a familiar Douyin Jingxuan-style home feed so that the new AI features feel embedded in the original product.

**Acceptance Criteria:**

- [ ] 首页顶部包含菜单入口、热门、推荐、关注、搜索入口。
- [ ] 推荐 Tab 为默认选中状态，并有高亮下划线。
- [ ] 内容区使用双列瀑布流卡片布局。
- [ ] 每张卡片包含封面、点赞数、视频时长、标题、作者信息和更多按钮。
- [ ] 底部导航包含首页、放映厅、发布、消息、我。
- [ ] 页面整体视觉接近用户提供的抖音精选截图。
- [ ] Verify in browser using dev-browser skill.

### US-002: 保留推荐流负反馈弹窗

**Description:** As a user, I want to access the original dislike and feedback controls so that the AI additions do not remove existing feed controls.

**Acceptance Criteria:**

- [ ] 点击卡片更多按钮后，页面出现半透明遮罩。
- [ ] 弹窗从卡片附近或页面中部出现，样式接近抖音精选“不喜欢 / 我要反馈”面板。
- [ ] 弹窗包含“该内容”“该作者”“疑似广告”“相似过多”“已经看过”“色情低俗”“添加稍后再看”等选项。
- [ ] 点击关闭按钮或遮罩后弹窗关闭。
- [ ] Verify in browser using dev-browser skill.

### US-003: 推荐流双击触发 AI 总结

**Description:** As a user, I want to double-click a feed card to summarize it so that I can judge whether a medium-length video is worth watching.

**Acceptance Criteria:**

- [ ] 用户双击推荐流卡片的封面或标题区域时，打开 AI 总结面板。
- [ ] 单击卡片仍然进入视频消费页，不与双击逻辑冲突。
- [ ] 双击反馈应明确，例如卡片短暂高亮、出现加载状态或面板打开动画。
- [ ] AI 总结入口不改变原有顶部导航、底部导航和瀑布流布局。
- [ ] Verify in browser using dev-browser skill.

### US-004: AI 总结面板展示结构化笔记

**Description:** As a user, I want an AI note panel with key points so that I can understand the video's value without watching the full video.

**Acceptance Criteria:**

- [ ] 面板展示视频标题、作者、原视频时长。
- [ ] 面板展示 3-5 条核心摘要。
- [ ] 面板展示“适合人群”或“你会获得什么”信息。
- [ ] 面板展示“建议观看片段”列表。
- [ ] 面板有关闭入口。
- [ ] 文案表达为真实内容总结，不使用占位符如 Lorem ipsum。
- [ ] Verify in browser using dev-browser skill.

### US-005: AI 总结面板支持时间戳跳转

**Description:** As a user, I want summary timestamps to be clickable so that I can jump directly to the most relevant part of the video.

**Acceptance Criteria:**

- [ ] 每条关键片段包含时间戳，例如 `02:15`、`06:40`、`10:28`。
- [ ] 每个时间戳旁边展示该片段讲了什么。
- [ ] 点击时间戳后进入视频消费页。
- [ ] 视频消费页展示当前跳转时间点，或在进度条上体现定位结果。
- [ ] 如果 Demo 无真实视频播放能力，也必须通过 UI 状态明确表示已跳转到对应时间点。
- [ ] Verify in browser using dev-browser skill.

### US-006: AI 总结面板生成信息图总结

**Description:** As a user, I want an infographic summary so that I can visually understand the structure of the video.

**Acceptance Criteria:**

- [ ] AI 总结面板下方展示一张信息图或信息图式模块。
- [ ] 信息图至少包含 3 个以上结构化节点，例如“核心观点”“关键证据”“行动建议”。
- [ ] 信息图内容与当前视频主题相关。
- [ ] 信息图在移动端宽度内清晰可读，不与其他面板内容重叠。
- [ ] Verify in browser using dev-browser skill.

### US-007: 复刻视频消费页

**Description:** As a user, I want the video page to look and feel like Douyin Jingxuan so that the knowledge feature appears native.

**Acceptance Criteria:**

- [ ] 视频页包含返回、听、AI、搜索等顶部功能入口。
- [ ] 页面中部展示横屏视频区域。
- [ ] 右侧展示点赞、评论、点赞/赞同、收藏、稍后再看等纵向操作。
- [ ] 底部展示作者、关注按钮、标题、合集入口、进度条、分享和全屏入口。
- [ ] 页面主色调为黑色沉浸式观看体验。
- [ ] Verify in browser using dev-browser skill.

### US-008: 视频页添加到知识库

**Description:** As a user, I want to save a useful video into a knowledge base so that I can organize it for later review.

**Acceptance Criteria:**

- [ ] 视频消费页右上角新增“添加到知识库”入口。
- [ ] 入口应融入原有顶部工具区，不遮挡原有返回、听、AI、搜索等功能。
- [ ] 点击后打开知识库保存面板。
- [ ] 保存面板展示当前视频标题和作者。
- [ ] 用户可以确认保存或取消。
- [ ] 保存成功后有明确反馈，例如按钮状态变化、Toast 或面板提示。
- [ ] Verify in browser using dev-browser skill.

### US-009: 知识库支持创建分区

**Description:** As a user, I want to create sections like Bilibili favorites folders so that saved videos can be grouped by topic.

**Acceptance Criteria:**

- [ ] 知识库保存面板展示已有分区列表。
- [ ] 默认至少包含“默认收藏”或“稍后学习”分区。
- [ ] 用户可以点击“新建分区”。
- [ ] 新建分区时可以输入分区名称。
- [ ] 创建后，新分区立即出现在列表中并可被选中。
- [ ] 空名称不可创建，并展示轻量错误提示。
- [ ] Verify in browser using dev-browser skill.

### US-010: 保存内容到指定分区

**Description:** As a user, I want to select a target section before saving so that my knowledge base stays organized.

**Acceptance Criteria:**

- [ ] 用户可以选择一个已有分区作为保存目标。
- [ ] 当前选中分区有明确视觉状态。
- [ ] 点击确认后，视频保存到所选分区。
- [ ] 同一个视频重复保存时，系统应提示已存在或保持幂等，不产生重复卡片。
- [ ] 保存后可在个人页知识库区域看到该内容。
- [ ] Verify in browser using dev-browser skill.

### US-011: 个人页展示 AI 笔记和知识库入口

**Description:** As a user, I want the profile page to show my AI notes and saved knowledge sections so that I can return to useful content later.

**Acceptance Criteria:**

- [ ] 个人页保留抖音精选原有布局，包括顶部昵称、收藏、点赞等内容区块。
- [ ] 页面中展示“AI笔记”入口。
- [ ] 页面中展示“知识库”或分区列表入口。
- [ ] 点击入口后可以查看已保存视频。
- [ ] 已保存视频卡片展示标题、作者、封面、保存分区和 AI 摘要状态。
- [ ] Verify in browser using dev-browser skill.

### US-012: 知识库内容回看

**Description:** As a user, I want to reopen saved videos with their AI notes so that I can review knowledge efficiently.

**Acceptance Criteria:**

- [ ] 用户从知识库点击已保存视频后，可以进入视频消费页。
- [ ] 已保存视频详情中可以查看原 AI 摘要。
- [ ] 摘要里的时间戳仍可跳转到对应位置。
- [ ] 信息图总结可以再次查看。
- [ ] Verify in browser using dev-browser skill.

## 6. Functional Requirements

- FR-1: The system must render a mobile-first web page that visually resembles Douyin Jingxuan's home feed.
- FR-2: The system must keep the original top navigation labels: 热门、推荐、关注.
- FR-3: The system must keep the original bottom navigation labels: 首页、放映厅、发布、消息、我.
- FR-4: The system must render recommendation content in a two-column waterfall layout.
- FR-5: The system must provide feed card interactions for opening content, opening more actions, and triggering AI summary.
- FR-6: When the user opens more actions, the system must show a Douyin Jingxuan-style negative feedback sheet.
- FR-7: When the user double-clicks a feed card, the system must show an AI summary panel for that content.
- FR-8: The AI summary panel must include summary bullets, key timestamps, target audience or takeaway, and an infographic section.
- FR-9: The system must allow users to click a timestamp and navigate to the video page at the corresponding point.
- FR-10: The system must render a Douyin Jingxuan-style video consumption page with black immersive background and right-side action rail.
- FR-11: The video consumption page must include a top-right “添加到知识库” entry.
- FR-12: When the user clicks “添加到知识库”, the system must open a save-to-knowledge-base panel.
- FR-13: The knowledge save panel must allow choosing an existing section.
- FR-14: The knowledge save panel must allow creating a new section with a user-provided name.
- FR-15: The system must save the current video, selected section, AI summary, timestamps, and infographic reference together.
- FR-16: The system must prevent duplicate saved items in the same section.
- FR-17: The profile page must expose AI notes and knowledge base entries.
- FR-18: The user must be able to reopen a saved item from the knowledge base.
- FR-19: The reopened saved item must preserve AI summary, timestamps, and infographic summary.
- FR-20: The Demo must include realistic sample content matching knowledge, finance, health, skill, and cognition topics.

## 7. Design Requirements

- DR-1: The product must be mobile-first, optimized for a phone-sized viewport.
- DR-2: The homepage should be bright, white, and close to the provided Douyin Jingxuan homepage screenshots.
- DR-3: The video consumption page should be dark, immersive, and close to the provided Douyin Jingxuan video page screenshot.
- DR-4: The AI summary feature should feel like a native overlay, not like a separate chatbot page.
- DR-5: The knowledge save panel should be lightweight and close to the mental model of Bilibili favorites folders.
- DR-6: Do not replace original Douyin Jingxuan navigation or core controls with new AI-first navigation.
- DR-7: AI-generated content should be presented as concise, scannable notes, not long paragraphs.
- DR-8: The infographic should be readable on mobile without zooming.
- DR-9: Text must not overflow cards, buttons, bottom navigation, or overlay panels.
- DR-10: The UI should be polished enough for a hackathon judge to understand the value within 30 seconds.

## 8. Content Requirements

- CR-1: Demo content should use at least 6 feed cards.
- CR-2: At least 3 feed cards should have complete AI summary data.
- CR-3: At least 1 feed card should demonstrate timestamp jump.
- CR-4: At least 1 feed card should demonstrate infographic summary.
- CR-5: At least 1 video should be saved into a newly created knowledge section during the demo flow.
- CR-6: Sample topics should align with Douyin Jingxuan's knowledge-oriented content, such as Git/GitHub, milk tea economics, addiction science, investment, health, and learning skills.

## 9. Non-Goals

- This PRD does not require real Douyin account login.
- This PRD does not require connecting to Douyin's real API.
- This PRD does not require real video upload, publishing, recommendation model, or social graph.
- This PRD does not require implementing a production-grade AI pipeline.
- This PRD does not require choosing a specific frontend framework, backend framework, database, or deployment platform.
- This PRD does not require real-time video transcription if pre-generated Demo data can express the experience.
- This PRD does not require payment, creator monetization, or ecommerce conversion.
- This PRD does not redesign the entire Douyin Jingxuan product; it only adds AI note and knowledge base capabilities to existing flows.

## 10. Success Metrics

- A first-time viewer can understand the product value within 30 seconds of the demo.
- Users can trigger AI summary from the recommendation feed in 1 action.
- Users can jump from AI summary to a specific video timestamp in 1 click.
- Users can save a video to a knowledge section in 3 steps or fewer: click save, choose/create section, confirm.
- Users can find the saved content again from the profile or knowledge base page.
- The AI summary and knowledge base features do not visually break the Douyin Jingxuan-like experience.

## 11. Demo Script

1. Open the homepage and show the Douyin Jingxuan-like recommendation feed.
2. Click the more button on a card to show that original negative feedback behavior is preserved.
3. Double-click the “奶茶经济学” card to open AI summary.
4. Show summary bullets, timestamp list, and infographic summary.
5. Click a timestamp such as `06:20 资本如何影响消费选择`.
6. Enter the video consumption page and show the jumped timestamp state.
7. Click “添加到知识库” in the top-right area.
8. Create a new section named “消费经济学”.
9. Save the video into that section.
10. Go to “我” page and open AI 笔记 or 知识库.
11. Show the saved video, its section, AI summary, and timestamp review ability.

## 12. Open Questions

- OQ-1: “添加到知识库”入口最终应显示为文字、图标，还是图标加文字？
- OQ-2: AI 总结触发是否只支持双击，还是也需要在卡片上提供一个可见入口，方便评委发现？
- OQ-3: 知识库入口应独立命名为“知识库”，还是并入截图中已有的“AI笔记”入口？
- OQ-4: 信息图总结应作为静态图、结构化卡片，还是可展开的可视化模块？
- OQ-5: Demo 是否需要支持桌面宽度适配，还是只保证移动端展示？
