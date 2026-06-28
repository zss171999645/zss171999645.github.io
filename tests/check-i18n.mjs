import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pages = ["index.html", "publications.html", "cv.html"];
const i18nKeys = new Set();

for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  assertIncludes(html, 'class="language-toggle"', `${page} exposes a visible language toggle`);
  assertIncludes(html, 'data-i18n="nav.about"', `${page} wires navigation labels to i18n keys`);
  assertIncludes(html, 'script src="assets/i18n.js', `${page} loads the language toggle script`);
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    i18nKeys.add(match[1]);
  }
  if (page === "cv.html" && /<\/li>\s*<ul class="cv-sublist">/.test(html)) {
    throw new Error("cv.html keeps nested education sublists inside their parent list items");
  }
}

const script = readFileSync(join(root, "assets/i18n.js"), "utf8");
assertIncludes(script, "zh-CN", "script supports Chinese locale");
assertIncludes(script, "localStorage", "script persists language preference");
assertIncludes(script, "个人简介", "script contains Chinese homepage copy");
assertIncludes(script, "主要论文", "script contains Chinese publications copy");
assertIncludes(script, "教育经历", "script contains Chinese CV copy");
assertIncludes(script, "InSpatio", "script contains the current InSpatio internship");
assertIncludes(script, "TOPOS1.0", "script contains the TOPOS1.0 internship work");
assertIncludes(script, "Nov 2025 - May 2026", "script treats Horizon as a past internship");
assertDoesNotInclude(script, "Nov 2025 - Present: Talent Program Intern, Horizon Robotics", "script no longer treats Horizon as current");
assertDoesNotInclude(script, "2025 年 11 月至今：地平线", "Chinese copy no longer treats Horizon as current");

for (const key of i18nKeys) {
  assertIncludes(script, `"${key}":`, `${key} has a translation entry`);
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}: missing ${needle}`);
  }
}

function assertDoesNotInclude(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(`${message}: unexpected ${needle}`);
  }
}
