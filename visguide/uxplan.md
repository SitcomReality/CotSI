# Layout Overhaul -- Implementation Plan

## Design Intent (synthesized from layoutidea.md, filtered through the styleguide)

**What we're building:** A three-zone chrome frame (top header bar, left/right sidebars, bottom log) that recedes into warm vellum and ink, leaving the hex-map miniature as the only saturated, vivid region on screen. The top bar becomes a pure gameplay HUD -- no branding, no version strings -- with a turn-order champion bar as its centerpiece. The sidebars get card-stock panels with crisp hierarchy. Map controls become marginalia. Everything obeys the Two-Layer Rule and the gold budget.

## Order of execution

The steps are designed to be followed in order, with each step producing a testable intermediate state:

1. **Audit** (confirm you know every wire)
2. **HTML shell** (new structure exists but looks broken until CSS/JS catch up)
3. **Header CSS** (header looks correct, sidebars still old)
4. **Header JS** (header is functional with champion bar)
5. **Left panel** (current player card is styled)
6. **Right panel** (Heptagram/weather/ledger styled)
7. **Log bar** (footer restyled)
8. **Map controls** (marginalia buttons)
9. **Game grid CSS** (entire layout snaps into final form)
10. **Orchestrator wiring** (all refresh paths work)
11. **Detail dropdown** (polish pass)
12. **Audit** (merge gate)