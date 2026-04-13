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

test("buildBlogTask includes slug in the final output schema", () => {
  const task = buildBlogTask(samplePayload);

  assert.notEqual(task.output.slug, "");
  assert.equal(
    task.output_requirements.slug,
    "Return a URL-safe slug derived from the article H1 in the final html."
  );
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
  assert.equal(task.output.description, samplePayload.meta_description);
  assert.match(task.output.publish_time, /^\d{4}-\d{2}-\d{2}T/);
});

test("buildBlogTask avoids duplicated boost wording in the generated title", () => {
  const task = buildBlogTask(samplePayload);

  assert.equal(
    task.output.title,
    "服装商城SEO怎么做？服装电商运营者提升服装商城自然流量并促进新品转化的实战指南"
  );
  assert.doesNotMatch(task.output.title, /提升提升/);
});

test("buildBlogTask generates FAQ content", () => {
  const task = buildBlogTask(samplePayload);

  assert.equal(task.output.faq["@type"], "FAQPage");
  assert.match(task.output.faq.mainEntity[0].name, /服装商城SEO/);
  assert.notEqual(task.output.faq.mainEntity[0].acceptedAnswer.text, "");
});

test("deriveBlogSlugFromHtml builds the blog slug from the html h1 content", () => {
  const html =
    "<h1>Browser Game SEO Growth Guide for Indie Portals</h1><p>Intro</p>";

  assert.equal(
    deriveBlogSlugFromHtml(html),
    "browser-game-seo-growth-guide-for-indie-portals"
  );
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
      task.output_requirements.fetched_description,
      "Return the raw meta description fetched from the target URL."
    );
    assert.equal(
      task.output_requirements.output_zh,
      "Return a Chinese-readable mirror of the output object, excluding html."
    );
    assert.equal(
      task.output.fetched_title,
      "Mini Crossy Road Online - Free Browser Game"
    );
    assert.equal(
      task.output.fetched_description,
      "Play Mini Crossy Road online in your browser with fast loading and no download required."
    );
    assert.equal(
      task.output.title,
      "Mini Crossy Road 在线玩 - 免费动作浏览器小游戏 | Mini Crossy Road"
    );
    assert.equal(task.output.slug, "mini-crossy-road");
    assert.equal(
      task.output.description,
      "Mini Crossy Road 是一款轻松上手的免费动作小游戏，支持电脑与手机在线体验，无需下载或注册，打开网页即可马上开玩。"
    );
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
    assert.match(task.output.html, /<title>Mini Crossy Road Online - Free Browser Game<\/title>/i);
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
      task.output.title,
      "UNO 在线玩 - 免费卡牌浏览器小游戏 | ForFunFill"
    );
    assert.equal(
      task.output.description,
      "UNO 是一款经典卡牌对战小游戏，现可在 ForFunFill 免费在线游玩，支持电脑与手机访问，无需下载或注册，打开网页即可马上开玩。"
    );
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
      task.output.title,
      "UNO Online - Free Card Browser Game | ForFunFill"
    );
    assert.equal(task.output.slug, "uno");
    assert.equal(
      task.output.description,
      "Play UNO online for free on ForFunFill. Enjoy this card browser game on desktop or mobile with no download or signup required."
    );
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
      task.output.title,
      "Sky Battle Arena 在线玩 - 免费动作浏览器小游戏 | DemoArcade"
    );
    assert.equal(
      task.output.description,
      "Sky Battle Arena 是一款经典动作小游戏，现可在 DemoArcade 免费在线游玩，支持电脑与手机访问，无需下载或注册，打开网页即可马上开玩。"
    );
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
    assert.equal(task.output.slug, "screw-master-3d-pin-puzzle");
    assert.equal(
      task.output.description,
      "Play Screw Master 3D Pin Puzzle online for free on ForFunFill. Enjoy this puzzle browser game on desktop or mobile with no download or signup required."
    );
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
        description: "Screw Master 3D Pin Puzzle 是一款经典益智小游戏，现可在 ForFunFill 免费在线游玩，支持电脑与手机访问，无需下载或注册，打开网页即可马上开玩。"
      },
      {
        language: "English",
        title: "Play Screw Master 3D Pin Puzzle Free Online | ForFunFill",
        description: "Play Screw Master 3D Pin Puzzle online for free on ForFunFill. Enjoy this puzzle browser game on desktop or mobile with no download or signup required."
      },
      {
        language: "日本語",
        title: "Screw Master 3D Pin Puzzle を無料でオンラインプレイ | ForFunFill",
        description: "ForFunFillでScrew Master 3D Pin Puzzleを無料でオンラインプレイ。ダウンロードや登録は不要で、PCとスマートフォンですぐ遊べるパズルブラウザゲームです。"
      }
    ];

    for (const item of cases) {
      const task = await buildTitleTask({ url: baseUrl, language: item.language });
      assert.equal(task.output.title, item.title);
      assert.equal(task.output.description, item.description);
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("createOutputFilename uses the requested txt naming format", () => {
  const fileName = createOutputFilename(new Date("2026-04-13T12:45:45+08:00"));

  assert.equal(fileName, "blog-2026-04-13-12-45-45.txt");
});

test("writeTaskToTxt persists the generated task object as a txt file", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-cli-"));
  const task = buildBlogTask(samplePayload);
  const outputPath = writeTaskToTxt(task, {
    cwd: tempDir,
    now: new Date("2026-04-13T12:45:45+08:00"),
    subdir: "blog"
  });

  assert.equal(path.basename(outputPath), "blog-2026-04-13-12-45-45.txt");
  assert.equal(path.basename(path.dirname(outputPath)), "blog");
  assert.equal(fs.existsSync(outputPath), true);
  assert.match(
    fs.readFileSync(outputPath, "utf8"),
    /"task": "write_seo_blog"/
  );
});

test("writeTaskToTxt can persist title output under the title subdirectory", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-cli-title-"));
  const outputPath = writeTaskToTxt({ task: "write_seo_title" }, {
    cwd: tempDir,
    now: new Date("2026-04-13T12:45:45+08:00"),
    prefix: "title",
    subdir: "title"
  });

  assert.equal(path.basename(outputPath), "title-2026-04-13-12-45-45.txt");
  assert.equal(path.basename(path.dirname(outputPath)), "title");
  assert.equal(fs.existsSync(outputPath), true);
});

test("createFileUrl returns a local file URL for the generated txt file", () => {
  const fileUrl = createFileUrl("D:\\giteeContent\\xmkj\\seo-cli\\blog-2026-04-13-12-45-45.txt");

  assert.equal(
    fileUrl,
    "file:///D:/giteeContent/xmkj/seo-cli/blog-2026-04-13-12-45-45.txt"
  );
});
