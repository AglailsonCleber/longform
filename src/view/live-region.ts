let live: HTMLElement | null = null;

/** A polite live region so a screen reader hears the page without a visual dialog. */
export function announce(message: string): void {
  if (typeof document === "undefined") {
    return;
  }
  if (!live) {
    live = document.createElement("div");
    live.className = "longform-live";
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.appendChild(live);
  }
  const region = live;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 30);
}

export function removeLiveRegion(): void {
  live?.remove();
  live = null;
}
