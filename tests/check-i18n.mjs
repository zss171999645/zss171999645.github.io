import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pages = ["index.html", "cv.html"];
const i18nKeys = new Set();
const scholarUrl = "https://scholar.google.com/citations?user=1XPQWKIAAAAJ&hl=en";

const publicationsRedirect = readFileSync(join(root, "publications.html"), "utf8");
assertIncludes(publicationsRedirect, 'url=index.html#publications', "legacy publications page redirects to the homepage section");
assertIncludes(publicationsRedirect, 'href="index.html#publications"', "legacy publications page exposes a fallback homepage-section link");

for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  assertIncludes(html, '<html lang="zh-CN">', `${page} ships Chinese as the default document language`);
  assertIncludes(html, '<body data-page=', `${page} keeps page metadata on body`);
  assertIncludes(html, 'data-lang="zh"', `${page} marks Chinese as the default visible language`);
  assertIncludes(html, 'aria-label="Switch to English"', `${page} makes English the toggle target by default`);
  assertIncludes(html, 'class="language-toggle"', `${page} exposes a visible language toggle`);
  assertIncludes(html, 'data-i18n="nav.about"', `${page} wires navigation labels to i18n keys`);
  assertIncludes(html, 'data-i18n="nav.publications"', `${page} wires the publications navigation label to i18n keys`);
  assertIncludes(html, 'script src="assets/i18n.js', `${page} loads the language toggle script`);
  assertIncludes(html, `href="${scholarUrl}"`, `${page} links to Google Scholar`);
  assertIncludes(html, 'href="assets/Feng_Zhou_CV.pdf"', `${page} keeps the downloadable PDF CV link`);
  assertDoesNotInclude(html, 'href="publications.html"', `${page} does not route publications navigation to a separate page`);
  assertDoesNotInclude(html, 'href="cv.html"', `${page} removes the visible CV page entry`);
  assertDoesNotInclude(html, '<li class="profile-row profile-row-scholar">Google Scholar</li>', `${page} does not leave Scholar as plain text`);
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    i18nKeys.add(match[1]);
  }
  if (page === "cv.html" && /<\/li>\s*<ul class="cv-sublist">/.test(html)) {
    throw new Error("cv.html keeps nested education sublists inside their parent list items");
  }
  if (page === "index.html") {
    assertIncludes(html, 'href="#publications"', "homepage publications nav points to the local publications section");
    assertIncludes(html, 'id="publications"', "homepage has a publications anchor section");
    assertOrdered(html, ["research-overview-card", 'id="publications"'], "homepage places publications after research overview");
    assertIncludes(html, "<title>周峰 - 个人简介</title>", "homepage has Chinese default title");
    assertIncludes(html, "北京邮电大学博士研究生", "homepage static copy defaults to Chinese");
    assertIncludes(html, "三维世界模型", "homepage static copy includes Chinese research direction");
    assertIncludes(html, "影溯科技", "homepage static copy includes current InSpatio internship in Chinese");
    assertDoesNotInclude(html, 'data-i18n="home.intro.internship"', "homepage removes internship copy from the about bullet list");
    assertIncludes(html, 'class="content-card internship-card"', "homepage has a dedicated internship panel");
    assertIncludes(html, "实习经历", "homepage internship panel has a Chinese title");
    assertIncludes(html, "地平线机器人人才计划", "homepage internship panel includes the previous Horizon internship");
    assertOrdered(
      html,
      ["hero-card", "internship-card", "research-overview-card", 'id="publications"'],
      "homepage orders about, internship, research, and publications sections"
    );
    assertIncludes(html, "research-overview-card", "homepage includes a dedicated research overview section");
    assertIncludes(html, "研究内容", "homepage research overview has a Chinese section title");
    assertIncludes(html, "三维重建与基础模型", "homepage summarizes the 3D reconstruction research line");
    assertIncludes(html, "三维世界模型与空间智能", "homepage summarizes the 3D world model research line");
    assertIncludes(html, "可控生成与扩散模型", "homepage summarizes the generative-model research line");
    assertIncludes(html, "场景级三维 VAE", "homepage mentions the current scene-level 3D VAE work");
    assertIncludes(html, "AAAI 2026 Oral", "homepage lists the AAAI 2026 oral paper");
    assertIncludes(html, "ResDiT: Evoking the Intrinsic Resolution Scalability in Diffusion Transformers", "homepage lists ResDiT");
    assertIncludes(html, "OMEGAS: Object Mesh Extraction from Large Scenes Guided by Gaussian Segmentation", "homepage lists OMEGAS");
    assertIncludes(html, "Controllable Generation with Text-to-Image Diffusion Models: A Survey", "homepage lists the TPAMI survey");
    assertDoesNotInclude(html, "CV Snapshot", "homepage removes the CV snapshot panel");
    assertDoesNotInclude(html, "Open Full CV", "homepage removes the duplicate full-CV panel link");
    assertDoesNotInclude(html, 'id="cv-preview-title"', "homepage removes the CV preview heading");
    assertDoesNotInclude(html, 'class="preview-card"', "homepage removes the CV preview card");
    assertDoesNotInclude(html, 'class="snapshot-sections"', "homepage removes CV snapshot content sections");
    assertDoesNotInclude(html, 'class="snapshot-block"', "homepage removes CV snapshot content blocks");
  }
  if (page === "cv.html") {
    assertIncludes(html, 'href="index.html#publications"', "CV page publications nav points back to the homepage section");
  }
}

const script = readFileSync(join(root, "assets/i18n.js"), "utf8");
assertIncludes(script, 'const DEFAULT_LANG = "zh";', "script defaults first-time visitors to Chinese");
assertIncludes(script, 'value === "en" || value === "zh"', "script preserves explicit English language selections");
assertIncludes(script, "zhoufeng-homepage-language-v2", "script ignores stale English-first language preferences");
assertIncludes(script, "zh-CN", "script supports Chinese locale");
assertIncludes(script, "localStorage", "script persists language preference");
assertIncludes(script, "个人简介", "script contains Chinese homepage copy");
assertIncludes(script, "主要论文", "script contains Chinese publications copy");
assertIncludes(script, "Internship Experience", "script contains English internship panel copy");
assertIncludes(script, "实习经历", "script contains Chinese internship panel copy");
assertIncludes(script, "教育经历", "script contains Chinese CV copy");
assertIncludes(script, "InSpatio", "script contains the current InSpatio internship");
assertIncludes(script, "TOPOS1.0", "script contains the TOPOS1.0 internship work");
assertIncludes(script, "Research Overview", "script contains the English research overview title");
assertIncludes(script, "3D World Models and Spatial Intelligence", "script contains the English world-model research line");
assertIncludes(script, "场景级三维 VAE", "script contains the Chinese current 3D VAE research line");
assertIncludes(script, "Nov 2025 - May 2026", "script treats Horizon as a past internship");
assertDoesNotInclude(script, "Nov 2025 - Present: Talent Program Intern, Horizon Robotics", "script no longer treats Horizon as current");
assertDoesNotInclude(script, "2025 年 11 月至今：地平线", "Chinese copy no longer treats Horizon as current");

for (const key of i18nKeys) {
  assertIncludes(script, `"${key}":`, `${key} has a translation entry`);
}

const styles = readFileSync(join(root, "styles.css"), "utf8");
assertIncludes(styles, "--cjk:", "stylesheet defines a Chinese-focused font stack");
assertIncludes(styles, 'body[data-lang="zh"]', "stylesheet has Chinese-specific layout tuning");
assertIncludes(styles, 'body[data-lang="zh"] .hero-list li', "stylesheet adjusts Chinese homepage paragraph rhythm");
assertIncludes(styles, ".internship-card", "stylesheet defines the homepage internship panel");
assertIncludes(styles, ".internship-timeline", "stylesheet defines the homepage internship panel layout");
assertIncludes(styles, ".research-overview-list", "stylesheet defines homepage research overview layout");
assertIncludes(styles, "font-size: 17px;", "base font size is larger than the previous 16px baseline");
assertIncludes(styles, "font-size: 14px;", "sidebar small text is raised above the previous 12px baseline");
assertDoesNotInclude(styles, "font-size: 12px;", "stylesheet no longer uses tiny 12px text");
assertDoesNotInclude(styles, ".cv-window", "stylesheet no longer contains inner CV panel styles");
assertDoesNotInclude(styles, ".cv-scroll", "stylesheet no longer contains internal CV scrolling styles");
assertDoesNotInclude(styles, ".preview-card", "stylesheet no longer contains homepage CV preview card styles");
assertDoesNotInclude(styles, ".snapshot-sections", "stylesheet no longer contains CV snapshot section styles");
assertDoesNotInclude(styles, ".snapshot-block", "stylesheet no longer contains CV snapshot block styles");

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

function assertOrdered(haystack, needles, message) {
  let previous = -1;
  for (const needle of needles) {
    const index = haystack.indexOf(needle);
    if (index === -1) {
      throw new Error(`${message}: missing ${needle}`);
    }
    if (index <= previous) {
      throw new Error(`${message}: ${needle} is out of order`);
    }
    previous = index;
  }
}
