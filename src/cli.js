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

function buildBlogTask(payload) {
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
      title: "",
      slug: "",
      description: "",
      publish_time: "",
      html: "",
      faq: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "",
            acceptedAnswer: {
              "@type": "Answer",
              text: ""
            }
          }
        ]
      }
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
