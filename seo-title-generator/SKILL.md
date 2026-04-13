---
name: seo-title-generator
description: Use when Codex needs to define, maintain, or improve the `seo ready title` and `seo create title` workflow that accepts `url` and `language`, fetches the target page HTML, preserves fetched metadata, and generates language-aware title metadata that can be used directly on a site page.
---

# SEO Title Generator

Maintain the `seo ready title` and `seo create title` workflow as a URL-driven metadata generator. The generated `title` and `description` should be publish-ready site metadata, not internal SEO guidance text.

## Scope

- Keep `seo ready title` aligned with the current required input shape.
- Keep `seo create title` input as JSON, not positional URL arguments.
- Require `url` and `language` in the input payload.
- Fetch the target page HTML before generating output.
- Preserve source data in `fetched_title`, `fetched_description`, and `html`.
- Return translated source data in `translated_title` and `translated_description` as Chinese-readable metadata for operator review.
- Generate optimized `title` and `description` according to the requested language.
- Support publish-ready output for `简体中文`, `繁體中文`, `English`, `한국어`, `日本語`, and `Русский`.

## Input Contract

`seo ready title` should return a sample payload like:

```json
{
  "url": "https://example.com/",
  "language": "简体中文"
}
```

`seo create title` should accept:

```json
{
  "url": "https://target-page.example/path",
  "language": "简体中文"
}
```

Validation rules:

- Reject missing `url` or `language`.
- Reject non-string `url` or `language`.
- Reject invalid URLs before fetch.
- Normalize common language aliases to the supported output set where practical.

## Output Contract

Return a JSON object that keeps both source metadata and optimized metadata:

```json
{
  "title": "optimized title",
  "description": "optimized description",
  "html": "<!DOCTYPE html>...",
  "fetched_title": "raw page title",
  "fetched_description": "raw meta description",
  "translated_title": "Chinese-readable page title",
  "translated_description": "Chinese-readable meta description"
}
```

Do not add `intro`.
Do not add `html_excerpt`.

## Generation Rules

- Prefer the fetched `<title>` and `<meta name="description">` as source metadata.
- Prefer `og:title` over plain `<title>` when both exist and `og:title` is more specific.
- Prefer `og:description` as a fallback when the standard meta description is missing or weaker.
- If `language` is `简体中文` or `中文简体`, generate a Chinese SEO-style title and description even when the source page is not Chinese.
- If `language` is `繁體中文`, generate Traditional Chinese SEO-style metadata.
- If `language` is `English`, generate publish-ready English metadata instead of reusing the fetched source text verbatim.
- If `language` is `한국어`, `日本語`, or `Русский`, generate publish-ready metadata in that language using the same page understanding signals.
- Keep `fetched_title` and `fetched_description` unchanged from the fetched page.
- Return `translated_title` and `translated_description` as Chinese-readable versions of the fetched metadata.
- Use the page heading, pathname, and host as fallback signals when source metadata is incomplete.
- Read structured metadata when available, especially JSON-LD `VideoGame` fields such as `name`, `description`, and `applicationCategory`.
- Read page-level category or tag signals when present, including lightweight in-page attributes such as `data-category` and `data-tags`.
- Keep the optimized title concise and useful for search results.
- Keep the optimized description ready to paste into a site page as a real meta description.
- Never generate optimized copy that says things like `适合继续做 SEO 优化`, `标题优化建议`, or other internal workflow language.

## Search Display Constraints

Search engines do not enforce a fixed hard character limit for `title` or `description`, but Google and Bing commonly truncate them based on display width, device, and query context. The skill should optimize for practical display ranges rather than pretend there is a strict platform rule.

Working assumptions for publish-ready metadata:

- Treat Google and Bing as width-constrained, not character-hard-limited.
- Assume both engines may rewrite `title` and `description` if the page copy is weak, inconsistent, or query-misaligned.
- Keep the optimized `title`, `description`, page `<h1>`, and opening paragraph aligned so search engines are less likely to rewrite them.

Recommended output ranges:

- English `title`: aim for about `50-60` characters when possible.
- Chinese `title`: aim for about `28-32` Chinese characters when possible.
- English `description`: aim for about `140-160` characters when possible.
- Chinese `description`: aim for about `70-90` Chinese characters when possible.

These ranges are guidance, not rigid validation rules. Accuracy, query match, and readability take priority over hitting an exact count.

## Indexing and Rewrite Resistance

Optimized metadata should not only look good in isolation. It should also be easier for search engines to trust, index, and keep without aggressive rewriting.

Required indexing-oriented rules:

- Match the page topic exactly. Do not broaden a puzzle page into a generic gaming page or a card page into a strategy page just to insert bigger keywords.
- Keep the primary entity stable across metadata sources. The game name in the optimized `title` should match the strongest page signals such as `<h1>`, JSON-LD `name`, and canonical slug.
- Align the optimized `title` and `description` with the page opening paragraph whenever possible. If metadata promises something the visible page does not support, search engines are more likely to rewrite it.
- Do not keyword-stuff. Avoid repeated patterns like `free online game free browser game play free now`.
- Do not generate vague filler such as `best game`, `top fun game`, `amazing experience`, or other low-information phrases that are weak for indexing.
- Prefer concrete attributes that search engines can validate from the page, such as genre, platform, browser play, no download, desktop or mobile support, and the actual game name.
- Avoid unsupported claims. Do not say `no ads`, `safe`, `best`, `official`, `multiplayer`, or `unblocked` unless the page clearly supports that claim.
- Keep metadata query-relevant. The first meaningful words should usually identify the game and the main searchable action, such as `play online`, `free online`, or the game genre.
- Prefer one clear search intent per page. Do not mix article-style educational framing into a playable game detail page.
- If the source page already has a strong, specific title, improve clarity and SERP fit without drifting away from the page’s actual topic.

Anti-rewrite rules:

- Keep brand placement stable, usually at the end after `|`, unless the site convention clearly differs.
- Avoid decorative punctuation spam, emoji, excessive separators, or all-caps emphasis.
- Do not create title and description pairs that feel template-generated but semantically empty.
- Ensure the description expands on the title instead of repeating it word-for-word.
- Prefer wording that can be corroborated by visible content on the fetched page, structured data, or obvious URL/category signals.

## Source Priority

Use richer metadata before falling back to weaker signals.

Recommended priority for page understanding:

1. `og:title` / `og:description`
2. JSON-LD such as `VideoGame.name`, `VideoGame.description`, `VideoGame.applicationCategory`
3. Visible page heading such as `<h1>`
4. In-page category and tag signals such as `data-category` and `data-tags`
5. Standard `<title>` and `<meta name="description">`
6. URL slug and first paragraph fallback

For the returned fields:

- `fetched_title` should reflect the strongest fetched title signal currently used by the CLI.
- `fetched_description` should reflect the strongest fetched description signal currently used by the CLI.
- `translated_title` and `translated_description` should be based on those fetched values, not on a weaker fallback when a stronger source exists.

## Game Page Heuristics

When the page is clearly a game page:

- Prefer patterns like `在线玩`, `免费浏览器小游戏`, `无需下载`, `无需注册`, `马上开玩`.
- For English output, prefer direct site-ready patterns such as `Play <game> Online Free`, `Free <genre> Browser Game`, and `no download required` when those claims are supported by the page.
- Use the game name from `<h1>`, `<title>`, structured data, or URL slug.
- Prefer a site or brand label from the page title suffix, such as the text after `|`, instead of falling back to a raw hostname when a better brand label exists.
- Add a lightweight genre keyword when it is confidently inferable from the URL or source metadata, such as `卡牌`, `动作`, or `益智`.
- Use JSON-LD category values, Open Graph metadata, and in-page tags to strengthen genre inference before relying on slug-only guessing.
- For known games, prefer more specific phrases when justified by the page, such as `卡牌对战小游戏` for UNO-like pages instead of a generic `小游戏`.
- Avoid copying noisy marketing suffixes from the original page into the optimized Chinese title.
- Preserve the original language only in `fetched_title` and `fetched_description`.
- The optimized `title` and `description` must read like final site copy that can be published directly.
- Put the primary game name at the front of the optimized `title`.
- Keep the most important search promise early in the `description`, such as `play online`, `free`, `browser`, `desktop or mobile`, or `no download required`.

## Maintenance Notes

- Update this skill when the CLI contract changes for `ready title` or `create title`.
- Keep this skill focused on title metadata generation only; blog generation belongs elsewhere.
- If output fields change, update both the command logic and tests in the same change.
