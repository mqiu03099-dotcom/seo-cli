---
name: seo-blog-generator
description: Use when Codex needs to define, maintain, or improve the `seo ready blog` and `seo create blog` workflow that accepts structured blog JSON, validates supported languages, and returns publish-ready blog output that can be written directly into a site content pipeline.
---

# SEO Blog Generator

Maintain the `seo ready blog` and `seo create blog` workflow as a structured SEO blog generator. The generated output should be publish-ready content assets, not planning notes or internal SEO guidance text.

## Scope

- Keep `seo ready blog` aligned with the current required input shape.
- Keep `seo create blog` input as JSON.
- Require the complete blog payload fields already defined by the CLI.
- Restrict supported `language` values to `English`, `日本語`, and `简体中文`.
- Generate final blog output under the `output` object only.
- Keep blog outputs written to the `blog/` directory.
- Return publish-ready fields for title, slug, description, publish time, html, and faq.

## Input Contract

`seo ready blog` should return a sample payload like:

```json
{
  "topic": "服装商城如何通过 SEO 提升春季新品销量",
  "description": "面向服装电商运营者，重点讲商城站内 SEO、分类页优化、商品页文案和内容营销的实操方法，结合春季上新场景，强调可执行性。",
  "primary_keyword": "服装商城SEO",
  "target_audience": "服装电商运营者",
  "search_intent": "how-to",
  "language": "English | 日本語 | 简体中文",
  "word_count": "1500-2200",
  "goal": "提升服装商城自然流量并促进新品转化",
  "brand_tone": "professional",
  "meta_description": "了解服装商城如何通过 SEO 优化分类页、商品页和内容营销，提升春季新品自然流量与销量。",
  "cta": "联系我们获取服装商城 SEO 增长方案",
  "remark": "开头结合春季上新和女装营销场景，不要太空泛，结尾强调转化。"
}
```

`seo create blog` should accept:

```json
{
  "topic": "...",
  "description": "...",
  "primary_keyword": "...",
  "target_audience": "...",
  "search_intent": "...",
  "language": "简体中文",
  "word_count": "...",
  "goal": "...",
  "brand_tone": "...",
  "meta_description": "...",
  "cta": "...",
  "remark": "..."
}
```

Validation rules:

- Reject missing required fields.
- Reject non-string field values.
- Reject unsupported `language` values outside `English`, `日本語`, and `简体中文`.

## Output Contract

Return a JSON object with a publish-ready `output` payload:

```json
{
  "title": "final blog title",
  "slug": "url-safe-slug",
  "description": "meta description",
  "publish_time": "ISO 8601 datetime",
  "html": "<h1>...</h1>...",
  "faq": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  }
}
```

Rules:

- `title` must be final article title text.
- `slug` must be URL-safe and derived from the article `<h1>` in the final `html`.
- `description` must be ready to use as the page meta description.
- `publish_time` must be auto-generated ISO 8601 format.
- `html` must be a complete rich-text HTML fragment and include the article `<h1>`.
- `faq` must be valid FAQ JSON-LD using Schema.org `FAQPage`.

## Generation Rules

- Generate blog output as publish-ready content, not as optimization instructions.
- Make the article useful to the target audience named in the input.
- Keep the article aligned with the provided `topic`, `primary_keyword`, `goal`, and `remark`.
- Ensure the title and description are consistent with the body content.
- Use the provided `meta_description` directly as the SEO description unless the CLI contract changes.
- Keep `slug` deterministic and URL-safe.
- Generate `slug` from the final HTML content, using the article `<h1>` as the canonical route source instead of treating the input title field as the direct source of truth.
- Keep the CTA in the final HTML.
- Ensure the article HTML includes section headings and readable paragraph structure.
- Ensure FAQ questions and answers are relevant to the topic and keyword.

## Language Rules

- Supported blog languages are only `English`, `日本語`, and `简体中文`.
- `seo ready blog` should advertise only those three options.
- Input validation should fail early for any other language.
- If language handling changes in the CLI, update this skill and the tests in the same change.

## Maintenance Notes

- Keep this skill focused on blog generation only.
- Title metadata generation belongs to `seo-title-generator`.
- If the CLI output contract changes, update this skill and the CLI tests together.
- Keep the skill aligned with the actual behavior of `buildBlogTask` in [src/cli.js](D:/giteeContent/xmkj/seo-cli/src/cli.js).
