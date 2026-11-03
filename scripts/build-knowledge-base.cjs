#!/usr/bin/env node

/**
 * 知识库构建工具
 *
 * 从缓存的视频解析数据中构建结构化的知识库
 * 支持：读取缓存 → 解析内容 → 生成 feed-data.js → 导出 Markdown
 *
 * 使用方法：
 *   node scripts/build-knowledge-base.cjs --help
 *   node scripts/build-knowledge-base.cjs --scan
 *   node scripts/build-knowledge-base.cjs --build
 *   node scripts/build-knowledge-base.cjs --export-all
 *   node scripts/build-knowledge-base.cjs --video darwin
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'mp3');
const OUTPUT_DIR = path.join(__dirname, '..', 'src');
const FEED_DATA_PATH = path.join(OUTPUT_DIR, 'feed-data.js');

// 视频元数据配置
const VIDEO_CONFIG = {
  darwin: {
    category: '科普',
    title: '达尔文的死敌：偷窃、封杀、造假与跨越半世纪的复仇',
    author: '科学史档案',
    likes: '5.2万',
    bg: 'from-stone-950 via-amber-900 to-orange-700',
    accent: 'bg-amber-500',
    avatar: '科',
    tall: true,
    tags: ['科学史', '达尔文', '进化论', '学术'],
  },
  codex: {
    category: 'AI',
    title: '40分钟学会Codex！零基础终级教程',
    author: '秋芝2046',
    likes: '8.7万',
    bg: 'from-gray-950 via-slate-900 to-indigo-800',
    accent: 'bg-indigo-400',
    avatar: 'AI',
    tall: true,
    tags: ['Codex', 'AI工具', '编程', '教程'],
  },
  mars: {
    category: '旅行',
    title: '我找到了地球上最像火星的地方',
    author: '交换世界计划',
    likes: '12.3万',
    bg: 'from-red-950 via-orange-900 to-amber-700',
    accent: 'bg-red-500',
    avatar: '探',
    tags: ['旅行', '探索', '火星', '自然奇观'],
  },
  academic: {
    category: '教育',
    title: '我国论文造假多≠学术道德差，原因在这！',
    author: '学术观察',
    likes: '7.8万',
    bg: 'from-blue-950 via-indigo-900 to-purple-800',
    accent: 'bg-blue-500',
    avatar: '学',
    tags: ['学术', '论文', '科研', '教育'],
  },
  money: {
    category: '成长',
    title: '成长最快的方式是研究赚钱，而不是死磕学习',
    author: '心理学洞察',
    likes: '15.6万',
    bg: 'from-yellow-950 via-amber-900 to-orange-700',
    accent: 'bg-yellow-500',
    avatar: '成',
    tall: true,
    tags: ['心理学', '成长', '赚钱', '思维'],
  },
  detective: {
    category: '故事',
    title: '25岁天才车手赛前遇害，43天跨国追凶，凶手竟换了一张脸',
    author: '真实事件档案',
    likes: '18.9万',
    bg: 'from-gray-950 via-slate-800 to-red-900',
    accent: 'bg-red-600',
    avatar: '悬',
    tags: ['悬疑', '真实事件', '推理', '故事'],
  },
  'ai-career': {
    category: '职场',
    title: 'AI大跃进下，大厂青年如何破局，小镇做题家的选择与困境',
    author: '职场观察',
    likes: '22.4万',
    bg: 'from-cyan-950 via-blue-900 to-indigo-800',
    accent: 'bg-cyan-500',
    avatar: '职',
    tags: ['职场', 'AI', '年轻人', '成长'],
  },
  'claude-code': {
    category: 'AI',
    title: 'Claude Code 终极教程：零基础入门',
    author: 'AI新星计划',
    likes: '6.8万',
    bg: 'from-violet-950 via-purple-900 to-fuchsia-800',
    accent: 'bg-violet-500',
    avatar: 'AI',
    tags: ['Claude', 'AI工具', '编程', '教程'],
  },
  'uk-vlog': {
    category: '生活',
    title: '英国Vlog：大一的最后三天！回国倒计时',
    author: '伦敦留学日记',
    likes: '4.5万',
    bg: 'from-sky-950 via-blue-900 to-cyan-700',
    accent: 'bg-sky-500',
    avatar: '留',
    tags: ['留学', 'Vlog', '英国', '生活'],
  },
  'life-motivation': {
    category: '社会',
    title: '混的人，并不是天生就是混的人',
    author: '零距离看懂财经',
    likes: '9.2万',
    bg: 'from-orange-950 via-red-900 to-rose-800',
    accent: 'bg-orange-500',
    avatar: '励',
    tags: ['励志', '社会', '年轻人', '成长'],
  },
};

// ========== 文件读取工具 ==========

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`读取 JSON 失败: ${filePath}`, err.message);
    return null;
  }
}

function readMarkdownFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`读取 Markdown 失败: ${filePath}`, err.message);
    return null;
  }
}

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`读取文本失败: ${filePath}`, err.message);
    return null;
  }
}

// ========== 内容解析 ==========

/**
 * 从解析稿中提取时间戳
 */
function extractTimestamps(analysisContent) {
  if (!analysisContent) return [];

  const timestamps = [];
  const lines = analysisContent.split('\n');

  for (const line of lines) {
    // 匹配 ## 【标题】格式的章节
    const chapterMatch = line.match(/^##\s*【(.+?)】/);
    if (chapterMatch) {
      const label = chapterMatch[1];
      // 在该行后面找时间戳
      const timeMatch = line.match(/\[(\d{2}:\d{2}(?::\d{2})?)\]/);
      if (timeMatch) {
        timestamps.push({ time: timeMatch[1], label });
      }
    }
  }

  // 如果没有从章节标题中找到时间戳，尝试从正文中提取
  if (timestamps.length === 0) {
    const timeRegex = /\[(\d{2}:\d{2}(?::\d{2})?)\]/g;
    let match;
    const seen = new Set();
    while ((match = timeRegex.exec(analysisContent)) !== null) {
      const time = match[1];
      if (!seen.has(time)) {
        seen.add(time);
        // 获取时间戳后面的文本作为标签
        const afterTime = analysisContent.substring(match.index + match[0].length, match.index + match[0].length + 50);
        const labelMatch = afterTime.match(/[，。：]?\s*(.+)/);
        const label = labelMatch ? labelMatch[1].substring(0, 30) : '内容片段';
        timestamps.push({ time, label });
      }
    }
  }

  return timestamps;
}

/**
 * 从知识库文件中提取核心观点
 */
function extractKeyPoints(knowledgeContent) {
  if (!knowledgeContent) return { summary: [], infographic: [] };

  const lines = knowledgeContent.split('\n');
  const summary = [];
  const infographic = [];

  let currentSection = '';
  let currentInfographic = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // 识别章节
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '');
      if (currentInfographic) {
        infographic.push(currentInfographic);
        currentInfographic = null;
      }
      continue;
    }

    // 提取核心观点
    if (currentSection === '核心观点' && trimmed.startsWith('- ')) {
      summary.push(trimmed.replace('- ', ''));
    }

    // 提取一句话总结
    if (currentSection === '一句话总结' && trimmed.length > 0) {
      summary.unshift(trimmed);
    }

    // 提取方法/框架
    if ((currentSection === '方法 / 框架' || currentSection === '方法/框架') && trimmed.match(/^\d+\./)) {
      const text = trimmed.replace(/^\d+\.\s*/, '');
      infographic.push({ title: `步骤${infographic.length + 1}`, text });
    }

    // 提取可执行动作
    if (currentSection === '可执行动作' && trimmed.startsWith('- ')) {
      const text = trimmed.replace('- ', '');
      if (infographic.length < 3) {
        infographic.push({ title: `行动${infographic.length + 1}`, text });
      }
    }
  }

  if (currentInfographic) {
    infographic.push(currentInfographic);
  }

  return {
    summary: summary.slice(0, 4),
    infographic: infographic.slice(0, 3),
  };
}

/**
 * 从解析稿中提取时间段
 */
function extractTimeRanges(analysisContent, totalTime) {
  if (!analysisContent) return [];

  const timestamps = extractTimestamps(analysisContent);
  if (timestamps.length === 0) return [];

  // 转换为时间段格式
  return timestamps.map((stamp, index) => {
    const nextTime = index < timestamps.length - 1 ? timestamps[index + 1].time : totalTime;
    return {
      time: stamp.time,
      label: stamp.label,
      range: `${stamp.time} - ${nextTime}`,
    };
  });
}

/**
 * 获取视频时长
 */
function getVideoDuration(videoId) {
  const infoPath = path.join(CACHE_DIR, `${videoId} - 转写信息.json`);
  const info = readJsonFile(infoPath);
  if (info && info.duration) {
    return formatDuration(info.duration);
  }
  return '00:00';
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ========== 知识库构建 ==========

/**
 * 扫描可用的视频缓存
 */
function scanAvailableVideos() {
  const videos = [];

  if (!fs.existsSync(CACHE_DIR)) {
    console.error('缓存目录不存在:', CACHE_DIR);
    return videos;
  }

  const files = fs.readdirSync(CACHE_DIR);

  // 找出所有有解析稿的视频
  const analysisFiles = files.filter(f => f.endsWith(' - 解析稿.md'));

  for (const file of analysisFiles) {
    const videoId = file.replace(' - 解析稿.md', '');
    const config = VIDEO_CONFIG[videoId];

    if (!config) {
      console.warn(`警告: 视频 "${videoId}" 没有配置元数据`);
      continue;
    }

    const hasAnalysis = files.includes(`${videoId} - 解析稿.md`);
    const hasKnowledge = files.includes(`${videoId} - 知识库.md`);
    const hasTranscript = files.includes(`${videoId} - 逐字稿.md`);
    const hasRawTranscript = files.includes(`${videoId} - 原始逐字稿.txt`);
    const hasInfo = files.includes(`${videoId} - 转写信息.json`);
    const hasAudio = files.includes(`${videoId}.mp3`);

    videos.push({
      id: videoId,
      config,
      files: {
        analysis: hasAnalysis,
        knowledge: hasKnowledge,
        transcript: hasTranscript,
        rawTranscript: hasRawTranscript,
        info: hasInfo,
        audio: hasAudio,
      },
      status: hasKnowledge && hasAnalysis ? 'complete' : 'partial',
    });
  }

  return videos;
}

/**
 * 构建单个视频的知识库数据
 */
function buildVideoData(videoId) {
  const config = VIDEO_CONFIG[videoId];
  if (!config) {
    console.error(`未找到视频配置: ${videoId}`);
    return null;
  }

  console.log(`构建视频数据: ${videoId}`);

  // 读取缓存文件
  const analysisPath = path.join(CACHE_DIR, `${videoId} - 解析稿.md`);
  const knowledgePath = path.join(CACHE_DIR, `${videoId} - 知识库.md`);

  const analysisContent = readMarkdownFile(analysisPath);
  const knowledgeContent = readMarkdownFile(knowledgePath);

  if (!analysisContent) {
    console.error(`无法读取解析稿: ${videoId}`);
    return null;
  }

  // 提取数据
  const timestamps = extractTimestamps(analysisContent);
  const { summary, infographic } = extractKeyPoints(knowledgeContent);
  const duration = getVideoDuration(videoId);
  const timeRanges = extractTimeRanges(analysisContent, duration);

  // 生成封面标题
  const coverTitle = config.title.replace(/：/g, '\n').substring(0, 20);

  // 构建 feed item
  const feedItem = {
    id: videoId,
    category: config.category,
    title: config.title,
    author: config.author,
    likes: config.likes,
    time: duration,
    videoUrl: `/videos/${videoId}.mp4`,
    coverTitle,
    bg: config.bg,
    accent: config.accent,
    avatar: config.avatar,
    tags: config.tags,
    ai: {
      summary: summary.length > 0 ? summary : [`${config.title}的核心内容解析`],
      audience: `适合对${config.tags.join('、')}感兴趣的观众`,
      takeaway: summary[0] || config.title,
      timestamps: timestamps.length > 0 ? timestamps : [
        { time: '00:00', label: '开始' },
      ],
      infographic: infographic.length > 0 ? infographic : [
        { title: '核心观点', text: summary[0] || config.title },
      ],
    },
  };

  // 添加可选字段
  if (config.tall) {
    feedItem.tall = true;
  }

  return feedItem;
}

/**
 * 构建完整的 feed-data.js
 */
function buildFeedData() {
  console.log('开始构建 feed-data.js...\n');

  const videos = scanAvailableVideos();
  console.log(`找到 ${videos.length} 个视频\n`);
  if (videos.length === 0) {
    throw new Error('没有可构建的视频缓存，保留现有 src/feed-data.js。');
  }

  const feedItems = [];

  for (const video of videos) {
    const data = buildVideoData(video.id);
    if (data) {
      feedItems.push(data);
      console.log(`  ✓ ${video.id} - ${data.title}`);
    } else {
      throw new Error(`${video.id} 构建失败，保留现有 src/feed-data.js。`);
    }
  }

  // 生成 feed-data.js 内容
  const content = generateFeedDataJs(feedItems);

  // 写入文件
  fs.writeFileSync(FEED_DATA_PATH, content, 'utf-8');
  console.log(`\n已生成 feed-data.js (${feedItems.length} 个视频)`);

  return feedItems;
}

/**
 * 生成 feed-data.js 文件内容
 */
function generateFeedDataJs(feedItems) {
  const sections = [
    { id: 'default', name: '默认收藏', desc: '统一回看高价值内容' },
    { id: 'later', name: '稍后学习', desc: '先存起来，空闲再看' },
  ];
  return `// Generated legacy dataset; the application uses src/data/feed.js.
export const LOCAL_DEMO_VIDEOS = ${JSON.stringify(feedItems.map(item => item.videoUrl), null, 2)};

export const DEFAULT_SECTIONS = ${JSON.stringify(sections, null, 2)};

export const FEED_ITEMS = ${JSON.stringify(feedItems, null, 2)};
`;
}

// ========== 导出功能 ==========

/**
 * 导出单个视频的完整知识库为 Markdown
 */
function exportVideoMarkdown(videoId) {
  const config = VIDEO_CONFIG[videoId];
  if (!config) {
    console.error(`未找到视频配置: ${videoId}`);
    return null;
  }

  const knowledgePath = path.join(CACHE_DIR, `${videoId} - 知识库.md`);
  const analysisPath = path.join(CACHE_DIR, `${videoId} - 解析稿.md`);
  const transcriptPath = path.join(CACHE_DIR, `${videoId} - 逐字稿.md`);

  const knowledge = readMarkdownFile(knowledgePath);
  const analysis = readMarkdownFile(analysisPath);
  const transcript = readMarkdownFile(transcriptPath);

  let md = `# ${config.title}\n\n`;
  md += `**作者**: ${config.author}  \n`;
  md += `**分类**: ${config.category}  \n`;
  md += `**标签**: ${config.tags.join(', ')}  \n`;
  md += `**时长**: ${getVideoDuration(videoId)}  \n\n`;
  md += `---\n\n`;

  if (knowledge) {
    md += `## 知识库\n\n`;
    md += knowledge.replace(/^# .+\n+/, '');
    md += `\n\n`;
  }

  if (analysis) {
    md += `## 解析稿\n\n`;
    md += analysis.replace(/^# .+\n+/, '');
    md += `\n\n`;
  }

  if (transcript) {
    md += `## 完整逐字稿\n\n`;
    md += transcript.replace(/^# .+\n+/, '');
    md += `\n\n`;
  }

  return md;
}

/**
 * 导出所有视频的知识库
 */
function exportAllMarkdown() {
  console.log('导出所有视频知识库...\n');

  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const videos = scanAvailableVideos();

  for (const video of videos) {
    const md = exportVideoMarkdown(video.id);
    if (md) {
      const outputPath = path.join(exportDir, `${video.id}.md`);
      fs.writeFileSync(outputPath, md, 'utf-8');
      console.log(`  ✓ ${video.id}.md`);
    }
  }

  // 生成索引文件
  let indexMd = `# 抖音精选 AI 知识库\n\n`;
  indexMd += `> 构建时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  indexMd += `## 视频列表\n\n`;

  for (const video of videos) {
    const config = video.config;
    indexMd += `### ${config.title}\n\n`;
    indexMd += `- **ID**: ${video.id}\n`;
    indexMd += `- **作者**: ${config.author}\n`;
    indexMd += `- **分类**: ${config.category}\n`;
    indexMd += `- **标签**: ${config.tags.join(', ')}\n`;
    indexMd += `- **文件**: [${video.id}.md](./${video.id}.md)\n\n`;
  }

  const indexPath = path.join(exportDir, 'README.md');
  fs.writeFileSync(indexPath, indexMd, 'utf-8');
  console.log(`\n  ✓ README.md (索引文件)`);
  console.log(`\n导出完成！文件位于: ${exportDir}`);
}

// ========== 命令行接口 ==========

function showHelp() {
  console.log(`
抖音精选 AI 知识库构建工具
==========================

使用方法:
  node scripts/build-knowledge-base.cjs [命令]

命令:
  --help          显示帮助信息
  --scan          扫描可用的视频缓存
  --build         构建旧版 src/feed-data.js（不修改主应用 src/data/feed.js）
  --export-all    导出所有视频知识库为 Markdown
  --video <id>    导出指定视频的知识库
  --info          显示缓存统计信息

示例:
  node scripts/build-knowledge-base.cjs --scan
  node scripts/build-knowledge-base.cjs --build
  node scripts/build-knowledge-base.cjs --video darwin
  node scripts/build-knowledge-base.cjs --export-all

视频 ID:
  darwin, codex, mars, academic, money, detective,
  ai-career, claude-code, uk-vlog, life-motivation
`);
}

function showInfo() {
  console.log('\n缓存统计信息\n' + '='.repeat(40));

  const videos = scanAvailableVideos();
  console.log(`\n视频数量: ${videos.length}`);

  let completeCount = 0;
  let partialCount = 0;

  for (const video of videos) {
    const status = video.status === 'complete' ? '✓' : '△';
    console.log(`  ${status} ${video.id} - ${video.config.title}`);

    if (video.status === 'complete') {
      completeCount++;
    } else {
      partialCount++;
    }
  }

  console.log(`\n完成度: ${completeCount} 完成, ${partialCount} 部分`);

  // 检查文件大小
  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const stat = fs.statSync(path.join(CACHE_DIR, file));
      totalSize += stat.size;
    }

    console.log(`缓存大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }
}

// ========== 主程序 ==========

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  showHelp();
} else if (args.includes('--scan')) {
  const videos = scanAvailableVideos();
  console.log('\n可用视频缓存:\n');
  for (const video of videos) {
    const status = video.status === 'complete' ? '✓' : '△';
    const files = Object.entries(video.files)
      .filter(([_, exists]) => exists)
      .map(([name]) => name)
      .join(', ');
    console.log(`${status} ${video.id}`);
    console.log(`  配置: ${video.config.title}`);
    console.log(`  文件: ${files}\n`);
  }
} else if (args.includes('--build')) {
  buildFeedData();
} else if (args.includes('--export-all')) {
  exportAllMarkdown();
} else if (args.includes('--video')) {
  const videoIndex = args.indexOf('--video');
  const videoId = args[videoIndex + 1];
  if (!videoId) {
    console.error('请指定视频 ID');
    process.exit(1);
  }
  const md = exportVideoMarkdown(videoId);
  if (md) {
    console.log(md);
  }
} else if (args.includes('--info')) {
  showInfo();
} else {
  console.error('未知命令。使用 --help 查看帮助。');
  process.exit(1);
}
