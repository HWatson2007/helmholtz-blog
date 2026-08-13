Helmholtz blog: KaTeX math support

Apply from the repository root:
  git apply helmholtz-katex-support.patch

Local development (instead of `zola serve`):
  node scripts/site.mjs serve

Production build (if zola is on PATH):
  node scripts/site.mjs build

Cloudflare build command:
  curl -L https://github.com/getzola/zola/releases/download/v0.23.3/zola-v0.23.3-x86_64-unknown-linux-gnu.tar.gz | tar xz && node scripts/site.mjs build --zola ./zola

Enable math in a post:
  [extra]
  math = true

Then write:
  Inline: $x_i \in \mathbb{R}$

  $$
  \|x\|_p = \left( \sum_{i=1}^{n} |x_i|^p \right)^{1/p}
  $$
