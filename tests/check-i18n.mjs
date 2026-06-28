import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pages = ["index.html", "publications.html", "cv.html"];
const i18nKeys = new Set();
const scholarUrl = "https://scholar.google.com/citations?user=1XPQWKIAAAAJ&hl=en";

for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  assertIncludes(html, 'class="language-toggle"', `${page} exposes a visible language toggle`);
  assertIncludes(html, 'data-i18n="nav.about"', `${page} wires navigation labels to i18n keys`);
  assertIncludes(html, 'script src="assets/i18n.js', `${page} loads the language toggle script`);
  assertIncludes(html, `href="${scholarUrl}"`, `${page} links to Google Scholar`);
  assertDoesNotInclude(html, '<li class="profile-row profile-row-scholar">Google Scholar</li>', `${page} does not leave Scholar as plain text`);
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    i18nKeys.add(match[1]);
  }
  if (page === "cv.html" && /<\/li>\s*<ul class="cv-sublist">/.test(html)) {
    throw new Error("cv.html keeps nested education sublists inside their parent list items");
  }
  if (page === "index.html") {
    assertIncludes(
      html,
      "Exploring Position Encoding in Diffusion U-Net for Training-free High-resolution Image Generation",
      "homepage CV snapshot uses the full AAAI 2026 publication title",
    );
    assertIncludes(
      html,
      "Lifting by Image - Leveraging Image Cues for Accurate 3D Human Pose Estimation",
      "homepage CV snapshot uses the full AAAI 2024 publication title",
    );
    assertIncludes(
      html,
      "Image is All You Need to Empower Large-scale Diffusion Models for In-Domain Generation",
      "homepage CV snapshot uses the full CVPR 2025 publication title",
    );
    assertIncludes(
      html,
      "ResDiT: Evoking the Intrinsic Resolution Scalability in Diffusion Transformers",
      "homepage CV snapshot uses the full CVPR 2026 publication title",
    );
    assertDoesNotInclude(html, "<li>Lifting by Image, AAAI 2024.</li>", "homepage CV snapshot avoids shorthand publication titles");
    assertDoesNotInclude(html, "<li>ResDiT, CVPR 2026.</li>", "homepage CV snapshot avoids shorthand publication titles");
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

const styles = readFileSync(join(root, "styles.css"), "utf8");
assertIncludes(styles, "font-size: 17px;", "base font size is larger than the previous 16px baseline");
assertIncludes(styles, "font-size: 14px;", "sidebar small text is raised above the previous 12px baseline");
assertDoesNotInclude(styles, "font-size: 12px;", "stylesheet no longer uses tiny 12px text");

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
