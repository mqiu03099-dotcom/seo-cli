const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildBlogTask,
  createFileUrl,
  createOutputFilename,
  writeTaskToTxt
} = require("../src/cli");

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

  assert.equal(task.output.slug, "");
});

test("buildBlogTask declares that html output must include an h1", () => {
  const task = buildBlogTask(samplePayload);

  assert.equal(task.output.html, "");
  assert.equal(
    task.output_requirements.html,
    "Return a complete rich-text HTML fragment that includes the article H1."
  );
});

test("createOutputFilename uses the requested txt naming format", () => {
  const fileName = createOutputFilename(new Date("2026-04-13T12:45:45+08:00"));

  assert.equal(fileName, "blog-2026-04-13-12-45-45.txt");
});

test("writeTaskToTxt persists the generated task object as a txt file", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-skill-"));
  const task = buildBlogTask(samplePayload);
  const outputPath = writeTaskToTxt(task, {
    cwd: tempDir,
    now: new Date("2026-04-13T12:45:45+08:00")
  });

  assert.equal(path.basename(outputPath), "blog-2026-04-13-12-45-45.txt");
  assert.equal(fs.existsSync(outputPath), true);
  assert.match(
    fs.readFileSync(outputPath, "utf8"),
    /"task": "write_seo_blog"/
  );
});

test("createFileUrl returns a local file URL for the generated txt file", () => {
  const fileUrl = createFileUrl("D:\\giteeContent\\xmkj\\seo-skill\\blog-2026-04-13-12-45-45.txt");

  assert.equal(
    fileUrl,
    "file:///D:/giteeContent/xmkj/seo-skill/blog-2026-04-13-12-45-45.txt"
  );
});
