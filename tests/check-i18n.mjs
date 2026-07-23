import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const pages = ["index.html"];
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
  assertIncludes(html, 'data-i18n="nav.news"', `${page} wires the news navigation label to i18n keys`);
  assertIncludes(html, 'data-i18n="nav.publications"', `${page} wires the publications navigation label to i18n keys`);
  assertIncludes(html, 'script src="assets/i18n.js', `${page} loads the language toggle script`);
  assertIncludes(html, `href="${scholarUrl}"`, `${page} links to Google Scholar`);
  assertDoesNotInclude(html, 'href="assets/Feng_Zhou_CV.pdf"', `${page} does not expose the downloadable PDF CV link`);
  assertDoesNotInclude(html, 'href="publications.html"', `${page} does not route publications navigation to a separate page`);
  assertDoesNotInclude(html, 'href="cv.html"', `${page} removes the visible CV page entry`);
  assertDoesNotInclude(html, '<li class="profile-row profile-row-scholar">Google Scholar</li>', `${page} does not leave Scholar as plain text`);
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    i18nKeys.add(match[1]);
  }
  if (page === "index.html") {
    assertIncludes(html, 'href="#publications"', "homepage publications nav points to the local publications section");
    assertIncludes(html, 'href="#news"', "homepage news nav points to the local news section");
    assertIncludes(html, 'id="news"', "homepage has a news anchor section");
    assertIncludes(html, 'id="publications"', "homepage has a publications anchor section");
    assertOrdered(html, ["research-overview-card", 'id="news"', 'id="publications"'], "homepage places news between research overview and publications");
    assertIncludes(html, "<title>周峰 - 个人简介</title>", "homepage has Chinese default title");
    assertIncludes(html, "北京邮电大学博士研究生", "homepage static copy defaults to Chinese");
    assertIncludes(html, "拟 2027 年 6 月毕业", "homepage static education copy includes expected graduation time");
    assertIncludes(html, "研究方向：三维重建、三维世界模型、可控生成。", "homepage static copy uses concise three-term research direction");
    assertDoesNotInclude(html, "研究方向：三维重建、世界模型、可控生成。", "homepage avoids the underspecified world-model wording");
    assertDoesNotInclude(html, "研究方向聚焦三维重建基础模型、三维世界模型与可控视觉生成", "homepage sidebar no longer uses the long research-direction sentence");
    assertDoesNotInclude(html, "研究方向主要围绕三维视觉与生成模型", "homepage hero no longer uses the long research-direction sentence");
    assertDoesNotInclude(html, 'class="keyword-list"', "homepage removes the redundant research keyword chip list");
    assertDoesNotInclude(html, 'data-i18n="keyword.', "homepage does not render research keyword chips");
    assertIncludes(html, "影溯科技", "homepage static copy includes current InSpatio internship in Chinese");
    assertDoesNotInclude(html, 'data-i18n="home.intro.internship"', "homepage removes internship copy from the about bullet list");
    assertIncludes(html, 'class="content-card internship-card"', "homepage has a dedicated internship panel");
    assertIncludes(html, "实习经历", "homepage internship panel has a Chinese title");
    assertIncludes(html, "2026 年 6 月至今 · 影溯科技", "homepage InSpatio internship meta uses dates instead of current label");
    assertIncludes(html, "2025 年 11 月 - 2026 年 5 月 · 地平线机器人", "homepage Horizon internship meta uses dates instead of previous label");
    assertIncludes(html, "专项人才计划实习生 · 三维重建基础模型研发", "homepage Horizon internship title uses the requested wording");
    assertDoesNotInclude(html, "当前 · 影溯科技", "homepage does not label InSpatio as current in internship meta");
    assertDoesNotInclude(html, "此前 · 地平线", "homepage does not label Horizon as previous in internship meta");
    assertIncludes(html, "地平线机器人", "homepage internship panel includes the previous Horizon internship");
    assertOrdered(
      html,
      ["hero-card", "internship-card", "research-overview-card", "news-section", 'id="publications"'],
      "homepage orders about, internship, research, news, and publications sections"
    );
    assertIncludes(html, "research-overview-card", "homepage includes a dedicated research overview section");
    assertIncludes(html, "研究内容", "homepage research overview has a Chinese section title");
    assertIncludes(html, "三维重建与基础模型", "homepage summarizes the 3D reconstruction research line");
    assertIncludes(html, "三维世界模型与空间智能", "homepage summarizes the 3D world model research line");
    assertIncludes(html, "可控生成与扩散模型", "homepage summarizes the generative-model research line");
    assertIncludes(html, "场景级三维 VAE", "homepage mentions the current scene-level 3D VAE work");
    assertIncludes(html, "最新动态", "homepage includes a Chinese news section");
    assertIncludes(html, 'class="news-section"', "homepage uses a low-key standalone news section");
    assertDoesNotInclude(html, 'class="content-card news-card"', "homepage news section no longer uses the same card style as major sections");
    assertIncludes(html, "1 paper 被 SIGGRAPH Asia 2026 Conditional Accepted", "homepage news uses concise SIGGRAPH Asia 2026 conditional-accept wording");
    assertIncludes(html, "1 paper 被 ICME 2026 接收", "homepage news uses concise ICME 2026 wording");
    assertIncludes(html, "1 paper 被 AAAI 2026 接收", "homepage news uses concise AAAI 2026 wording");
    assertIncludes(html, "1 paper 被 CVPR 2026 接收", "homepage news uses concise CVPR 2026 wording");
    assertIncludes(html, "1 paper 被 CVPR 2025 接收", "homepage news uses concise CVPR 2025 wording");
    assertIncludes(html, "1 paper 被 IEEE TCSVT 2025 接收", "homepage news uses concise IEEE TCSVT 2025 wording");
    assertIncludes(html, "1 paper 被 IEEE TPAMI 2025 接收", "homepage news uses concise IEEE TPAMI 2025 wording");
    assertIncludes(html, "1 paper 被 AAAI 2024 接收", "homepage news uses concise AAAI 2024 wording");
    assertIncludes(html, "07/2026", "homepage news includes a month for SIGGRAPH Asia 2026");
    assertIncludes(html, "03/2026", "homepage news includes a month for ICME 2026");
    assertIncludes(html, "02/2026", "homepage news includes a month for CVPR 2026");
    assertIncludes(html, "11/2025", "homepage news includes a month for AAAI 2026");
    assertIncludes(html, "08/2025", "homepage news includes a month for TPAMI 2025");
    assertIncludes(html, "05/2025", "homepage news includes a month for TCSVT 2025");
    assertIncludes(html, "02/2025", "homepage news includes a month for CVPR 2025");
    assertIncludes(html, "02/2024", "homepage news includes a month for AAAI 2024");
    assertDoesNotInclude(html, "Survey 被 IEEE TPAMI 2025 接收", "homepage news does not call the IEEE TPAMI paper a survey");
    assertDoesNotInclude(html, "Exploring Position Encoding in Diffusion U-Net。", "homepage news omits paper titles");
    assertDoesNotInclude(html, "ResDiT 被 CVPR 2026 接收", "homepage news omits paper titles");
    assertIncludes(html, "AAAI 2026 Oral", "homepage lists the AAAI 2026 oral paper");
    assertIncludes(html, "IEEE TCSVT 2025", "homepage labels the TCSVT publication with IEEE");
    assertIncludes(html, "IEEE TPAMI 2025", "homepage labels the TPAMI publication with IEEE");
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
}

const script = readFileSync(join(root, "assets/i18n.js"), "utf8");
assertIncludes(script, 'const DEFAULT_LANG = "zh";', "script defaults first-time visitors to Chinese");
assertIncludes(script, 'value === "en" || value === "zh"', "script preserves explicit English language selections");
assertIncludes(script, "zhoufeng-homepage-language-v2", "script ignores stale English-first language preferences");
assertIncludes(script, "zh-CN", "script supports Chinese locale");
assertIncludes(script, "localStorage", "script persists language preference");
assertDoesNotInclude(script, '"nav.cv"', "script removes CV navigation copy");
assertDoesNotInclude(script, '"profile.cv"', "script removes CV profile-link copy");
assertDoesNotInclude(script, '"profile.pdfCv"', "script removes PDF CV profile-link copy");
assertIncludes(script, "个人简介", "script contains Chinese homepage copy");
assertIncludes(script, "expected to graduate in June 2027", "script contains English homepage graduation timing");
assertIncludes(script, "拟 2027 年 6 月毕业", "script contains Chinese homepage graduation timing");
assertIncludes(script, "三维重建、三维世界模型、可控生成", "script contains concise Chinese research direction");
assertIncludes(script, "3D reconstruction, 3D world models, and controllable generation", "script contains concise English research direction");
assertDoesNotInclude(script, "3D reconstruction, world models, and controllable generation", "script avoids the underspecified English world-model wording");
assertDoesNotInclude(script, "My research interests lie at the intersection of 3D vision and generative models", "script no longer uses the long English research-direction sentence");
assertDoesNotInclude(script, '"keyword.3dFoundation"', "script removes stale keyword-chip translations");
assertDoesNotInclude(script, '"keyword.diffusion"', "script removes stale keyword-chip translations");
assertIncludes(script, "主要论文", "script contains Chinese publications copy");
assertIncludes(script, "News", "script contains English news copy");
assertIncludes(script, "最新动态", "script contains Chinese news copy");
assertIncludes(script, "1 paper accepted to CVPR 2026", "script contains concise English CVPR 2026 news copy");
assertIncludes(script, "1 paper conditionally accepted to SIGGRAPH Asia 2026", "script contains concise English SIGGRAPH Asia 2026 news copy");
assertIncludes(script, "1 paper accepted to ICME 2026", "script contains concise English ICME 2026 news copy");
assertIncludes(script, "1 paper 被 AAAI 2024 接收", "script contains concise Chinese AAAI 2024 news copy");
assertIncludes(script, "07/2026", "script contains SIGGRAPH Asia 2026 news month");
assertIncludes(script, "03/2026", "script contains ICME 2026 news month");
assertIncludes(script, "02/2026", "script contains CVPR 2026 news month");
assertIncludes(script, "11/2025", "script contains AAAI 2026 news month");
assertDoesNotInclude(script, "The controllable-generation survey accepted to IEEE TPAMI 2025", "script does not call the IEEE TPAMI news item a survey");
assertIncludes(script, "Internship Experience", "script contains English internship panel copy");
assertIncludes(script, "实习经历", "script contains Chinese internship panel copy");
assertIncludes(script, "Jun 2026 - Present · InSpatio", "script contains dated English InSpatio internship meta");
assertIncludes(script, "2026 年 6 月至今 · 影溯科技", "script contains dated Chinese InSpatio internship meta");
assertIncludes(script, "Special Talent Program Intern · 3D Reconstruction Foundation Model R&D", "script contains requested English Horizon internship title");
assertIncludes(script, "专项人才计划实习生 · 三维重建基础模型研发", "script contains requested Chinese Horizon internship title");
assertDoesNotInclude(script, "Current · InSpatio", "script does not label InSpatio as current in homepage internship meta");
assertDoesNotInclude(script, "Previous · Horizon Robotics Talent Program", "script does not label Horizon as previous in homepage internship meta");
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
assertIncludes(styles, ".news-list", "stylesheet defines homepage news list layout");
assertIncludes(styles, ".news-date", "stylesheet defines homepage news date labels");
assertDoesNotInclude(styles, ".news-card", "stylesheet no longer styles news as a major card");
assertDoesNotInclude(styles, ".news-year", "stylesheet removes the large year-label news layout");
assertDoesNotInclude(styles, ".keyword-list", "stylesheet removes the redundant keyword chip styles");
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

function assertMatchCount(haystack, pattern, expected, message) {
  const count = (haystack.match(pattern) || []).length;
  if (count !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${count}`);
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
