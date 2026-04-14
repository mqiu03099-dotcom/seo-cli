const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { READY_BLOG_TEMPLATE, BLOG_INPUT_KEYS } = require("./blog-template");
const { READY_TITLE_TEMPLATE, TITLE_INPUT_KEYS } = require("./title-template");

const SUPPORTED_LANGUAGE_INPUTS = ["English", "日本語", "简体中文"];
const SEO_TITLE_RANGE = { min: 50, max: 60 };
const SEO_DESCRIPTION_RANGE = { min: 150, max: 160 };

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function createOutputFilename(now = new Date(), prefix = "blog") {
  const year = now.getFullYear();
  const month = padNumber(now.getMonth() + 1);
  const day = padNumber(now.getDate());
  const hours = padNumber(now.getHours());
  const minutes = padNumber(now.getMinutes());
  const seconds = padNumber(now.getSeconds());

  return `${prefix}-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.txt`;
}

function formatScalar(value) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}

function shouldRenderRawHtml(pathParts, value) {
  if (typeof value !== "string") {
    return false;
  }

  const pathKey = pathParts.join(".");
  return pathKey === "output.html" || pathKey === "output_zh.html";
}

function serializeTaskValue(value, indent = "", keyName = "", pathParts = [], isLast = false) {
  if (shouldRenderRawHtml(pathParts, value)) {
    return `${indent}"${keyName}":\n${indent}\`\n${value}\n${indent}\`${isLast ? "" : ","}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}"${keyName}": []${isLast ? "" : ","}`;
    }

    const lines = [`${indent}"${keyName}": [`];

    value.forEach((item, index) => {
      const itemIsLast = index === value.length - 1;
      if (item && typeof item === "object") {
        lines.push(`${indent}  {`);
        lines.push(serializeTaskObject(item, `${indent}    `, pathParts));
        lines.push(`${indent}  }${itemIsLast ? "" : ","}`);
      } else {
        lines.push(`${indent}  ${formatScalar(item)}${itemIsLast ? "" : ","}`);
      }
    });

    lines.push(`${indent}]${isLast ? "" : ","}`);
    return lines.join("\n");
  }

  if (value && typeof value === "object") {
    const header = keyName ? `${indent}"${keyName}": {` : `${indent}{`;
    const body = serializeTaskObject(value, `${indent}  `, pathParts);
    const footer = `${indent}}${isLast ? "" : ","}`;
    return `${header}\n${body}\n${footer}`;
  }

  return keyName
    ? `${indent}"${keyName}": ${formatScalar(value)}${isLast ? "" : ","}`
    : `${indent}${formatScalar(value)}`;
}

function serializeTaskObject(value, indent = "", pathParts = [], isLast = true) {
  const entries = Object.entries(value);
  return entries
    .map(([key, entryValue], index) =>
      serializeTaskValue(
        entryValue,
        indent,
        key,
        [...pathParts, key],
        index === entries.length - 1
      )
    )
    .join("\n");
}

function writeTaskToTxt(task, options = {}) {
  const cwd = options.cwd || process.cwd();
  const now = options.now || new Date();
  const prefix = options.prefix || "blog";
  const subdir = options.subdir || "";
  const fileName = createOutputFilename(now, prefix);
  const outputDir = subdir ? path.join(cwd, subdir) : cwd;
  const filePath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, `{\n${serializeTaskObject(task, "  ")}\n}\n`, "utf8");
  return filePath;
}

function createFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

function parseJsonArgument(raw, commandName) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON payload for \`${commandName}\`.`);
  }
}

function validateBlogInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Blog payload must be a JSON object.");
  }

  const missingKeys = BLOG_INPUT_KEYS.filter((key) => !(key in payload));
  if (missingKeys.length > 0) {
    throw new Error(`Missing required blog fields: ${missingKeys.join(", ")}.`);
  }

  for (const key of BLOG_INPUT_KEYS) {
    if (key === "images") {
      if (
        !Array.isArray(payload.images) ||
        payload.images.some(
          (image) =>
            !image ||
            typeof image !== "object" ||
            Array.isArray(image) ||
            typeof image.url !== "string" ||
            typeof image.description !== "string"
        )
      ) {
        throw new Error(
          "Blog field `images` must be an array of objects with string `url` and `description`."
        );
      }

      continue;
    }

    if (typeof payload[key] !== "string") {
      throw new Error(`Blog field \`${key}\` must be a string.`);
    }
  }

  if (!SUPPORTED_LANGUAGE_INPUTS.includes(payload.language)) {
    throw new Error(
      `Blog field \`language\` must be one of: ${SUPPORTED_LANGUAGE_INPUTS.join(", ")}.`
    );
  }
}

function validateTitleInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Title payload must be a JSON object.");
  }

  const missingKeys = TITLE_INPUT_KEYS.filter((key) => !(key in payload));
  if (missingKeys.length > 0) {
    throw new Error(`Missing required title fields: ${missingKeys.join(", ")}.`);
  }

  if (typeof payload.url !== "string") {
    throw new Error("Title field `url` must be a string.");
  }

  if (typeof payload.language !== "string") {
    throw new Error("Title field `language` must be a string.");
  }

  if (!SUPPORTED_LANGUAGE_INPUTS.includes(payload.language)) {
    throw new Error(
      `Title field \`language\` must be one of: ${SUPPORTED_LANGUAGE_INPUTS.join(", ")}.`
    );
  }

  try {
    new URL(payload.url);
  } catch (error) {
    throw new Error("Title field `url` must be a valid URL.");
  }
}

function createSlug(value) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .join("-");
}

function getExpansionPhrases(language, fieldType) {
  const normalizedLanguage = normalizeLanguage(language);

  if (fieldType === "title") {
    if (normalizedLanguage === "en") {
      return [" | Expert Guide", " | In-Depth Review", " | Buying Guide"];
    }

    if (normalizedLanguage === "ja") {
      return [" | 徹底比較ガイド", " | 選び方ガイド", " | 詳細レビュー"];
    }

    return [
      "，核心差异拆解",
      "，购机人群建议",
      "，真实体验判断",
      "，价格价值比分析",
      "，选购避坑参考"
    ];
  }

  if (normalizedLanguage === "en") {
    return [
      " It covers core use cases, real user concerns, and practical buying factors.",
      " The content is designed to improve relevance, clarity, and search click-through.",
      " Readers can quickly understand strengths, trade-offs, and the better fit."
    ];
  }

  if (normalizedLanguage === "ja") {
    return [
      " 主要な違い、実際の使い勝手、選び方の判断軸まで分かりやすく整理します。",
      " 検索ユーザーが知りたい比較ポイントを具体的に押さえた内容です。",
      " 読了後に自分に合う選択肢を判断しやすい構成に整えます。"
    ];
  }

  return [
    " 文章会进一步拆解核心差异、真实体验和选购判断标准，帮助用户更快做出更适合自己的选择。",
    " 同时覆盖搜索用户最关心的性能、体验、价格和使用场景，增强点击后的阅读完成度。",
    " 整体内容会兼顾搜索可读性、信息密度和实际转化价值。"
  ];
}

function trimToMaxLength(value, max, language) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= max) {
    return normalized;
  }

  const normalizedLanguage = normalizeLanguage(language);

  if (normalizedLanguage === "zh-Hans" || normalizedLanguage === "ja") {
    return normalized.slice(0, max).trim().replace(/[|,-\s，。]+$/g, "");
  }

  const sliced = normalized.slice(0, max).trim();
  const cutIndex = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf("-"), sliced.lastIndexOf("|"));

  if (cutIndex >= Math.floor(max * 0.7)) {
    return sliced.slice(0, cutIndex).trim().replace(/[|,-\s]+$/g, "");
  }

  return sliced.replace(/[|,-\s]+$/g, "");
}

function fitSeoLength(value, range, language, fieldType) {
  let result = normalizeWhitespace(value);

  if (!result) {
    return result;
  }

  const phrases = getExpansionPhrases(language, fieldType);
  let index = 0;

  while (result.length < range.min && phrases.length > 0 && index < phrases.length) {
    result = `${result}${phrases[index]}`.trim();
    index += 1;
  }

  if (result.length > range.max) {
    result = trimToMaxLength(result, range.max, language);
  }

  return result;
}

function finalizeSeoTitle(value, language) {
  return fitSeoLength(value, SEO_TITLE_RANGE, language, "title");
}

function finalizeSeoDescription(value, language) {
  return fitSeoLength(value, SEO_DESCRIPTION_RANGE, language, "description");
}

function getBlogLanguageConfig(language) {
  if (language === "English") {
    return {
      sectionHeadings: [
        "Why SEO matters more for sustainable site growth",
        "Build stronger search entry points with category and topic pages",
        "Turn game detail pages into ranking and conversion assets",
        "Use content marketing to support both traffic and monetization",
        "Create an execution rhythm you can repeat"
      ]
    };
  }

  if (language === "日本語") {
    return {
      sectionHeadings: [
        "なぜSEOが重要なのか",
        "カテゴリーページと特集ページで検索導線を強くする",
        "ゲーム詳細ページを集客と収益の資産に変える",
        "流入だけで終わらないコンテンツ戦略を設計する",
        "継続運用できる実行フローを作る"
      ]
    };
  }

  return {
    sectionHeadings: [
      `为什么 SEO 对${payloadToLabel("topic")}增长更关键`,
      "先搭好分类页与专题页的搜索入口",
      "把详情页做成兼顾收录与转化的核心资产",
      "让内容营销同时服务流量与变现",
      "建立可持续复用的执行节奏"
    ]
  };
}

function payloadToLabel(value) {
  return value.replace(/如何通过.*$/, "").replace(/怎么做.*$/, "").trim();
}

function inferBlogTopicKind(payload) {
  const combined = [
    payload.topic,
    payload.description,
    payload.primary_keyword,
    payload.remark
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("iphone") ||
    combined.includes("huawei") ||
    combined.includes("苹果") ||
    combined.includes("华为")
  ) {
    return "phone-compare";
  }

  if (
    combined.includes("game site") ||
    combined.includes("游戏站") ||
    combined.includes("google adsense") ||
    combined.includes("google ad manager")
  ) {
    return "game-seo";
  }

  return "generic-seo";
}

function createBlogSlugSeed(payload) {
  const kind = inferBlogTopicKind(payload);

  if (kind === "phone-compare") {
    return "iphone-vs-huawei";
  }

  if (kind === "game-seo") {
    return "game-site-seo";
  }

  const combined = [
    payload.topic,
    payload.primary_keyword,
    payload.description
  ]
    .filter(Boolean)
    .join(" ");

  const replaced = combined
    .replace(/苹果手机/gu, "iphone ")
    .replace(/苹果/gu, "iphone ")
    .replace(/华为手机/gu, "huawei ")
    .replace(/华为/gu, "huawei ")
    .replace(/对比/gu, "vs ")
    .replace(/谁更厉害/gu, "which is better ")
    .replace(/怎么选/gu, "buying guide ")
    .replace(/游戏站/gu, "game site ")
    .replace(/服装商城/gu, "fashion store ")
    .replace(/SEO/gu, "seo ");

  const slug = createSlug(replaced);

  if (slug) {
    return slug;
  }

  return "seo-guide";
}

function buildBlogTitle(payload) {
  const kind = inferBlogTopicKind(payload);

  if (kind === "phone-compare") {
    if (payload.language === "English") {
      return "iPhone vs Huawei: Which Phone Is Better for You?";
    }

    if (payload.language === "日本語") {
      return "iPhoneとHuaweiはどちらが優秀？選び方を徹底比較";
    }

    return "苹果和华为怎么选？系统、拍照与价格全对比｜购机前先看核心差异";
  }

  if (payload.language === "English") {
    return `${payload.primary_keyword}: A Practical Guide for ${payload.target_audience} to ${payload.goal}`;
  }

  if (payload.language === "日本語") {
    return `${payload.primary_keyword}で${payload.goal}ための実践ガイド`;
  }

  const normalizedGoal = payload.goal.replace(/^\s*提升/, "").trim();
  return `${payload.primary_keyword}怎么做？${payload.target_audience}提升${normalizedGoal}的实战指南`;
}

function buildBlogSections(payload) {
  const kind = inferBlogTopicKind(payload);
  const config = getBlogLanguageConfig(payload.language);

  if (kind === "phone-compare") {
    if (payload.language === "English") {
      return [
        {
          heading: "Software experience and daily smoothness",
          body: "For most buyers, the first real difference between iPhone and Huawei appears in daily software experience. iPhone usually wins on long-term consistency, ecosystem polish, and app behavior, while Huawei often feels stronger in local adaptation, hardware-software integration, and practical customization for Chinese-speaking users."
        },
        {
          heading: "Camera quality, imaging style, and video use",
          body: "The better camera depends on what you care about. iPhone is often preferred for stable video, natural social-media output, and predictable color, while Huawei is usually stronger when buyers value zoom range, image detail, night scenes, and a more aggressive flagship-camera feel."
        },
        {
          heading: "Battery, charging, and business convenience",
          body: "Huawei often stands out in charging speed, battery practicality, and business-friendly utility features. iPhone still performs well through power efficiency and accessory support, but buyers who care about fast top-ups, dual-use scenarios, and office convenience may lean toward Huawei."
        },
        {
          heading: "Ecosystem fit, value, and who should choose which",
          body: "The final decision is less about which brand is universally stronger and more about which ecosystem fits your habits. iPhone makes sense for users who want Apple integration, stable cross-device continuity, and familiar premium software. Huawei is the stronger fit for users who prioritize camera hardware, local ecosystem features, productivity flexibility, and stronger value at a similar price tier."
        }
      ];
    }

    if (payload.language === "日本語") {
      return [
        {
          heading: "日常操作とシステム体験の違い",
          body: "iPhoneとHuaweiの差が最も分かりやすいのは、日常操作のなめらかさとシステム体験です。iPhoneは長期的な安定性やエコシステムの完成度が強みで、Huaweiは実用機能の多さやローカル環境への最適化に魅力があります。"
        },
        {
          heading: "カメラ性能と撮影スタイルの向き不向き",
          body: "カメラの優劣は使い方で変わります。iPhoneは動画の安定感や自然な発色に強く、Huaweiはズーム、夜景、ディテール表現などで高い存在感を出しやすい傾向があります。"
        },
        {
          heading: "バッテリー、充電、ビジネス利用のしやすさ",
          body: "Huaweiは急速充電や実用機能の豊富さで評価されやすく、ビジネス用途でも便利さを感じやすい構成です。iPhoneは周辺機器との連携や長期運用の安心感が魅力です。"
        },
        {
          heading: "どんな人がiPhone向きで、どんな人がHuawei向きか",
          body: "Apple製品との連携や安定した操作性を重視するならiPhoneが有力です。一方で、撮影性能、実用機能、価格に対する装備感を重視するならHuaweiがより適した選択肢になります。"
        }
      ];
    }

    return [
      {
        heading: "系统体验和日常流畅度谁更占优",
        body: "很多人第一反应会觉得苹果一定更流畅，但真实情况并没有那么绝对。iPhone 的优势在于系统一致性、长期稳定性和生态协同体验，而华为更强的地方在于本地化功能、交互细节和对商务、办公场景的适配能力。"
      },
      {
        heading: "拍照能力到底谁更强",
        body: "如果你更在意视频拍摄、社交平台直出和整体成像稳定性，苹果通常更有优势；但如果你看重长焦、夜景、解析力和旗舰影像的冲击感，华为往往更容易打动你。所谓谁更厉害，本质上取决于你用手机拍什么、发什么、保留什么。"
      },
      {
        heading: "续航、充电和办公体验怎么选",
        body: "华为在充电速度、续航实用性和部分办公场景体验上通常更有吸引力，适合经常出差、重度使用和强调效率的人群。苹果则依靠系统调度、配件生态和跨设备协同，给到另一种稳定而连贯的体验。"
      },
      {
        heading: "不同人群适合苹果还是华为",
        body: "如果你重视 Apple 生态、长期流畅度和统一的软件体验，苹果通常更适合你；如果你更关注拍照硬件、本地化功能、商务属性和同价位下的综合配置，华为往往更值得优先考虑。真正重要的不是站队，而是先确认自己的使用场景和预算。"
      }
    ];
  }

  if (payload.language === "English") {
    return [
      {
        heading: config.sectionHeadings[0],
        body: `${payload.target_audience} often face the same tradeoff: pushing for more sessions while trying to protect revenue per page. A steady SEO foundation helps reduce that tension by giving ${payload.primary_keyword} a durable search footprint across category pages, detail pages, and topical landing pages. Instead of relying only on paid acquisition, the site can keep winning recurring search demand over time.`
      },
      {
        heading: config.sectionHeadings[1],
        body: `Category and topic pages should map directly to the search intent behind ${payload.search_intent} queries. They need clear titles, H1s, supporting copy, and internal links that help search engines understand how the site is organized. For a game site, this means grouping titles by genre, mechanic, difficulty, or audience intent so users can discover related games without friction.`
      },
      {
        heading: config.sectionHeadings[2],
        body: `Individual game pages should do more than embed gameplay. They should explain what the game is, who it suits, why it is worth trying, and how it differs from similar options. That is where ${payload.description} becomes useful as page-level guidance. When detail pages answer user questions clearly, they support both rankings and better engagement signals.`
      },
      {
        heading: config.sectionHeadings[3],
        body: `A practical content strategy should connect discovery and monetization. Supporting articles, curated lists, and seasonal or topical guides can feed traffic into core landing pages while keeping users on the site longer. This aligns directly with the goal to ${payload.goal}, especially when ad placements are balanced against readability and repeat visits.`
      },
      {
        heading: config.sectionHeadings[4],
        body: `Start with keyword grouping and page mapping, then prioritize category pages, high-value game detail pages, and a small set of editorial content pieces. Review click-through rate, indexed pages, session depth, and revenue by template on a regular basis. With a ${payload.brand_tone} operating style, the site can improve discoverability without weakening usability.`
      }
    ];
  }

  if (payload.language === "日本語") {
    return [
      {
        heading: config.sectionHeadings[0],
        body: `${payload.target_audience}にとって、自然流入を伸ばしながら広告収益も維持することは大きな課題です。${payload.primary_keyword}を軸に検索導線を整えることで、カテゴリーページ、詳細ページ、特集ページが継続的な流入資産になります。広告流入だけに頼らず、検索から安定してユーザーを獲得できる状態を作ることが重要です。`
      },
      {
        heading: config.sectionHeadings[1],
        body: `カテゴリーページと特集ページは、${payload.search_intent}系の検索意図を受け止める役割を持ちます。ページタイトル、H1、導入文、内部リンクを整理し、ジャンル、操作感、難易度、利用シーンごとにゲームを見つけやすくすることで、検索エンジンにもユーザーにも分かりやすい構造になります。`
      },
      {
        heading: config.sectionHeadings[2],
        body: `ゲーム詳細ページは、単にプレイ枠を置くだけでは不十分です。どんなゲームか、どんなユーザーに向いているか、どこが面白いのか、似たゲームと何が違うのかを説明する必要があります。${payload.description}の要点を詳細ページに落とし込むことで、検索評価と回遊性の両方を高めやすくなります。`
      },
      {
        heading: config.sectionHeadings[3],
        body: `特集記事や比較記事、テーマ別まとめページは、流入を増やすだけでなく広告収益にも貢献します。滞在時間や回遊率が上がれば、AdSense や Google Ad Manager の収益効率も改善しやすくなります。つまり、コンテンツ施策は${payload.goal}という目的に直結します。`
      },
      {
        heading: config.sectionHeadings[4],
        body: `まずはキーワード整理とページ設計を行い、その後にカテゴリーページ、重要な詳細ページ、特集コンテンツの順で改善するのが現実的です。CTR、インデックス状況、滞在時間、テンプレート別収益を定期的に見直すことで、${payload.brand_tone}な運用でも成果につながる改善を継続できます。`
      }
    ];
  }

  const zhLabel = payload.primary_keyword.replace(/SEO/i, "").trim() || "站点";
  return [
    {
      heading: `为什么 SEO 对${zhLabel}增长更关键`,
      body: `对${payload.target_audience}来说，最大的难点往往不是做不做 SEO，而是如何让自然流量增长与商业目标同步发生。围绕${payload.primary_keyword}建立清晰的搜索入口，可以让分类页、详情页和专题页持续承接用户需求，减少对单一投流渠道的依赖。`
    },
    {
      heading: "先搭好分类页与专题页的搜索入口",
      body: `分类页和专题页更适合承接${payload.search_intent}类型的搜索需求。建议围绕用户检索意图梳理页面标题、H1、导语和内部链接，把页面结构做清楚，让搜索引擎更容易理解站点主题，也让用户更快找到想继续浏览的内容。`
    },
    {
      heading: "把详情页做成兼顾收录与转化的核心资产",
      body: `详情页不能只有基础参数和入口链接，还需要回答用户真正关心的问题，例如内容亮点、适合人群、体验特点和相关推荐。你可以把${payload.description}里的重点拆进详情页模块，让页面既有搜索覆盖能力，也具备更强的停留和转化价值。`
    },
    {
      heading: "让内容营销同时服务流量与变现",
      body: `内容营销不应该只追求收录数量，而要围绕核心页面做流量回流。专题文章、玩法攻略、榜单内容和主题聚合页，可以把阅读流量带回分类页和详情页，进一步支撑${payload.goal}这个目标，同时兼顾 AdSense 与 Google Ad Manager 的变现效率。`
    },
    {
      heading: "建立可持续复用的执行节奏",
      body: `建议先做关键词分组和页面映射，再逐步优化分类页、重点详情页和专题内容。随后结合点击率、收录量、停留时长和收益数据持续迭代。保持${payload.brand_tone}的表达风格，比堆砌关键词更有利于长期沉淀稳定的自然流量资产。`
    }
  ];
}

function buildBlogHtml(payload, title) {
  const sections = buildBlogSections(payload);
  const imageHtml = buildBlogImageHtml(payload.images);

  const sectionHtml = sections
    .map(
      (section) => `<h2>${section.heading}</h2><p>${section.body}</p>`
    )
    .join("");

  return [
    `<h1>${title}</h1>`,
    `<p>${payload.meta_description}</p>`,
    imageHtml,
    sectionHtml,
    `<p>${payload.cta}</p>`
  ].join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBlogImageHtml(images = []) {
  return images
    .map(
      (image) =>
        `<p><img src="${escapeHtml(image.url)}" alt="${escapeHtml(
          image.description
        )}" width="100%" style="width:max-content;max-height:500px;display:block;margin:auto"></p><p>${escapeHtml(
          image.description
        )}</p>`
    )
    .join("");
}

function deriveBlogSlugFromHtml(html, fallbackValue = "") {
  const heading = extractTagContent(html, "h1");
  const slugFromHeading = createSlug(heading);

  if (slugFromHeading.includes("-")) {
    return slugFromHeading;
  }

  return createSlug(fallbackValue || heading);
}

function buildFaq(payload) {
  const kind = inferBlogTopicKind(payload);

  if (kind === "phone-compare") {
    if (payload.language === "English") {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is iPhone always better than Huawei for everyday use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Not always. iPhone is usually stronger in ecosystem consistency and long-term software stability, while Huawei can be more attractive for users who value camera hardware, charging speed, and practical local features."
            }
          },
        {
          "@type": "Question",
          name: "Who should choose Huawei over iPhone?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Huawei is often the better fit for buyers who care more about imaging hardware, fast charging, business-friendly tools, and value at a similar premium price level."
          }
        },
        {
          "@type": "Question",
          name: "Should buyers focus more on ecosystem or hardware value?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you depend on cross-device continuity, app habits, and long software support, prioritize ecosystem. If you care more about camera hardware, charging, and local utility features, hardware value may matter more."
          }
        }
      ]
    };
    }

    if (payload.language === "日本語") {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "iPhoneは常にHuaweiより優れていますか？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "常にそうとは限りません。iPhoneは安定性とエコシステム連携に強く、Huaweiはカメラ性能や実用機能、充電面で魅力を感じやすい選択肢です。"
            }
          },
        {
          "@type": "Question",
          name: "どんな人にHuaweiが向いていますか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "撮影性能、急速充電、実用性の高い機能、価格に対する装備の強さを重視する人にはHuaweiが向いています。"
          }
        },
        {
          "@type": "Question",
          name: "エコシステムとハード性能はどちらを優先すべきですか？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "複数デバイス連携や長期的な操作の安定感を重視するならエコシステム、撮影性能や充電速度、実用機能を重視するならハード面を優先するのが現実的です。"
          }
        }
      ]
    };
    }

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "苹果手机一定比华为更厉害吗？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "不一定。苹果在系统稳定性和生态协同方面更强，华为则可能在影像、充电效率、本地化功能和商务实用性上更有吸引力。"
          }
        },
        {
          "@type": "Question",
          name: "什么样的人更适合选华为？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "如果你更看重拍照硬件、续航充电、本地化功能、商务办公体验，以及同价位下的综合配置表现，华为通常会更适合。"
          }
        },
        {
          "@type": "Question",
          name: "选苹果还是华为，应该先看生态还是硬件？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "如果你高度依赖多设备协同、系统一致性和长期使用体验，可以优先看生态；如果你更关注影像硬件、充电效率和实用功能，则应优先看硬件表现。"
          }
        }
      ]
    };
  }

  if (payload.language === "English") {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Which page should ${payload.primary_keyword} optimize first?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "Start with category pages and topic pages because they usually cover core search demand, connect internal links, and send stronger relevance signals to game detail pages."
          }
        },
        {
          "@type": "Question",
          name: `Why should ${payload.target_audience} improve detail page copy as part of SEO?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "Because better detail page copy helps search engines understand the page and gives users clearer reasons to stay, click deeper, and return, which supports both rankings and monetization."
          }
        },
        {
          "@type": "Question",
          name: `How can ${payload.primary_keyword} support both traffic and monetization?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "A stronger SEO structure brings in qualified search traffic, while clearer page intent, better internal links, and stronger on-page copy help turn that traffic into deeper sessions, ad views, and higher-value visits."
          }
        }
      ]
    };
  }

  if (payload.language === "日本語") {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${payload.primary_keyword}では最初に最適化すべきページはどれですか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "まずはカテゴリーページと特集ページです。これらは主要キーワードを受け止めやすく、内部リンクの起点にもなり、詳細ページの評価を支えやすいためです。"
          }
        },
        {
          "@type": "Question",
          name: `なぜ${payload.target_audience}は詳細ページの文章改善まで行うべきですか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "詳細ページの文章は検索エンジンに内容を伝えるだけでなく、ユーザーがそのまま遊ぶか、他ページへ回遊するかの判断材料にもなるため、流入と収益の両方に影響します。"
          }
        },
        {
          "@type": "Question",
          name: `${payload.primary_keyword}は流入と収益の両方にどう役立ちますか？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "SEOの設計が整うと検索流入の質が上がり、ページ意図や導線が明確になることで回遊、滞在、広告表示の価値も高まりやすくなります。"
          }
        }
      ]
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${payload.primary_keyword}最先应该优化哪个页面？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "优先优化分类页和专题页，因为这两类页面更适合承接核心关键词与阶段性搜索需求，同时也能为商品页带来更稳定的内部链接和转化入口。"
        }
      },
      {
        "@type": "Question",
        name: `为什么${payload.target_audience}做内容营销时还要关注商品页文案？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "因为商品页不仅影响搜索引擎对页面主题的理解，也直接影响用户是否愿意继续浏览和下单。把卖点、场景、材质和常见问题写清楚，通常比只堆参数更能提升转化。"
        }
      },
      {
        "@type": "Question",
        name: `${payload.primary_keyword}为什么要同时优化流量和转化？`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "因为只有把搜索曝光、点击进入和后续转化串起来，SEO 才能真正带来业务结果。只看流量不看承接，往往很难持续放大内容价值。"
        }
      }
    ]
  };
}

function buildBlogOutputZh(payload, output) {
  if (inferBlogTopicKind(payload) === "phone-compare") {
    const outputZh = {
      title: "苹果和华为到底怎么选？核心差异一文看懂",
      slug: output.slug,
      description: "这篇文章围绕苹果和华为两大手机品牌展开对比，重点帮助你从系统、影像、续航、生态和价格价值比判断哪一款更适合自己。",
      publish_time: output.publish_time,
      faq: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "苹果和华为谁更适合长期使用？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "如果你更看重长期系统稳定和 Apple 生态，苹果通常更适合；如果你更重视影像、实用功能和商务效率，华为往往更有优势。"
            }
          },
          {
            "@type": "Question",
            name: "拍照、续航和办公体验应该优先看什么？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "这取决于你的使用场景。拍视频和生态协同可以优先看苹果，拍照硬件、快充和商务功能则更值得重点看华为。"
            }
          },
          {
            "@type": "Question",
            name: "买手机时应该先看生态还是硬件配置？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "如果你更依赖平板、电脑、手表等多设备协同，就该优先看生态；如果你更在意拍照、充电、续航和本地化实用功能，就该优先看硬件与实际体验。"
            }
          }
        ]
      }
    };

    return {
      ...outputZh,
      html: buildBlogOutputZhHtml(payload, outputZh)
    };
  }

  if (payload.language === "简体中文") {
    return {
      title: output.title,
      slug: output.slug,
      description: output.description,
      publish_time: output.publish_time,
      html: output.html,
      faq: output.faq
    };
  }

  if (payload.language === "English") {
    const outputZh = {
      title: `${payload.primary_keyword}搜索曝光与转化提升实战指南`,
      slug: output.slug,
      description: `这篇文章围绕${payload.primary_keyword}展开，重点讨论如何提升搜索曝光、自然流量与转化表现。`,
      publish_time: output.publish_time,
      faq: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `${payload.primary_keyword}应该优先优化哪类页面？`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "建议优先优化分类页和主题页，因为它们更适合承接核心搜索需求，并为详情页提供更稳定的内部链接支持。"
            }
          },
          {
            "@type": "Question",
            name: `为什么${payload.target_audience}还要优化详情页文案？`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "因为详情页文案不仅影响搜索引擎对页面主题的理解，也会影响用户是否继续浏览、点击和回访，从而影响流量质量与变现效果。"
            }
          },
          {
            "@type": "Question",
            name: `${payload.primary_keyword}为什么要兼顾流量和变现？`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "因为只有同时优化搜索曝光、页面承接和用户停留，内容流量才更容易转化为稳定的广告收益或商业结果。"
            }
          }
        ]
      }
    };

    return {
      ...outputZh,
      html: buildBlogOutputZhHtml(payload, outputZh)
    };
  }

  const outputZh = {
    title: `${payload.primary_keyword}自然流量与转化提升实践指南`,
    slug: output.slug,
    description: `文章主要讨论${payload.goal}，并围绕 SEO 结构、页面优化和内容策略给出执行思路。`,
    publish_time: output.publish_time,
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${payload.primary_keyword}最先应该优化哪个页面？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "建议优先优化分类页和专题页，因为这两类页面更适合承接核心搜索词，并帮助详情页获得更清晰的站内支持。"
          }
        },
        {
          "@type": "Question",
          name: `为什么还要继续完善详情页内容？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "因为详情页内容会直接影响搜索理解、用户停留和后续转化，所以它既关系到收录效果，也关系到流量价值。"
          }
        },
        {
          "@type": "Question",
          name: `${payload.primary_keyword}为什么不能只看搜索流量？`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "因为只有把搜索曝光、页面体验和转化承接一起优化，内容价值才更稳定。单纯追求流量而忽略承接，通常很难持续放大结果。"
          }
        }
      ]
    }
  };

  return {
    ...outputZh,
    html: buildBlogOutputZhHtml(payload, outputZh)
  };
}

function buildBlogOutputZhHtml(payload, outputZh) {
  const imageHtml = buildBlogImageHtml(payload.images);
  const sections = [
    {
      heading: "核心观点",
      body: `${outputZh.description} 文章会围绕${payload.primary_keyword}展开，并结合${payload.target_audience}最关注的实际问题给出更易理解的中文解读。`
    },
    {
      heading: "重点分析方向",
      body: `内容会聚焦${payload.goal}，并结合输入中的主题、目标人群和搜索意图，整理出更适合中文阅读场景的关键观点与判断标准。`
    },
    {
      heading: "阅读与执行价值",
      body: `这份中文 HTML 镜像用于帮助你快速理解原始输出的核心意思，便于复核标题、描述、结构与 CTA 是否符合最终发布目标。`
    }
  ];

  const sectionHtml = sections
    .map((section) => `<h2>${section.heading}</h2><p>${section.body}</p>`)
    .join("");

  return [
    `<h1>${outputZh.title}</h1>`,
    `<p>${outputZh.description}</p>`,
    imageHtml,
    sectionHtml
  ].join("");
}

function extractTagContent(html, tagName) {
  const match = html.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i")
  );

  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function extractMetaContent(html, name) {
  const patterns = [
    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return "";
}

function extractJsonLdItems(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  for (const match of matches) {
    const raw = match[1]?.trim();

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        items.push(...parsed);
      } else {
        items.push(parsed);
      }
    } catch (error) {
      continue;
    }
  }

  return items.filter((item) => item && typeof item === "object");
}

function extractDataAttributeValues(html, attributeName) {
  const matches = [
    ...html.matchAll(new RegExp(`${attributeName}=["']([^"']+)["']`, "gi"))
  ];

  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractFirstParagraph(html) {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return match ? stripHtml(match[1]) : "";
}

function createTitleRichHtmlFragment(source) {
  const heading = normalizeWhitespace(source.structuredName || source.heading || formatSlugLabel(source.pathnameLabel) || source.hostname);
  const intro = normalizeWhitespace(source.metaDescription || source.firstParagraph || source.structuredDescription || "");
  const categoryItems = [...(source.pageCategories || []), ...(source.pageTags || [])]
    .flatMap((value) => String(value).split(","))
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .slice(0, 6);

  const parts = [`<h1>${heading}</h1>`];

  if (intro) {
    parts.push(`<p>${intro}</p>`);
  }

  if (source.pageTitle || source.ogTitle) {
    parts.push(`<p>Source title: ${normalizeWhitespace(source.pageTitle || source.ogTitle)}</p>`);
  }

  if (categoryItems.length > 0) {
    parts.push(`<ul>${categoryItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }

  return parts.join("");
}

function inferPageKind(source) {
  const combined = [
    source.url,
    source.hostname,
    source.pathnameLabel,
    source.pageTitle,
    source.ogTitle,
    source.heading,
    source.metaDescription,
    source.structuredCategory
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("/game/") ||
    combined.includes("game") ||
    combined.includes("browser game")
  ) {
    return "game";
  }

  return "generic";
}

function inferGameGenreKey(source) {
  const combined = [
    source.url,
    source.hostname,
    source.pathnameLabel,
    source.pageTitle,
    source.ogTitle,
    source.heading,
    source.metaDescription,
    source.firstParagraph,
    source.structuredName,
    source.structuredDescription,
    source.structuredCategory,
    ...(source.pageCategories || []),
    ...(source.pageTags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("uno") ||
    combined.includes("card") ||
    combined.includes("カード")
  ) {
    return "card";
  }

  if (combined.includes("puzzle") || combined.includes("パズル")) {
    return "puzzle";
  }

  if (
    combined.includes("crossy") ||
    combined.includes("action") ||
    combined.includes("runner") ||
    combined.includes("jump")
  ) {
    return "action";
  }

  return "";
}

function normalizeLanguage(language) {
  const value = String(language || "").trim();

  if (["简体中文", "中文简体"].includes(value)) {
    return "zh-Hans";
  }

  if (["English", "英文", "英语"].includes(value)) {
    return "en";
  }

  if (["日本語", "日语", "日文"].includes(value)) {
    return "ja";
  }

  return value;
}

function isSimplifiedChineseLanguage(language) {
  return normalizeLanguage(language) === "zh-Hans";
}

function isChineseLanguage(language) {
  return normalizeLanguage(language) === "zh-Hans";
}

function getLocalizedGenreLabel(genreKey, language) {
  const normalized = normalizeLanguage(language);
  const labels = {
    "zh-Hans": { card: "卡牌", puzzle: "益智", action: "动作" },
    en: { card: "Card", puzzle: "Puzzle", action: "Action" },
    ja: { card: "カード", puzzle: "パズル", action: "アクション" }
  };

  return labels[normalized]?.[genreKey] || "";
}

function createGameCategoryPhrase(source, language) {
  const genreKey = inferGameGenreKey(source);
  const genreLabel = getLocalizedGenreLabel(genreKey, language);
  const combined = [
    source.url,
    source.pathnameLabel,
    source.pageTitle,
    source.ogTitle,
    source.heading,
    source.metaDescription,
    source.structuredCategory,
    ...(source.pageCategories || []),
    ...(source.pageTags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (normalizeLanguage(language) === "zh-Hans" && genreLabel === "卡牌") {
    if (combined.includes("uno")) {
      return "卡牌对战小游戏";
    }

    return "卡牌小游戏";
  }

  if (genreLabel) {
    return `${genreLabel}小游戏`;
  }

  return "小游戏";
}

function createEnglishGameCategoryPhrase(source) {
  const genreLabel = getLocalizedGenreLabel(inferGameGenreKey(source), "English");

  if (genreLabel) {
    return `${genreLabel.toLowerCase()} browser game`;
  }

  return "browser game";
}

function hasJapaneseText(value) {
  return /[\u3040-\u30ff]/u.test(value || "");
}

function formatSlugLabel(slug) {
  if (!slug) {
    return "";
  }

  if (/^[a-z0-9-]+$/i.test(slug)) {
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => {
        if (part.length <= 3) {
          return part.toUpperCase();
        }

        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  return slug;
}

function normalizeWhitespace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function isReusableEnglishTitle(source, focus, siteLabel) {
  const candidate = normalizeWhitespace(source.pageTitle || source.ogTitle || "");

  if (!candidate || hasJapaneseText(candidate)) {
    return false;
  }

  const lower = candidate.toLowerCase();
  const focusLower = String(focus || "").toLowerCase();
  const siteLower = String(siteLabel || "").toLowerCase();

  if (focusLower && !lower.includes(focusLower)) {
    return false;
  }

  if (siteLower && !lower.includes(siteLower)) {
    return false;
  }

  if (!/(play|online|free|browser|game)/i.test(candidate)) {
    return false;
  }

  return candidate.length <= 65;
}

function resolveReadableFocus(source) {
  const slugLabel = formatSlugLabel(source.pathnameLabel);
  const heading = source.structuredName || source.ogTitle || source.heading || "";
  const pageTitle = source.pageTitle || "";
  const combined = `${heading} ${pageTitle}`;
  const containsJapanese = hasJapaneseText(combined);

  if (containsJapanese && slugLabel) {
    return slugLabel;
  }

  return heading || slugLabel || source.hostname;
}

function resolveSeoFocus(source, language) {
  if (isChineseLanguage(language)) {
    return resolveReadableFocus(source);
  }

  const readableFocus = resolveReadableFocus(source);
  const combined = [
    source.pageTitle,
    source.ogTitle,
    source.heading,
    source.structuredName
  ]
    .filter(Boolean)
    .join(" ");

  if (hasJapaneseText(combined) && readableFocus) {
    return readableFocus;
  }

  return (
    source.structuredName ||
    source.heading ||
    formatSlugLabel(source.pathnameLabel) ||
    source.ogTitle ||
    source.pageTitle ||
    source.hostname
  );
}

function resolveSiteLabel(source) {
  const title = source.ogTitle || source.pageTitle || "";
  const brandedParts = title
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (brandedParts.length > 1) {
    return brandedParts[brandedParts.length - 1];
  }

  return (
    source.structuredName ||
    source.heading ||
    formatSlugLabel(source.pathnameLabel) ||
    source.hostname
  );
}

function translateOriginalTitle(source, language) {
  const value = source.pageTitle;

  if (!value) {
    return "";
  }

  const readableFocus = resolveReadableFocus(source);
  const siteLabel = resolveSiteLabel(source);

  if (/^play\s+.+?\s+free\s+online\s*\|/i.test(value)) {
    return `${readableFocus} 免费在线玩 | ${siteLabel}`;
  }

  if (/^play\s+.+?\s+online\s*-\s*free\s+browser\s+game/i.test(value)) {
    return `${readableFocus} 在线免费玩 - 免费浏览器游戏`;
  }

  return value
    .replace(/^.+?を無料でプレイ/u, `${readableFocus} 免费玩`)
    .replace(/を無料でプレイ/gu, "免费玩")
    .replace(/^Play\s+/i, "")
    .replace(/面白い暇つぶしブラウザゲーム/gu, "有趣的浏览器小游戏")
    .replace(/\bOnline\b/gi, "在线")
    .replace(/\bFree Browser Game\b/gi, "免费浏览器游戏")
    .replace(/\bFree\b/gi, "免费")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\|/g, " | ")
    .replace(/在线 - 免费浏览器游戏/gi, "在线免费玩 - 免费浏览器游戏")
    .replace(/\s+\|\s+/g, " | ")
    .trim();
}

function translateOriginalDescription(source, language) {
  const value = source.metaDescription;

  if (!value) {
    return "";
  }

  const readableFocus = resolveReadableFocus(source);
  const siteLabel = resolveSiteLabel(source);

  if (
    /^Play .+? online right now on desktop or mobile\./i.test(value) &&
    /this free browser game/i.test(value) &&
    /no download required/i.test(value)
  ) {
    return `${readableFocus} 现可在电脑和手机上立即在线体验。${siteLabel} 提供这款无需下载即可开始的免费浏览器游戏，适合碎片时间轻松游玩。`;
  }

  if (/^Play .+? online in your browser with fast loading and no download required\./i.test(value)) {
    return `在浏览器中在线体验 ${readableFocus}，加载快速且无需下载。`;
  }

  return value
    .replace(
      /人気の無料ゲーム「(.+?)」を、PCやスマートフォンから今すぐプレイ！/u,
      `热门免费游戏《${readableFocus}》现可立即在 PC 和手机上体验。`
    )
    .replace(
      /ForFunFillが提供する安全なブラウザ環境で、面倒な登録なしで遊べます。/u,
      "ForFunFill 提供安全的浏览器环境，无需复杂注册即可直接游玩，"
    )
    .replace(
      /日々のリラックスタイムやちょっとした暇つぶしに最適な一作です。さっそくお試しください。/u,
      "适合日常放松和碎片时间体验。"
    )
    .replace(
      /Play (.+?) online in your browser with fast loading and no download required\./i,
      "在浏览器中在线体验 $1，加载快速且无需下载。"
    )
    .trim();
}

function createTitleFromPage(source, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const focus = resolveSeoFocus(source, language);
  const siteLabel = resolveSiteLabel(source);
  const pageKind = inferPageKind(source);
  const genreKey = inferGameGenreKey(source);
  const genreLabel = getLocalizedGenreLabel(genreKey, language);

  if (normalizedLanguage === "zh-Hans") {
    if (pageKind === "game") {
      const categoryPrefix = genreLabel ? `${genreLabel}浏览器小游戏` : "浏览器小游戏";
      return `${focus} 在线玩 - 免费${categoryPrefix} | ${siteLabel}`;
    }

    return `${focus} - 页面介绍 | ${siteLabel}`;
  }

  if (pageKind === "game") {
    if (normalizedLanguage === "en" && isReusableEnglishTitle(source, focus, siteLabel)) {
      return normalizeWhitespace(source.pageTitle || source.ogTitle);
    }

    if (normalizedLanguage === "en") {
      const categoryPrefix = genreLabel ? `${genreLabel} Browser Game` : "Browser Game";
      return `${focus} Online - Free ${categoryPrefix} | ${siteLabel}`;
    }

    if (normalizedLanguage === "ja") {
      return `${focus} を無料でオンラインプレイ | ${siteLabel}`;
    }
  }

  if (source.pageTitle) {
    return source.pageTitle;
  }

  if (source.heading) {
    return `${source.heading} | ${source.hostname}`;
  }

  return `${source.hostname} 页面 SEO 标题建议`;
}

function createDescriptionFromPage(source, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const focus = resolveSeoFocus(source, language);
  const siteLabel = resolveSiteLabel(source);
  const pageKind = inferPageKind(source);

  if (normalizedLanguage === "zh-Hans") {
    if (pageKind === "game") {
      const categoryPhrase = createGameCategoryPhrase(source, language);

      if (siteLabel === focus) {
        return `${focus} 是一款轻松上手的免费${categoryPhrase}，支持电脑与手机在线体验，无需下载或注册，打开网页即可马上开玩。`;
      }

      return `${focus} 是一款经典${categoryPhrase}，现可在 ${siteLabel} 免费在线游玩，支持电脑与手机访问，无需下载或注册，打开网页即可马上开玩。`;
    }

    return `${focus} 页面内容现已整理上线，支持直接访问查看核心信息与页面亮点。`;
  }

  if (pageKind === "game") {
    if (normalizedLanguage === "en") {
      const categoryPhrase = createEnglishGameCategoryPhrase(source);
      return `Play ${focus} online for free on ${siteLabel}. Enjoy this ${categoryPhrase} on desktop or mobile with no download or signup required.`;
    }

    if (normalizedLanguage === "ja") {
      const categoryLabel = getLocalizedGenreLabel(inferGameGenreKey(source), language);
      const categoryPhrase = categoryLabel ? `${categoryLabel}ブラウザゲーム` : "ブラウザゲーム";
      return `${siteLabel}で${focus}を無料でオンラインプレイ。ダウンロードや登録は不要で、PCとスマートフォンですぐ遊べる${categoryPhrase}です。`;
    }
  }

  return (
    source.metaDescription ||
    source.firstParagraph ||
    `了解 ${source.hostname} 页面内容亮点、核心玩法与访问价值。`
  );
}

function createTitleSlug(source) {
  const pathnameSlug = createSlug(source.pathnameLabel || "");

  if (pathnameSlug) {
    return pathnameSlug;
  }

  const englishFocus = createSlug(resolveSeoFocus(source, "English"));

  if (englishFocus) {
    return englishFocus;
  }

  return createSlug(source.hostname || "");
}

async function fetchPageMetadata(targetUrl) {
  const response = await fetch(targetUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const parsedUrl = new URL(targetUrl);
  const jsonLdItems = extractJsonLdItems(html);
  const videoGameEntry = jsonLdItems.find((item) => {
    const typeValue = item["@type"];

    if (Array.isArray(typeValue)) {
      return typeValue.includes("VideoGame");
    }

    return typeValue === "VideoGame";
  });
  const ogTitle = extractMetaContent(html, "og:title");
  const ogDescription = extractMetaContent(html, "og:description");
  const pageTitle = ogTitle || extractTagContent(html, "title");
  const heading = extractTagContent(html, "h1");
  const metaDescription =
    extractMetaContent(html, "description") ||
    ogDescription;
  const firstParagraph = extractFirstParagraph(html);
  const structuredName =
    typeof videoGameEntry?.name === "string" ? videoGameEntry.name.trim() : "";
  const structuredDescription =
    typeof videoGameEntry?.description === "string"
      ? videoGameEntry.description.trim()
      : "";
  const structuredCategory =
    typeof videoGameEntry?.applicationCategory === "string"
      ? videoGameEntry.applicationCategory.trim()
      : "";
  const pageCategories = extractDataAttributeValues(html, "data-category");
  const pageTags = extractDataAttributeValues(html, "data-tags")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const pathnameLabel = parsedUrl.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, " ")
    .trim() || parsedUrl.hostname;

  return {
    url: targetUrl,
    hostname: parsedUrl.hostname,
    pathnameLabel,
    html,
    pageTitle,
    ogTitle,
    heading,
    metaDescription,
    firstParagraph,
    structuredName,
    structuredDescription,
    structuredCategory,
    pageCategories,
    pageTags
  };
}

async function buildTitleTask(payload) {
  const page = await fetchPageMetadata(payload.url);
  const title = finalizeSeoTitle(createTitleFromPage(page, payload.language), payload.language);
  const slug = createTitleSlug(page);
  const description = finalizeSeoDescription(
    createDescriptionFromPage(page, payload.language),
    payload.language
  );
  const translatedTitle = translateOriginalTitle(page, payload.language);
  const translatedDescription = translateOriginalDescription(page, payload.language);
  const titleZh = finalizeSeoTitle(createTitleFromPage(page, "简体中文"), "简体中文");
  const descriptionZh = finalizeSeoDescription(
    createDescriptionFromPage(page, "简体中文"),
    "简体中文"
  );

  return {
    skill: "seo-title-generator",
    task: "write_seo_title",
    input: {
      ...payload
    },
    output_requirements: {
      title: "Return the article title as plain text, optimized to about 50-60 characters.",
      slug: "Return a URL-safe English slug for the page suffix, using at most 4 words joined by hyphens.",
      description: "Return the SEO description as plain text, optimized to about 150-160 characters.",
      html: "Return a fetched rich-text HTML fragment, not the full raw page HTML document.",
      fetched_title: "Return the raw page title fetched from the target URL.",
      fetched_description:
        "Return the raw meta description fetched from the target URL.",
      output_zh:
        "Return a Chinese-readable mirror of the output object, excluding html."
    },
    output: {
      title,
      slug,
      description,
      html: createTitleRichHtmlFragment(page),
      fetched_title: page.pageTitle,
      fetched_description: page.metaDescription
    },
    output_zh: {
      title: titleZh,
      description: descriptionZh,
      fetched_title: translatedTitle,
      fetched_description: translatedDescription
    }
  };
}

function buildBlogTask(payload) {
  const kind = inferBlogTopicKind(payload);
  const rawTitle = buildBlogTitle(payload);
  const title = kind === "phone-compare" ? rawTitle : finalizeSeoTitle(rawTitle, payload.language);
  const publishTime = new Date().toISOString();
  const html = buildBlogHtml(payload, title);
  const slug =
    kind === "phone-compare"
      ? createBlogSlugSeed(payload)
      : deriveBlogSlugFromHtml(html, createBlogSlugSeed(payload));
  const output = {
    title,
    slug,
    description: finalizeSeoDescription(payload.meta_description, payload.language),
    publish_time: publishTime,
    html,
    faq: buildFaq(payload)
  };

  return {
    skill: "seo-blog-generator",
    task: "write_seo_blog",
    input: {
      ...payload
    },
    output_requirements: {
      title: "Return the article title as plain text, optimized to about 50-60 characters.",
      slug: "Return a URL-safe slug derived from the article H1 in the final html, using at most 4 words joined by hyphens.",
      description: "Return the SEO description as plain text, optimized to about 150-160 characters.",
      publish_time: "Return the auto-generated publish time in ISO 8601 format.",
      html:
        "Return a complete HTML rich-text fragment that can be rendered directly, includes the article H1, renders the supplied images, and uses images.description as grounding for image-aligned copy.",
      faq: "Return FAQ JSON-LD using the Schema.org FAQPage format.",
      output_zh:
        "Return a Chinese-readable mirror of the output object, including translated html."
    },
    output,
    output_zh: buildBlogOutputZh(payload, output)
  };
}

function printUsage() {
  const blogFields = BLOG_INPUT_KEYS.join(", ");
  const titleFields = TITLE_INPUT_KEYS.join(", ");
  const languages = SUPPORTED_LANGUAGE_INPUTS.join(" | ");
  const lines = [
    "可用命令：",
    "",
    "  seo ready blog",
    "    查看 blog 生成模板，返回可直接填写的 JSON 输入结构。",
    "",
    "  seo create blog '{...}'",
    "    根据传入的 JSON 参数生成 blog 内容，并输出到 blog 目录下的 json 文件。",
    `    blog 必填字段：${blogFields}`,
    "    示例：seo create blog '{\"topic\":\"小游戏站如何通过 SEO 提升自然流量\",\"description\":\"...\",\"primary_keyword\":\"小游戏站SEO\",\"target_audience\":\"小游戏站运营者\",\"search_intent\":\"how-to\",\"language\":\"简体中文\",\"word_count\":\"1500-2200\",\"goal\":\"提升自然流量和广告收益\",\"brand_tone\":\"professional\",\"meta_description\":\"...\",\"cta\":\"联系我们获取增长方案\",\"remark\":\"...\"}'",
    "",
    "  seo ready title",
    "    查看 title 优化模板，返回可直接填写的 JSON 输入结构。",
    "",
    "  seo create title '{...}'",
    "    抓取目标链接页面内容，生成优化后的 title、description、slug 等结果，并输出到 title 目录下的 json 文件。",
    `    title 必填字段：${titleFields}`,
    "    示例：seo create title '{\"url\":\"https://example.com/\",\"language\":\"简体中文\"}'",
    "",
    `支持语言：${languages}`,
    "说明：`ready` 用于查看输入模板，`create` 用于正式执行生成。"
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function run(argv) {
  const [verb, subject, rawPayload] = argv;

  try {
    if (verb === "help") {
      printUsage();
      return;
    }

    if (verb === "ready" && subject === "blog") {
      printJson(READY_BLOG_TEMPLATE);
      return;
    }

    if (verb === "ready" && subject === "title") {
      printJson(READY_TITLE_TEMPLATE);
      return;
    }

    if (verb === "create" && subject === "blog") {
      if (!rawPayload) {
        throw new Error("Missing JSON payload for `seo create blog`.");
      }

      const payload = parseJsonArgument(rawPayload, "seo create blog");
      validateBlogInput(payload);
      const task = buildBlogTask(payload);
      const outputPath = writeTaskToTxt(task, { subdir: "blog" });
      printJson({
        file: outputPath,
        url: createFileUrl(outputPath),
        data: task
      });
      return;
    }

    if (verb === "create" && subject === "title") {
      if (!rawPayload) {
        throw new Error("Missing JSON payload for `seo create title`.");
      }

      const payload = parseJsonArgument(rawPayload, "seo create title");
      validateTitleInput(payload);
      const task = await buildTitleTask(payload);
      const outputPath = writeTaskToTxt(task, { prefix: "title", subdir: "title" });
      printJson({
        file: outputPath,
        url: createFileUrl(outputPath),
        data: task
      });
      return;
    }

    printUsage();
    process.exitCode = 1;
  } catch (error) {
    printError(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  run,
  buildBlogTask,
  buildTitleTask,
  createFileUrl,
  validateBlogInput,
  validateTitleInput,
  createOutputFilename,
  writeTaskToTxt,
  deriveBlogSlugFromHtml
};
