(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  const preferredTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const currentTheme = () => root.dataset.theme || preferredTheme();

  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("article-theme", next);
    });
  }

  const progress = document.getElementById("reading-progress");

  const updateProgress = () => {
    if (!progress) return;

    const scrollable =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;

    const value = scrollable > 0
      ? (document.documentElement.scrollTop / scrollable) * 100
      : 0;

    progress.style.width = `${Math.min(100, Math.max(0, value))}%`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  document.querySelectorAll(".prose pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1200);
      } catch {
        button.textContent = "Failed";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1200);
      }
    });

    pre.appendChild(button);
  });

  const tocLinks = [...document.querySelectorAll(".toc a[href*='#']")];

  if (tocLinks.length) {
    const linksById = new Map();

    tocLinks.forEach((link) => {
      try {
        const url = new URL(link.href);
        if (url.hash) linksById.set(decodeURIComponent(url.hash.slice(1)), link);
      } catch {
        // Ignore malformed URLs.
      }
    });

    const headings = [...linksById.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (headings.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (!visible.length) return;

          tocLinks.forEach((link) => link.classList.remove("is-active"));

          const active = linksById.get(visible[0].target.id);
          if (active) active.classList.add("is-active");
        },
        {
          rootMargin: "-12% 0px -72% 0px",
          threshold: [0, 1],
        }
      );

      headings.forEach((heading) => observer.observe(heading));
    }
  }
})();
