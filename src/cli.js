const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { READY_BLOG_TEMPLATE, BLOG_INPUT_KEYS } = require("./blog-template");

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function createOutputFilename(now = new Date()) {
  const year = now.getFullYear();
  const month = padNumber(now.getMonth() + 1);
  const day = padNumber(now.getDate());
  const hours = padNumber(now.getHours());
  const minutes = padNumber(now.getMinutes());
  const seconds = padNumber(now.getSeconds());

  return `blog-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.txt`;
}

function writeTaskToTxt(task, options = {}) {
  const cwd = options.cwd || process.cwd();
  const now = options.now || new Date();
  const fileName = createOutputFilename(now);
  const filePath = path.join(cwd, fileName);

  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return filePath;
}

function createFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

function parseJsonArgument(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON payload for `seo create blog`.");
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
  return `${payload.primary_keyword}怎么做？${payload.target_audience}提升${payload.goal}的实战指南`;
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

function buildBlogTask(payload) {
  const title = buildBlogTitle(payload);
  const publishTime = new Date().toISOString();

  return {
    skill: "blog-writer",
    task: "write_seo_blog",
    input: {
      ...payload
    },
    output_requirements: {
      title: "Return the article title as plain text.",
      slug: "Return a URL-safe slug derived from the final title.",
      description: "Return the SEO description as plain text.",
      publish_time: "Return the auto-generated publish time in ISO 8601 format.",
      html: "Return a complete rich-text HTML fragment that includes the article H1.",
      faq: "Return FAQ JSON-LD using the Schema.org FAQPage format."
    },
    output: {
      title,
      slug: createSlug(title),
      description: payload.meta_description,
      publish_time: publishTime,
      html: buildBlogHtml(payload, title),
      faq: buildFaq(payload)
    }
  };
}

function printUsage() {
  const lines = [
    "Usage:",
    "  seo ready blog",
    "  seo create blog '{...}'"
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function run(argv) {
  const [verb, subject, rawPayload] = argv;

  try {
    if (verb === "ready" && subject === "blog") {
      printJson(READY_BLOG_TEMPLATE);
      return;
    }

    if (verb === "create" && subject === "blog") {
      if (!rawPayload) {
        throw new Error("Missing JSON payload for `seo create blog`.");
      }

      const payload = parseJsonArgument(rawPayload);
      validateBlogInput(payload);
      const task = buildBlogTask(payload);
      const outputPath = writeTaskToTxt(task);
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
  createFileUrl,
  validateBlogInput,
  createOutputFilename,
  writeTaskToTxt
};
