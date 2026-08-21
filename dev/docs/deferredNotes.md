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

### Conditional extracts (techDebtAudit §2 — only if these files grow)

- `src/devtools/performance/reportBuilder.js` (928) — extract `_formatReport`
  (~148 lines) → `reportFormatter.js` if it grows past ~1,000 lines
