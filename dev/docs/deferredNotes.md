# Deferred Notes & Non-Feature Follow-ups

Deferred-by-decision content and maintenance follow-ups — things that are
**not** specific new features (those live in `futureWork.md`). Feature/scale
balance items were moved to `futureWork.md` (2026-08-21); the large-map scale
guidance was resolved or moved to the "Scale / generation guardrails" section
there.

---

## Maintenance follow-ups (from techDebtAudit.md)

Consolidated here when the audit doc was retired (2026-08-11); the rest of that
document described completed work and now lives in git history. Only the open
items below remain.

### Out of scope (techDebtAudit §7)

- Root `styles/` (the game's CSS design system) — never audited at the same
  ~100-line level; a future pass could reuse the audit method.

The conditional extracts section is empty: `reportBuilder.js` was fully split
into `src/devtools/performance/report/` modules ahead of its growth trigger
(2026-08-21).
