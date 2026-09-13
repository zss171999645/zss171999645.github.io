# TVCG Acceptance Homepage Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the TVCG acceptance consistently across the homepage News and Publications sections.

**Architecture:** Keep the existing static HTML structure and publication-card conventions. Extend the contract test first, then add one locally generated publication thumbnail and one unlinked publication entry because no public paper URL is available yet.

**Tech Stack:** Static HTML/CSS, Node.js contract tests, Poppler image extraction, GitHub Pages.

---

### Task 1: Extend the site contract

**Files:**
- Modify: `tests/check-site.mjs`

- [ ] **Step 1: Add failing assertions**

Add `IEEE TVCG 2026` to `requiredVenues`, `09/2026` to `requiredFacts` and the ordered News dates, the full TVCG title to `publicationTitles`, `initialize-to-generalize` to `publicationSlugs`, and the confirmed author line to `requiredAuthorLines`. Change the expected publication thumbnail and card counts from seven to eight. Add an entry-level assertion that the TVCG card contains `IEEE TVCG 2026` and no anchor before a public version exists.

- [ ] **Step 2: Verify the contract fails**

Run:

```bash
node tests/check-site.mjs
```

Expected: failure identifying the missing TVCG homepage content.

### Task 2: Add the TVCG publication asset and content

**Files:**
- Create: `assets/publications/tvcg-2026-initialize-to-generalize.png`
- Modify: `index.html`

- [ ] **Step 1: Generate a real thumbnail**

Use the accepted manuscript at `/Users/zhoufeng/COST/works/TVCG/minor_revision_R3_2026-08-27/clean_manuscript/tvcg.pdf` to extract or render a representative method figure, then crop and resize it consistently with the existing publication thumbnails.

- [ ] **Step 2: Add the News item**

Insert this first in `.news-list`:

```html
<li><time datetime="2026-09">09/2026</time><span>One paper was accepted to <strong>IEEE TVCG</strong>.</span></li>
```

- [ ] **Step 3: Add the publication card**

Insert after GeoWeave and before ResDiT:

```html
<article class="publication-entry" data-publication="initialize-to-generalize">
  <div class="publication-visual">
    <img src="assets/publications/tvcg-2026-initialize-to-generalize.png" alt="Initialize to Generalize sparse-view 3DGS initialization pipeline">
  </div>
  <div class="publication-copy">
    <h3>Initialize to Generalize: A Stronger Initialization Pipeline for Sparse-View 3DGS</h3>
    <p class="authors"><strong>Feng Zhou*</strong>, Wenkai Guo*, Pu Cao, Zhicheng Zhang, Jianqin Yin</p>
    <p class="venue">IEEE TVCG 2026</p>
    <p>Improves sparse-view 3DGS through stronger structure-aware initialization and point-cloud consistency filtering for stable novel-view synthesis and geometry.</p>
  </div>
</article>
```

Do not add a paper or project link.

- [ ] **Step 4: Verify the contract passes**

Run:

```bash
node tests/check-site.mjs
```

Expected: `Site contract passed` with eight publication entries.

### Task 3: Validate and publish

**Files:**
- Verify: `index.html`
- Verify: `stylesheet.css`
- Verify: `assets/publications/tvcg-2026-initialize-to-generalize.png`

- [ ] **Step 1: Render desktop and mobile previews**

Serve the repository locally and capture the Publications section at desktop and mobile widths. Confirm the thumbnail is legible, the card spacing matches neighboring entries, text does not overlap, and the September News item appears first.

- [ ] **Step 2: Run final repository checks**

Run:

```bash
node tests/check-site.mjs
git diff --check
git status --short
```

Expected: passing contract, no whitespace errors, and only the planned homepage, test, and thumbnail changes.

- [ ] **Step 3: Commit the implementation**

```bash
git add index.html tests/check-site.mjs assets/publications/tvcg-2026-initialize-to-generalize.png
git commit -m "feat: add TVCG acceptance to homepage"
```

- [ ] **Step 4: Push to GitHub Pages**

```bash
git push origin main
```

Expected: the push succeeds and `https://zhoufeng.ai` serves the updated News and Publications content after deployment.
