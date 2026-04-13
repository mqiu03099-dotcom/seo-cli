const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const pkg = require("../package.json");

const {
  buildBlogTask,
  buildTitleTask,
  createFileUrl,
  createOutputFilename,
  deriveBlogSlugFromHtml,
  run,
  validateBlogInput,
  validateTitleInput,
  writeTaskToTxt
} = require("../src/cli");
const { READY_BLOG_TEMPLATE } = require("../src/blog-template");
const { READY_TITLE_TEMPLATE } = require("../src/title-template");

const samplePayload = {
  topic: "服装商城如何通过 SEO 提升春季新品销量",
  description:
    "面向服装电商运营者，重点讲商城站内 SEO、分类页优化、商品页文案和内容营销的实操方法，结合春季上新场景，强调可执行性。",
  primary_keyword: "服装商城SEO",
  target_audience: "服装电商运营者",
  search_intent: "how-to",
  language: "简体中文",
  word_count: "1500-2200",
  goal: "提升服装商城自然流量并促进新品转化",
  brand_tone: "professional",
  meta_description:
    "了解服装商城如何通过 SEO 优化分类页、商品页和内容营销，提升春季新品自然流量与销量。",
  cta: "联系我们获取服装商城 SEO 增长方案",
  remark: "开头结合春季上新和女装营销场景，不要太空泛，结尾强调转化。"
};

const gameBlogPayloadZh = {
  topic: "游戏站如何通过 SEO 提升自然流量与广告变现收益",
  description:
    "面向游戏站运营者，重点讲游戏详情页 SEO、分类页优化、内链布局、专题内容建设，以及如何兼顾 Google AdSense 与 Google Ad Manager 的广告收益表现，强调收录、点击率、停留时长和页面变现效率。",
  primary_keyword: "游戏站SEO",
  target_audience: "游戏站运营者",
  search_intent: "how-to",
  language: "简体中文",
  word_count: "1500-2200",
  goal: "提升游戏站自然流量并提高广告变现收益",
  brand_tone: "professional",
  meta_description:
    "了解游戏站如何通过 SEO 优化详情页、分类页和专题内容，提升自然流量，并结合 AdSense 与 Google Ad Manager 提高广告收益。",
  cta: "联系我们获取游戏站 SEO 与广告变现增长方案",
  remark: "开头结合游戏站获取自然流量和广告收益增长的场景，不要空泛，正文强调可执行方法，结尾突出流量与变现双增长。"
};

const gameBlogPayloadEn = {
  topic: "How Game Sites Improve Organic Traffic and Ad Revenue with SEO",
  description:
    "For game site operators, focusing on game detail page SEO, category page optimization, internal linking, topical content strategy, and balancing Google AdSense with Google Ad Manager monetization while improving indexing, click-through rate, engagement, and page revenue performance.",
  primary_keyword: "game site SEO",
  target_audience: "game site operators",
  search_intent: "how-to",
  language: "English",
  word_count: "1500-2200",
  goal: "increase organic traffic and improve ad monetization revenue for game sites",
  brand_tone: "professional",
  meta_description:
    "Learn how game sites can improve organic traffic through SEO for detail pages, category pages, and topical content while increasing ad revenue with AdSense and Google Ad Manager.",
  cta: "Contact us for a game site SEO and ad monetization growth plan",
  remark: "Open with the growth challenge of balancing traffic and ad revenue for game sites, keep the article practical, and end with a clear conversion-focused takeaway."
};

const gameBlogPayloadJa = {
  topic: "ゲームサイトがSEOで自然流入と広告収益を伸ばす方法",
  description:
    "ゲームサイト運営者向けに、ゲーム詳細ページSEO、カテゴリーページ最適化、内部リンク設計、特集コンテンツ作成、そして Google AdSense と Google Ad Manager を両立しながら収録率、CTR、滞在時間、広告収益を高める実践方法を解説します。",
  primary_keyword: "ゲームサイトSEO",
  target_audience: "ゲームサイト運営者",
  search_intent: "how-to",
  language: "日本語",
  word_count: "1500-2200",
  goal: "ゲームサイトの自然流入を増やし広告収益を高める",
  brand_tone: "professional",
  meta_description:
    "ゲームサイトが詳細ページ、カテゴリーページ、特集コンテンツのSEOを強化し、AdSense と Google Ad Manager で広告収益を伸ばす方法を解説します。",
  cta: "ゲームサイト向けSEO・広告収益改善プランをご相談ください",
  remark: "冒頭ではゲームサイトが自然流入と広告収益を両立したい課題を取り上げ、本文では実行しやすい施策を中心にし、最後は成果につながる締め方にしてください。"
};

const phoneComparePayloadZh = {
  topic: "苹果手机真的比华为更厉害吗？",
  description:
    "面向关注手机选购、科技趋势和品牌对比的用户，围绕苹果手机与华为手机在系统体验、性能表现、拍照能力、生态联动、商务属性、耐用性和价格区间上的差异展开分析。",
  primary_keyword: "苹果手机和华为手机谁更厉害",
  target_audience: "关注手机选购与品牌对比的消费者",
  search_intent: "how-to",
  language: "简体中文",
  word_count: "1500-2200",
  goal: "提升文章点击率、自然搜索流量和用户转化意愿",
  brand_tone: "professional",
  meta_description:
    "苹果手机真的比华为更厉害吗？从系统、拍照、性能、生态和价格多个维度全面对比，帮你判断苹果和华为到底谁更适合你。",
  cta: "联系我们获取科技数码内容 SEO 增长方案",
  remark: "开头直接抛出争议点，正文聚焦系统、拍照、续航、办公体验、生态联动和价格价值比，结尾给出不同人群如何选。"
};

const phoneComparePayloadEn = {
  topic: "苹果手机真的比华为更厉害吗？",
  description:
    "面向关注手机选购、科技趋势和品牌对比的用户，围绕苹果手机与华为手机在系统体验、性能表现、拍照能力、生态联动、商务属性、耐用性和价格区间上的差异展开分析。",
  primary_keyword: "苹果手机和华为手机谁更厉害",
  target_audience: "关注手机选购与品牌对比的消费者",
  search_intent: "how-to",
  language: "English",
  word_count: "1500-2200",
  goal: "increase article click-through rate, organic search traffic, and conversion intent",
  brand_tone: "professional",
  meta_description:
    "Is the iPhone really better than Huawei? Compare software, camera quality, performance, ecosystem, and value to see which phone is the better fit for you.",
  cta: "Contact us for a technology content SEO growth plan",
  remark: "Open with a strong controversy-driven hook and end by explaining which users should choose iPhone and which should choose Huawei."
};

test("buildBlogTask includes slug in the final output schema", () => {
  const task = buildBlogTask(samplePayload);

  assert.notEqual(task.output.slug, "");
  assert.equal(
    task.output_requirements.slug,
    "Return a URL-safe slug derived from the article H1 in the final html, using at most 4 words joined by hyphens."
  );
  assert.equal(
    task.output_requirements.output_zh,
    "Return a Chinese-readable mirror of the output object, including translated html."
  );
  assert.match(task.output_requirements.title, /50-60/);
  assert.match(task.output_requirements.description, /150-160/);
});

test("buildBlogTask uses the seo-blog-generator skill name", () => {
  const task = buildBlogTask(samplePayload);

  assert.equal(task.skill, "seo-blog-generator");
});

test("package name uses seo-cli", () => {
  assert.equal(pkg.name, "seo-cli");
});

test("buildBlogTask declares that html output must include an h1", () => {
  const task = buildBlogTask(samplePayload);

  assert.match(task.output.html, /<h1>/);
  assert.equal(
    task.output_requirements.html,
    "Return a complete rich-text HTML fragment that includes the article H1."
  );
});

test("buildBlogTask generates a title, description and publish time", () => {
  const task = buildBlogTask(samplePayload);

  assert.match(task.output.title, /服装商城SEO/);
  assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
  assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
  assert.match(task.output.publish_time, /^\d{4}-\d{2}-\d{2}T/);
});

test("buildBlogTask avoids duplicated boost wording in the generated title", () => {
  const task = buildBlogTask(samplePayload);

  assert.match(task.output.title, /服装商城SEO怎么做？/);
  assert.match(task.output.title, /实战指南|深度对比解析|选购参考指南/);
  assert.doesNotMatch(task.output.title, /提升提升/);
});

test("buildBlogTask generates FAQ content", () => {
  const task = buildBlogTask(samplePayload);

  assert.equal(task.output.faq["@type"], "FAQPage");
  assert.equal(task.output.faq.mainEntity.length, 3);
  assert.match(task.output.faq.mainEntity[0].name, /服装商城SEO/);
  assert.notEqual(task.output.faq.mainEntity[0].acceptedAnswer.text, "");
  assert.equal(task.output_zh.title, task.output.title);
  assert.equal(task.output_zh.description, task.output.description);
  assert.equal(task.output_zh.publish_time, task.output.publish_time);
  assert.equal(task.output_zh.slug, task.output.slug);
  assert.equal(task.output_zh.faq["@type"], "FAQPage");
  assert.match(task.output_zh.html, /<h1>/);
  assert.match(task.output_zh.html, /<p>/);
});

test("buildBlogTask localizes English blog output instead of reusing Chinese templates", () => {
  const task = buildBlogTask(gameBlogPayloadEn);

  assert.match(task.output.title, /Practical Guide|Guide/i);
  assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
  assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
  assert.match(task.output.html, /<h2>Why SEO matters/i);
  assert.match(task.output.html, /<p>Learn how game sites can improve organic traffic/i);
  assert.equal(task.output.faq.mainEntity[0]["@type"], "Question");
  assert.equal(task.output.faq.mainEntity.length, 3);
  assert.match(task.output.faq.mainEntity[0].name, /Which page should game site SEO optimize first\?/i);
  assert.doesNotMatch(task.output.html, /为什么服装商城|春季上新|女装穿搭/);
  assert.match(task.output_zh.title, /游戏站SEO|实战指南|搜索曝光/);
  assert.match(task.output_zh.description, /自然流量|搜索曝光|广告变现/);
  assert.doesNotMatch(task.output_zh.title, /中文参考/);
  assert.doesNotMatch(task.output_zh.description, /中文参考/);
  assert.equal(task.output_zh.slug, task.output.slug);
  assert.equal(task.output_zh.publish_time, task.output.publish_time);
  assert.match(task.output_zh.html, /<h1>/);
  assert.doesNotMatch(task.output_zh.html, /Why SEO matters/i);
  assert.match(task.output_zh.html, /为什么|实战指南|搜索曝光/);
});

test("buildBlogTask localizes Japanese blog output instead of reusing Chinese templates", () => {
  const task = buildBlogTask(gameBlogPayloadJa);

  assert.match(task.output.title, /ゲームサイトSEO/);
  assert.match(task.output.html, /<h2>なぜSEOが重要なのか/);
  assert.match(task.output.faq.mainEntity[0].name, /最初に最適化すべきページ/);
  assert.doesNotMatch(task.output.html, /为什么服装商城|春季上新|女装穿搭/);
});

test("buildBlogTask keeps Chinese game-site output free of apparel-shop template text", () => {
  const task = buildBlogTask(gameBlogPayloadZh);

  assert.match(task.output.title, /游戏站SEO/);
  assert.match(task.output.html, /<h2>为什么 SEO 对游戏站增长更关键/);
  assert.doesNotMatch(task.output.html, /服装商城|春季上新|女装穿搭/);
});

test("buildBlogTask generates a real phone-comparison article in Chinese", () => {
  const task = buildBlogTask(phoneComparePayloadZh);

  assert.equal(
    task.output.title,
    "苹果和华为怎么选？系统、拍照与价格全对比｜购机前先看核心差异"
  );
  assert.equal(task.output.faq.mainEntity.length, 3);
  assert.doesNotMatch(task.output.title, /深度对比解析.*深度对比解析/);
  assert.doesNotMatch(task.output.title, /选购参考指南.*选购参考指南/);
  assert.doesNotMatch(task.output.title, /真实体验分析.*真实体验分析/);
  assert.match(task.output.html, /系统|拍照|续航|生态/);
  assert.doesNotMatch(task.output.html, /Why SEO matters|game detail pages|AdSense|Google Ad Manager/i);
  assert.equal(task.output.slug, "iphone-vs-huawei");
  assert.match(task.output.faq.mainEntity[0].name, /苹果|华为/);
});

test("buildBlogTask generates an English phone-comparison article without mixed Chinese body text", () => {
  const task = buildBlogTask(phoneComparePayloadEn);

  assert.match(task.output.title, /iPhone|Huawei/);
  assert.match(task.output.html, /<h2>Software experience and daily smoothness/);
  assert.doesNotMatch(task.output.html, /关注手机选购|苹果手机|华为手机|为什么 SEO 对/);
  assert.doesNotMatch(task.output.html, /game detail pages|For a game site/i);
  assert.equal(task.output.slug, "iphone-vs-huawei");
  assert.match(task.output_zh.html, /<h1>/);
  assert.match(task.output_zh.html, /苹果|华为/);
});

test("deriveBlogSlugFromHtml builds the blog slug from the html h1 content", () => {
  const html =
    "<h1>Browser Game SEO Growth Guide for Indie Portals</h1><p>Intro</p>";

  assert.equal(
    deriveBlogSlugFromHtml(html),
    "browser-game-seo-growth"
  );
});

test("buildBlogTask limits slug length to four words", () => {
  const task = buildBlogTask(gameBlogPayloadEn);

  assert.equal(task.output.slug, "game-site-seo-a");
  assert.ok(task.output.slug.split("-").length <= 4);
});

test("ready title returns a sample url payload", () => {
  assert.deepEqual(READY_TITLE_TEMPLATE, {
    url: "https://example.com/",
    language: "English | 日本語 | 简体中文"
  });
});

test("ready blog advertises only English, Japanese, and simplified Chinese", () => {
  assert.equal(READY_BLOG_TEMPLATE.language, "English | 日本語 | 简体中文");
});

test("run help prints Chinese command guidance", async () => {
  const originalWrite = process.stdout.write;
  const originalExitCode = process.exitCode;
  let output = "";

  process.stdout.write = (chunk) => {
    output += String(chunk);
    return true;
  };

  process.exitCode = undefined;

  try {
    await run(["help"]);
  } finally {
    process.stdout.write = originalWrite;
    process.exitCode = originalExitCode;
  }

  assert.match(output, /可用命令/);
  assert.match(output, /seo ready blog/);
  assert.match(output, /查看 blog 生成模板/);
  assert.match(output, /seo create title/);
  assert.match(output, /支持语言/);
  assert.doesNotMatch(output, /^Usage:/m);
});

test("validateTitleInput requires a url string", () => {
  assert.throws(
    () => validateTitleInput({ url: 123, language: "简体中文" }),
    /Title field `url` must be a string./
  );
});

test("validateTitleInput requires a language string", () => {
  assert.throws(
    () => validateTitleInput({ url: "https://example.com/", language: 123 }),
    /Title field `language` must be a string./
  );
});

test("validateTitleInput rejects unsupported languages", () => {
  assert.throws(
    () => validateTitleInput({ url: "https://example.com/", language: "한국어" }),
    /Title field `language` must be one of: English, 日本語, 简体中文./
  );
});

test("validateBlogInput rejects unsupported languages", () => {
  assert.throws(
    () => validateBlogInput({ ...samplePayload, language: "Русский" }),
    /Blog field `language` must be one of: English, 日本語, 简体中文./
  );
});

test("buildTitleTask fetches the page and generates title metadata", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>Mini Crossy Road Online - Free Browser Game</title>
          <meta name="description" content="Play Mini Crossy Road online in your browser with fast loading and no download required.">
        </head>
        <body>
          <h1>Mini Crossy Road</h1>
          <p>Jump into a fast-loading browser game experience with simple controls and short rounds.</p>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const payload = {
    url: `http://127.0.0.1:${address.port}/games/mini-crossy-road`,
    language: "简体中文"
  };

  try {
    const task = await buildTitleTask(payload);

    assert.equal(task.task, "write_seo_title");
    assert.equal(task.skill, "seo-title-generator");
    assert.equal(task.input.url, payload.url);
    assert.equal(
      task.output_requirements.fetched_title,
      "Return the raw page title fetched from the target URL."
    );
    assert.equal(
      task.output_requirements.slug,
      "Return a URL-safe English slug for the page suffix, using at most 4 words joined by hyphens."
    );
    assert.equal(
      task.output_requirements.fetched_description,
      "Return the raw meta description fetched from the target URL."
    );
    assert.equal(
      task.output_requirements.output_zh,
      "Return a Chinese-readable mirror of the output object, excluding html."
    );
    assert.equal(
      task.output_requirements.html,
      "Return a fetched rich-text HTML fragment, not the full raw page HTML document."
    );
    assert.match(task.output_requirements.title, /50-60/);
    assert.match(task.output_requirements.description, /150-160/);
    assert.equal(
      task.output.fetched_title,
      "Mini Crossy Road Online - Free Browser Game"
    );
    assert.equal(
      task.output.fetched_description,
      "Play Mini Crossy Road online in your browser with fast loading and no download required."
    );
    assert.equal(
      task.output.title.includes("Mini Crossy Road"),
      true
    );
    assert.equal(task.output.slug, "mini-crossy-road");
    assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
    assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    assert.equal(task.output_zh.title, task.output.title);
    assert.equal(task.output_zh.description, task.output.description);
    assert.equal(task.output_zh.fetched_title, "Mini Crossy Road 在线免费玩 - 免费浏览器游戏");
    assert.equal(
      task.output_zh.fetched_description,
      "在浏览器中在线体验 Mini Crossy Road，加载快速且无需下载。"
    );
    assert.equal("translated_title" in task.output_requirements, false);
    assert.equal("translated_description" in task.output_requirements, false);
    assert.equal("translated_title" in task.output, false);
    assert.equal("translated_description" in task.output, false);
    assert.equal("slug" in task.output_zh, false);
    assert.equal("html" in task.output_zh, false);
    assert.match(task.output.html, /<h1>/i);
    assert.match(task.output.html, /<p>/i);
    assert.doesNotMatch(task.output.html, /<html/i);
    assert.doesNotMatch(task.output.html, /<head/i);
    assert.doesNotMatch(task.output.html, /<title>/i);
    assert.equal("intro" in task.output, false);
    assert.equal("html_excerpt" in task.output, false);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("buildTitleTask localizes Japanese source metadata for Chinese output", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>ウノ！を無料でプレイ - 面白い暇つぶしブラウザゲーム | ForFunFill</title>
          <meta name="description" content="人気の無料ゲーム「ウノ！」を、PCやスマートフォンから今すぐプレイ！ForFunFillが提供する安全なブラウザ環境で、面倒な登録なしで遊べます。日々のリラックスタイムやちょっとした暇つぶしに最適な一作です。さっそくお試しください。">
        </head>
        <body>
          <h1>ウノ！</h1>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const payload = {
    url: `http://127.0.0.1:${address.port}/game/uno`,
    language: "简体中文"
  };

  try {
    const task = await buildTitleTask(payload);

    assert.equal(
      task.output.title.includes("UNO 在线玩"),
      true
    );
    assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
    assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    assert.equal(
      task.output_zh.fetched_title,
      "UNO 免费玩 - 有趣的浏览器小游戏 | ForFunFill"
    );
    assert.equal(
      task.output_zh.fetched_description,
      "热门免费游戏《UNO》现可立即在 PC 和手机上体验。ForFunFill 提供安全的浏览器环境，无需复杂注册即可直接游玩，适合日常放松和碎片时间体验。"
    );
    assert.equal(
      task.output.fetched_title,
      "ウノ！を無料でプレイ - 面白い暇つぶしブラウザゲーム | ForFunFill"
    );
    assert.equal(
      task.output.fetched_description,
      "人気の無料ゲーム「ウノ！」を、PCやスマートフォンから今すぐプレイ！ForFunFillが提供する安全なブラウザ環境で、面倒な登録なしで遊べます。日々のリラックスタイムやちょっとした暇つぶしに最適な一作です。さっそくお試しください。"
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("buildTitleTask generates English-ready metadata when language is English", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>ウノ！を無料でプレイ - 面白い暇つぶしブラウザゲーム | ForFunFill</title>
          <meta name="description" content="人気の無料ゲーム「ウノ！」を、PCやスマートフォンから今すぐプレイ！ForFunFillが提供する安全なブラウザ環境で、面倒な登録なしで遊べます。日々のリラックスタイムやちょっとした暇つぶしに最適な一作です。さっそくお試しください。">
        </head>
        <body>
          <h1>ウノ！</h1>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const payload = {
    url: `http://127.0.0.1:${address.port}/game/uno`,
    language: "English"
  };

  try {
    const task = await buildTitleTask(payload);

    assert.equal(
      task.output.title.includes("UNO Online - Free Card Browser Game | ForFunFill"),
      true
    );
    assert.equal(task.output.slug, "uno");
    assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
    assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    assert.equal(
      task.output.fetched_title,
      "ウノ！を無料でプレイ - 面白い暇つぶしブラウザゲーム | ForFunFill"
    );
    assert.equal(
      task.output.fetched_description,
      "人気の無料ゲーム「ウノ！」を、PCやスマートフォンから今すぐプレイ！ForFunFillが提供する安全なブラウザ環境で、面倒な登録なしで遊べます。日々のリラックスタイムやちょっとした暇つぶしに最適な一作です。さっそくお試しください。"
    );
    assert.equal(
      task.output_zh.fetched_title,
      "UNO 免费玩 - 有趣的浏览器小游戏 | ForFunFill"
    );
    assert.equal(
      task.output_zh.fetched_description,
      "热门免费游戏《UNO》现可立即在 PC 和手机上体验。ForFunFill 提供安全的浏览器环境，无需复杂注册即可直接游玩，适合日常放松和碎片时间体验。"
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("buildTitleTask uses og, json-ld and in-page categories as richer metadata signals", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>Play Now | Demo Site</title>
          <meta property="og:title" content="Sky Battle Arena - Free Browser Game | DemoArcade">
          <meta property="og:description" content="Fight in fast multiplayer air battles with quick matches and instant browser play.">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "VideoGame",
              "name": "Sky Battle Arena",
              "description": "A fast-paced online action game with aerial combat and short matches.",
              "applicationCategory": "Action Game"
            }
          </script>
        </head>
        <body>
          <h1>Play Demo</h1>
          <div data-category="Action"></div>
          <div data-tags="action,multiplayer,arcade"></div>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const payload = {
    url: `http://127.0.0.1:${address.port}/game/sky-battle-arena`,
    language: "简体中文"
  };

  try {
    const task = await buildTitleTask(payload);

    assert.equal(
      task.output.title.includes("Sky Battle Arena 在线玩"),
      true
    );
    assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
    assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    assert.equal(
      task.output.fetched_title,
      "Sky Battle Arena - Free Browser Game | DemoArcade"
    );
    assert.equal(
      task.output.fetched_description,
      "Fight in fast multiplayer air battles with quick matches and instant browser play."
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("buildTitleTask keeps strong English game titles aligned with source and avoids unsupported claims", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>Play Screw Master 3D Pin Puzzle Free Online | ForFunFill</title>
          <meta name="description" content="Play Screw Master 3D Pin Puzzle online right now on desktop or mobile. ForFunFill presents this free browser game in an easy-to-start format with no download required, making it a convenient pick for quick breaks or relaxed play.">
          <meta property="og:title" content="Play Screw Master 3D Pin Puzzle Free Online | ForFunFill">
          <meta property="og:description" content="Play Screw Master 3D Pin Puzzle online right now on desktop or mobile. ForFunFill presents this free browser game in an easy-to-start format with no download required, making it a convenient pick for quick breaks or relaxed play.">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "VideoGame",
              "name": "Screw Master 3D Pin Puzzle",
              "description": "Play Screw Master 3D Pin Puzzle online right now on desktop or mobile.",
              "applicationCategory": "Puzzle Game"
            }
          </script>
        </head>
        <body>
          <h1>Screw Master 3D Pin Puzzle</h1>
          <p>Screw Master 3D Pin Puzzle is a free browser game you can start instantly.</p>
          <div data-category="Puzzle"></div>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const payload = {
    url: `http://127.0.0.1:${address.port}/game/screw-master-3d-pin-puzzle`,
    language: "English"
  };

  try {
    const task = await buildTitleTask(payload);

    assert.equal(
      task.output.title,
      "Play Screw Master 3D Pin Puzzle Free Online | ForFunFill"
    );
    assert.equal(task.output.slug, "screw-master-3d-pin");
    assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
    assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    assert.equal(task.output.description.includes("classic"), false);
    assert.equal(
      task.output_zh.fetched_title,
      "Screw Master 3D Pin Puzzle 免费在线玩 | ForFunFill"
    );
    assert.equal(
      task.output_zh.fetched_description,
      "Screw Master 3D Pin Puzzle 现可在电脑和手机上立即在线体验。ForFunFill 提供这款无需下载即可开始的免费浏览器游戏，适合碎片时间轻松游玩。"
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("buildTitleTask supports simplified Chinese, English, and Japanese output", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>Play Screw Master 3D Pin Puzzle Free Online | ForFunFill</title>
          <meta name="description" content="Play Screw Master 3D Pin Puzzle online right now on desktop or mobile. ForFunFill presents this free browser game in an easy-to-start format with no download required.">
          <meta property="og:title" content="Play Screw Master 3D Pin Puzzle Free Online | ForFunFill">
          <meta property="og:description" content="Play Screw Master 3D Pin Puzzle online right now on desktop or mobile. ForFunFill presents this free browser game in an easy-to-start format with no download required.">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "VideoGame",
              "name": "Screw Master 3D Pin Puzzle",
              "description": "Play Screw Master 3D Pin Puzzle online right now on desktop or mobile.",
              "applicationCategory": "Puzzle Game"
            }
          </script>
        </head>
        <body>
          <h1>Screw Master 3D Pin Puzzle</h1>
          <p>Screw Master 3D Pin Puzzle is a free browser puzzle game for desktop and mobile.</p>
          <div data-category="Puzzle"></div>
        </body>
      </html>`);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/game/screw-master-3d-pin-puzzle`;

  try {
    const cases = [
      {
        language: "简体中文",
        title: "Screw Master 3D Pin Puzzle 在线玩 - 免费益智浏览器小游戏 | ForFunFill",
        description: "Screw Master 3D Pin Puzzle"
      },
      {
        language: "English",
        title: "Play Screw Master 3D Pin Puzzle Free Online | ForFunFill",
        description: "Play Screw Master 3D Pin Puzzle"
      },
      {
        language: "日本語",
        title: "Screw Master 3D Pin Puzzle を無料でオンラインプレイ | ForFunFill",
        description: "ForFunFillでScrew Master 3D Pin Puzzle"
      }
    ];

    for (const item of cases) {
      const task = await buildTitleTask({ url: baseUrl, language: item.language });
      assert.equal(task.output.title.includes(item.title), true);
      assert.equal(task.output.description.includes(item.description), true);
      assert.ok(task.output.title.length >= 50 && task.output.title.length <= 60);
      assert.ok(task.output.description.length >= 150 && task.output.description.length <= 160);
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("createOutputFilename uses the requested json naming format", () => {
  const fileName = createOutputFilename(new Date("2026-04-13T12:45:45+08:00"));

  assert.equal(fileName, "blog-2026-04-13-12-45-45.json");
});

test("writeTaskToTxt persists the generated task object as a json file", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-cli-"));
  const task = buildBlogTask(samplePayload);
  const outputPath = writeTaskToTxt(task, {
    cwd: tempDir,
    now: new Date("2026-04-13T12:45:45+08:00"),
    subdir: "blog"
  });

  assert.equal(path.basename(outputPath), "blog-2026-04-13-12-45-45.json");
  assert.equal(path.basename(path.dirname(outputPath)), "blog");
  assert.equal(fs.existsSync(outputPath), true);
  assert.match(
    fs.readFileSync(outputPath, "utf8"),
    /"task": "write_seo_blog"/
  );
});

test("writeTaskToTxt can persist title output under the title subdirectory as json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-cli-title-"));
  const outputPath = writeTaskToTxt({ task: "write_seo_title" }, {
    cwd: tempDir,
    now: new Date("2026-04-13T12:45:45+08:00"),
    prefix: "title",
    subdir: "title"
  });

  assert.equal(path.basename(outputPath), "title-2026-04-13-12-45-45.json");
  assert.equal(path.basename(path.dirname(outputPath)), "title");
  assert.equal(fs.existsSync(outputPath), true);
});

test("createFileUrl returns a local file URL for the generated json file", () => {
  const fileUrl = createFileUrl("D:\\giteeContent\\xmkj\\seo-cli\\blog-2026-04-13-12-45-45.json");

  assert.equal(
    fileUrl,
    "file:///D:/giteeContent/xmkj/seo-cli/blog-2026-04-13-12-45-45.json"
  );
});
