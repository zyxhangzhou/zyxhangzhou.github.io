export type ThemeMode = "light" | "dark";

/** 与 Layout 首屏脚本共用，避免壁纸和配色在 hydration 前闪一下。 */
export const THEME_STORAGE_KEY = "shokax-color-scheme";

function getStoredTheme(win: Window): ThemeMode | null {
  try {
    const stored = win.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch (err) {
    console.warn("[ShokaX] Unable to read theme from storage", err);
  }

  return null;
}

function getPreferredTheme(win: Window): ThemeMode {
  return win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(doc: Document, theme: ThemeMode) {
  doc.documentElement.dataset.theme = theme;
}

export function initTheme(doc: Document, win: Window): ThemeMode {
  const theme = getStoredTheme(win) ?? getPreferredTheme(win);
  applyTheme(doc, theme);
  return theme;
}

function supportsViewTransitions(doc: Document): boolean {
  return "startViewTransition" in doc;
}

function prefersReducedMotion(win: Window): boolean {
  return win.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function persistTheme(win: Window, theme: ThemeMode) {
  try {
    win.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.warn("[ShokaX] Unable to persist theme", err);
  }
}

export function toggleThemeWithTransition(
  doc: Document,
  win: Window,
  current: ThemeMode,
): ThemeMode {
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  persistTheme(win, next);

  if (!supportsViewTransitions(doc) || prefersReducedMotion(win)) {
    applyTheme(doc, next);

    return next;
  }

  const transition = doc.startViewTransition(() => {
    applyTheme(doc, next);
  });

  transition.finished
    .then(() => {})
    .catch((err) => {
      console.warn("[ShokaX] Theme transition failed", err);
      persistTheme(win, next);
    });

  return next;
}

export function toggleTheme(doc: Document, win: Window, current: ThemeMode): ThemeMode {
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  applyTheme(doc, next);
  persistTheme(win, next);

  return next;
}
