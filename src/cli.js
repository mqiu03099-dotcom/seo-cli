const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { READY_BLOG_TEMPLATE, BLOG_INPUT_KEYS } = require("./blog-template");
const { READY_TITLE_TEMPLATE, TITLE_INPUT_KEYS } = require("./title-template");

const SUPPORTED_LANGUAGE_INPUTS = ["English", "日本語", "简体中文"];

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

function writeTaskToTxt(task, options = {}) {
  const cwd = options.cwd || process.cwd();
  const now = options.now || new Date();
  const prefix = options.prefix || "blog";
  const subdir = options.subdir || "";
  const fileName = createOutputFilename(now, prefix);
  const outputDir = subdir ? path.join(cwd, subdir) : cwd;
  const filePath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
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
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildBlogTitle(payload) {
  const normalizedGoal = payload.goal.replace(/^\s*提升/, "").trim();

  return `${payload.primary_keyword}怎么做？${payload.target_audience}提升${normalizedGoal}的实战指南`;
}

function buildBlogHtml(payload, title) {
  const sections = [
    {
      heading: "为什么服装商城 SEO 在春季上新阶段更关键",
      body: `春季上新往往意味着新品集中发布、分类页频繁调整，以及大量商品详情页需要同步上线。对于${payload.target_audience}来说，这个阶段如果只依赖投流，很容易出现流量成本升高、单品曝光不稳定的问题。相反，围绕${payload.primary_keyword}建立稳定的自然搜索入口，可以让分类页、专题页和商品页在用户搜索时持续获得展示机会。`
    },
    {
      heading: "先搭好分类页与专题页的搜索入口",
      body: `分类页通常承担核心关键词覆盖，专题页则更适合承接“春季上新”“新品推荐”“女装穿搭”等阶段性需求。建议围绕用户真实搜索意图整理页面标题、H1、小标题与导语内容，让页面既能覆盖${payload.primary_keyword}，又能准确表达${payload.search_intent}型需求。页面内容不应只堆叠商品，而要补足选购建议、风格说明、季节场景与筛选维度。`
    },
    {
      heading: "商品页优化不要只写参数，要写成交理由",
      body: `很多商城商品页的问题不是信息少，而是缺少有搜索价值和转化价值的内容。商品标题、卖点描述、材质说明、适穿场景、搭配建议和常见问题，都会直接影响页面的检索覆盖与停留时长。你可以把${payload.description}里的重点拆进商品页模块，让商品页既满足搜索引擎理解，也满足用户决策。`
    },
    {
      heading: "内容营销要服务转化，而不是只追求收录",
      body: `如果要让 SEO 真正帮助春季新品销量增长，内容营销不能停留在泛流量文章。更有效的做法，是围绕新品上新、穿搭方案、选购指南、活动专题和用户疑问来规划内容，再将内容自然链接到对应分类页和商品页。这样既能提升自然流量，也能把阅读用户带回商城关键落地页，更贴近${payload.goal}这个目标。`
    },
    {
      heading: "一套可执行的落地节奏",
      body: `建议先完成关键词分组和页面映射，再依次优化分类页、重点商品页和专题内容，最后结合站内数据复盘点击率、停留时长和转化表现。执行时保持${payload.brand_tone}的表达风格，避免页面文案空泛、重复或只写给搜索引擎看。这样做的结果，是商城内容会更容易被用户理解，也更容易沉淀稳定的自然流量资产。`
    }
  ];

  const sectionHtml = sections
    .map(
      (section) =>
        `<section><h2>${section.heading}</h2><p>${section.body}</p></section>`
    )
    .join("");

  return [
    `<h1>${title}</h1>`,
    `<p>${payload.meta_description}</p>`,
    sectionHtml,
    `<p>${payload.cta}</p>`
  ].join("");
}

function deriveBlogSlugFromHtml(html) {
  const heading = extractTagContent(html, "h1");
  return createSlug(heading);
}

function buildFaq(payload) {
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
      }
    ]
  };
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
  const title = createTitleFromPage(page, payload.language);
  const slug = createTitleSlug(page);
  const description = createDescriptionFromPage(page, payload.language);
  const translatedTitle = translateOriginalTitle(page, payload.language);
  const translatedDescription = translateOriginalDescription(page, payload.language);
  const titleZh = createTitleFromPage(page, "简体中文");
  const descriptionZh = createDescriptionFromPage(page, "简体中文");

  return {
    skill: "seo-title-generator",
    task: "write_seo_title",
    input: {
      ...payload
    },
    output_requirements: {
      title: "Return the article title as plain text.",
      slug: "Return a URL-safe English slug for the page suffix.",
      description: "Return the SEO description as plain text.",
      html: "Return the fetched raw HTML content from the target URL.",
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
      html: page.html,
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
  const title = buildBlogTitle(payload);
  const publishTime = new Date().toISOString();
  const html = buildBlogHtml(payload, title);
  const slug = deriveBlogSlugFromHtml(html);

  return {
    skill: "seo-blog-generator",
    task: "write_seo_blog",
    input: {
      ...payload
    },
    output_requirements: {
      title: "Return the article title as plain text.",
      slug: "Return a URL-safe slug derived from the article H1 in the final html.",
      description: "Return the SEO description as plain text.",
      publish_time: "Return the auto-generated publish time in ISO 8601 format.",
      html: "Return a complete rich-text HTML fragment that includes the article H1.",
      faq: "Return FAQ JSON-LD using the Schema.org FAQPage format."
    },
    output: {
      title,
      slug,
      description: payload.meta_description,
      publish_time: publishTime,
      html,
      faq: buildFaq(payload)
    }
  };
}

function printUsage() {
  const lines = [
    "Usage:",
    "  seo ready blog",
    "  seo create blog '{...}'",
    "  seo ready title",
    "  seo create title '{\"url\":\"https://example.com/\",\"language\":\"简体中文\"}'"
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function run(argv) {
  const [verb, subject, rawPayload] = argv;

  try {
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
