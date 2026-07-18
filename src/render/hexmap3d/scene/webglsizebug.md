# WebGL Viewport Mismatch — Consolidated Investigation Guide

## Symptom

```
Canvas:  1513 × 873  (drawing buffer)
Viewport: 1513 × 874  (gl.VIEWPORT)
         -----------
Mismatch:   +0   +1   →  INVALID_VALUE deprecation
```

The viewport height is **1px taller than the canvas**, which is illegal per the WebGL spec (viewport must be ≤ drawing buffer).

---

## What's Ruled Out (Don't Chase These)

| Suspect | Verdict | Evidence |
|---------|---------|----------|
| **`renderer.setSize`** | ✅ Innocent | Monkey-patch shows it correctly computes `floor(logical × pixelRatio)`, sets viewport to logical dims, and viewport ≤ canvas after the call |
| **`renderer.setViewport` (Three.js wrapper)** | ✅ Innocent | Monkey-patch fires exactly once per `setSize` with correct logical dimensions. Never fires with the bad values. |
| **Fractional dimension rounding** | ✅ Fixed | `Math.round()` applied to `getBoundingClientRect()` values before calling `setSize`. |
| **`sceneContext.resize`** | ✅ Innocent | Logs show it fires *after* the mismatch already exists, and its values are correct. |
| **`effectsOverlay` / `updateCanvases`** | ✅ Innocent | Fires after the mismatch is already present. |
| **`pixelRatio` being > 2 or < 1** | ✅ Innocent | Value is 1.0909…, within normal browser-zoom range. |
| **Stale `gl` context reference** | ✅ Innocent | `renderer.getContext()` used consistently in diagnostics. |

---

## What's Known

### Timeline (from console logs)

1. **`setSize(1387, 801)` called** — pixelRatio 1.0909…, canvas becomes 1513×873 ✅
2. **`setViewport(0, 0, 1387, 801)` fires** — correct logical dimensions ✅
3. **`initScene` diagnostic reads `gl.VIEWPORT`** → **1513×874** ❌ (canvas is still 1513×873)

**The bad viewport write happens in the gap between steps 2 and 3 — before the first `renderer.render()` call.**

### Critical Detail: The +1

The bad viewport is `1513×874` — exactly `canvas.width × (canvas.height + 1)`.

If Three.js internal code were calling `gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)`, the result would be 1513×873. The **+1 on height** suggests either:

- Something computes `canvas.height + 1` (off-by-one bug in calling code)
- `canvas.height` itself changes between the `gl.viewport` call and the diagnostic read (unlikely, but possible if the browser asynchronously resizes the canvas)
- The call uses a **different pair of values** entirely (e.g., CSS client dimensions which could round differently)

### What's Bypassing Our Monkeys

The `renderer.setViewport` monkey-patch catches **zero** bad calls. The `renderer.setSize` monkey-patch catches none either. This means the bad call is either:

- **A raw `gl.viewport()` call** inside Three.js that bypasses the public API
- **A raw `gl.viewport()` call** in our own code (but grep found none)
- **The browser's own compositor/resize handling** touching the GL context directly (unlikely but possible with certain browser bugs)

---

## Remaining Suspects

| # | Suspect | Likelihood | Notes |
|---|---------|------------|-------|
| 1 | **Three.js internal `gl.viewport()` call** — e.g. during render target setup, scissor reset, or `renderer.render()` path | 🔴 High | The library has `gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)` in render-target reset code. But that would give 1513×873, not 874. Needs a stack trace. |
| 2 | **Three.js `setRenderTarget` / `setScissor`** — may internally set viewport to cached values that are stale or off-by-one | 🟡 Medium | Could explain the +1 if a cached viewport dimension is stale. |
| 3 | **Asynchronous canvas resize by the browser** — `canvas.height` changing between the `gl.viewport` call and our diagnostic read | 🟡 Medium | `requestAnimationFrame` can trigger layout/resize. The gap between steps 2 and 3 includes `appendChild(renderer.domElement)` and scene setup. |
| 4 | **WebGL context creation side-effect** — some browsers set a default viewport on context creation that differs from the initial canvas size | 🟢 Low | Would typically be 0×0 or canvas-sized, not canvas+1. |
| 5 | **A `gl.viewport` call in an imported module's static initializer** | 🟢 Low | Grep found no such calls in project code. |