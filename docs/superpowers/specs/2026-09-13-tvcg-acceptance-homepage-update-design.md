# TVCG Acceptance Homepage Update

## Goal

Update Feng Zhou's academic homepage to reflect the acceptance of "Initialize to Generalize: A Stronger Initialization Pipeline for Sparse-View 3DGS" as a regular paper in IEEE Transactions on Visualization and Computer Graphics (TVCG).

## Scope

- Add a September 2026 News entry announcing one accepted TVCG paper.
- Add the paper to the Publications section among the 2026 papers.
- Use the existing publication-card structure and visual style.
- Include the confirmed title and author list already used in the resume.
- Mark the venue as `IEEE TVCG 2026` without a revision qualifier.
- Do not expose a paper or project link until a public version is available.
- Add a real thumbnail derived from an existing local paper asset when available.
- Update the site contract tests for the new news date, publication, author line, venue, card count, and no-link rule.

## Placement

- News: first item, dated `09/2026`, ahead of the July 2026 entry.
- Publications: after GeoWeave and before ResDiT, keeping the most recent 2026 3D publications near the top.

## Verification

- Run the repository site-contract test.
- Render and inspect the homepage at desktop and mobile widths.
- Confirm all local assets resolve and the TVCG card contains no link.
- Commit and push the completed update to the GitHub Pages repository.
