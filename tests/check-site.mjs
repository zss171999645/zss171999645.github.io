import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
const stylesheetPath = resolve(root, "stylesheet.css");

assert.ok(existsSync(indexPath), "index.html is missing");
assert.ok(existsSync(stylesheetPath), "stylesheet.css is missing");
assert.ok(existsSync(resolve(root, "CNAME")), "Production CNAME is missing");
assert.equal(readFileSync(resolve(root, "CNAME"), "utf8").trim(), "zhoufeng.ai", "Production CNAME is incorrect");

const html = readFileSync(indexPath, "utf8");
const css = readFileSync(stylesheetPath, "utf8");

const requiredSections = ["about", "news", "research", "experience", "publications"];
const requiredResearch = ["3D Reconstruction", "3D World Models", "Controllable Generation"];
const requiredVenues = [
  "AAAI 2026",
  "SIGGRAPH Asia 2026",
  "CVPR 2026",
  "CVPR 2025",
  "IEEE TCSVT 2025",
  "IEEE TPAMI 2025",
  "AAAI 2024",
];
const requiredFacts = [
  "expected to graduate in June 2027",
  "zhoufeng@bupt.edu.cn",
  "Jun 2026 - Present",
  "Nov 2025",
  "May 2026",
  "TOPOS1.0",
  "full-scene point-cloud alignment",
  "native 3D scene generation",
  "flow-matching",
  "07/2026",
  "03/2026",
];
const publicationTitles = [
  "Exploring Position Encoding in Diffusion U-Net for Training-free High-resolution Image Generation",
  "GeoWeave: Learning Reliable Cross-View Dependencies for Feed-Forward 3D Reconstruction",
  "ResDiT: Evoking the Intrinsic Resolution Scalability in Diffusion Transformers",
  "Image is All You Need to Empower Large-scale Diffusion Models for In-Domain Generation",
  "OMEGAS: Object Mesh Extraction from Large Scenes Guided by Gaussian Segmentation",
  "Controllable Generation with Text-to-Image Diffusion Models: A Survey",
  "Lifting by Image - Leveraging Image Cues for Accurate 3D Human Pose Estimation",
];
const publicationSlugs = ["position-encoding", "geoweave", "resdit", "image-is-all-you-need", "omegas", "controllable-generation-survey", "lifting-by-image"];
const requiredAuthorLines = [
  "Feng Zhou*</strong>, Pu Cao*, Yiyang Ma, Lu Yang, Yonghao Dang, Jianqin Yin",
  "Feng Zhou</strong>, Qingfeng Li, Jianqin Yin, Weiqiang Ren, Qian Zhang",
  "Yiyang Ma*, <strong>Feng Zhou*</strong>, Pu Cao, Yonghao Dang, Jianqin Yin",
  "Pu Cao*, <strong>Feng Zhou*</strong>, Lu Yang, Tianrui Huang, Qing Song",
  "Lizhi Wang*, <strong>Feng Zhou*</strong>, Bo Yu, Pu Cao, Jianqin Yin",
  "Pu Cao, <strong>Feng Zhou</strong>, Qing Song, Lu Yang",
  "Feng Zhou</strong>, Jianqin Yin, Peiyang Li",
];

for (const section of requiredSections) {
  assert.match(html, new RegExp(`id=["']${section}["']`), `Missing #${section} section`);
  assert.match(html, new RegExp(`href=["']#${section}["']`), `Missing #${section} navigation link`);
}

for (const topic of requiredResearch) {
  assert.ok(html.includes(topic), `Missing research direction: ${topic}`);
}

for (const venue of requiredVenues) {
  assert.ok(html.includes(venue), `Missing venue: ${venue}`);
}

for (const fact of requiredFacts) {
  assert.ok(html.includes(fact), `Missing profile fact: ${fact}`);
}

assert.match(
  html,
  /https:\/\/scholar\.google\.com\/citations\?user=1XPQWKIAAAAJ(?:&amp;|&)hl=en/,
  "Google Scholar link is missing or incorrect",
);

const newsDates = ["07/2026", "03/2026", "02/2026", "11/2025", "08/2025", "05/2025", "02/2025", "02/2024"];
let previousNewsOffset = -1;
for (const date of newsDates) {
  const offset = html.indexOf(date, previousNewsOffset + 1);
  assert.ok(offset > previousNewsOffset, `News date is missing or out of order: ${date}`);
  previousNewsOffset = offset;
}

assert.doesNotMatch(html, /panoramic-image|scene-level 3D VAE latent-space design/i, "Outdated InSpatio description remains");

let previousPublicationOffset = -1;
for (const title of publicationTitles) {
  const offset = html.indexOf(title, previousPublicationOffset + 1);
  assert.ok(offset > previousPublicationOffset, `Publication is missing or out of order: ${title}`);
  previousPublicationOffset = offset;
}

for (const slug of publicationSlugs) {
  assert.match(html, new RegExp(`data-publication=["']${slug}["']`), `Missing publication identifier: ${slug}`);
}

assert.equal((html.match(/<img\s+src=["']assets\/publications\//g) ?? []).length, 7, "Every publication must have a real figure thumbnail");
assert.doesNotMatch(html, /publication-placeholder/, "Publication text placeholders must not remain");

for (const authorLine of requiredAuthorLines) {
  assert.ok(html.includes(authorLine), `Publication author line is missing or changed: ${authorLine}`);
}

assert.equal((html.match(/class=["'][^"']*publication-entry(?:\s|["'])/g) ?? []).length, 7, "Expected exactly seven publication entries");

const geoweaveEntry = html.match(/<article[^>]*data-publication=["']geoweave["'][^>]*>([\s\S]*?)<\/article>/i);
assert.ok(geoweaveEntry, "GeoWeave publication entry is missing");
assert.doesNotMatch(geoweaveEntry[1], /<a\b/i, "GeoWeave must not expose a paper or project link before it is public");
assert.match(geoweaveEntry[1], /SIGGRAPH Asia 2026 · Conditional Accept/, "GeoWeave acceptance status is incorrect");

const tpamiEntry = html.match(/<article[^>]*data-publication=["']controllable-generation-survey["'][^>]*>([\s\S]*?)<\/article>/i);
assert.ok(tpamiEntry, "IEEE TPAMI publication entry is missing");
assert.match(tpamiEntry[1], /href=["']https:\/\/arxiv\.org\/pdf\/2403\.04279["']/, "IEEE TPAMI paper link is missing or incorrect");
assert.match(tpamiEntry[1], /class=["']publication-links["'][^>]*>[\s\S]*?>Paper<\/a>/, "IEEE TPAMI Paper action is missing");

assert.doesNotMatch(html, />\s*CV\s*</i, "Visible CV links are not allowed in this preview");
assert.doesNotMatch(html, /language[-_ ]?(toggle|switch)|data-lang|>\s*中文\s*</i, "Language controls are not allowed in the English preview");
assert.doesNotMatch(html, /<footer\b|Adapted from the|© 2026 Feng Zhou/i, "Footer credits must not be visible");
assert.doesNotMatch(html, /github\.com\/zss171999645|>\s*GitHub\s*</i, "Personal GitHub link must not be visible");
assert.doesNotMatch(html, /Alex Morgan|fictional|replace with your|sample content/i, "Template sample content remains in index.html");
assert.doesNotMatch(css, /cursor\.png|cursor-pointer\.png/i, "Template novelty cursors must not be included");

const localReferences = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("#"))
  .filter((reference) => !/^(?:https?:|mailto:|tel:)/.test(reference));

for (const reference of localReferences) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  assert.ok(existsSync(resolve(root, cleanReference)), `Missing local resource: ${reference}`);
}

console.log(`Site contract passed (${requiredSections.length} sections, ${requiredFacts.length} profile facts, ${localReferences.length} local resources).`);
