# Helmholtz blog font update

## Apply

From the repository root:

```bash
git apply helmholtz-font-update.patch
```

Or copy the included `static/` and `templates/` files over the matching files in the repository.

## Article language

English articles need no change. Simplified Chinese also falls back to the SC glyph set by default.

For explicit regional CJK glyphs, add `lang` under the article's existing `[extra]` block:

```toml
[extra]
subtitle = "..."
lang = "zh-TW"
```

Supported values for the font routing rules:

- `zh-CN` / `zh-Hans` — Simplified Chinese
- `zh-TW` / `zh-Hant` — Traditional Chinese (Taiwan)
- `zh-HK` / `zh-Hant-HK` — Traditional Chinese (Hong Kong)
- `ja` — Japanese
- `ko` — Korean

## Commit message

```text
feat: add CJK typography and monochrome emoji fonts
```
