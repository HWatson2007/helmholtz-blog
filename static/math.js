(() => {
  if (typeof window.katex?.render !== "function") return;

  const decode = (value) => {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  document.querySelectorAll(".math-slot[data-math]").forEach((slot) => {
    const encoded = slot.dataset.math;
    if (!encoded) return;

    window.katex.render(decode(encoded), slot, {
      displayMode: slot.classList.contains("math-display"),
      throwOnError: false,
      strict: "warn",
      trust: false,
    });
  });
})();
