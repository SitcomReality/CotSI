<div id="game" class="layout-root">

  <!-- New semantic header: three slots + detail dropdown -->
  <header id="gameHeader" class="header-panel">
    <div class="header-panel__world">
      <!-- Day/Week/Weather (JS-injected) -->
    </div>
    <div class="header-panel__champions">
      <!-- turn-order champion bar (JS-injected) -->
    </div>
    <div class="header-panel__actions">
      <button class="btn-icon header-panel__inspect-btn" id="inspectBtn" data-action="inspect" title="Inspect champion">🔍</button>
    </div>
    <div id="championDetail" class="champion-detail">
      <!-- expandable detail dropdown (repositioned by JS) -->
    </div>
    <div id="botIndicator" class="bot-indicator"></div>
  </header>

  <!-- Map area: map-hud removed, controls moved inside mapMount -->
  <section class="mapwrap">
    <div id="championHud" class="champion-hud">
      <div id="championCard">
        <div class="panel left-champion-card">
          <!-- Header row -->
          <div class="left-champ-header">
            <span class="left-faction-dot"></span>
            <span class="left-champ-name" data-ui="name">—</span>
            <span class="left-champ-moves">
              <svg width="12" height="12"><use href="assets/icons/sprite.svg#i-move"/></svg>
              <span data-ui="moves">—</span>
            </span>
          </div>

          <!-- HP row -->
          <div class="left-hp-row">
            <span class="left-hp-label">HP</span>
            <span class="left-hp-track"><span class="left-hp-fill"></span></span>
            <span class="left-hp-value" data-ui="hpValue">—</span>
          </div>

          <!-- Resources row -->
          <div class="left-resources-row">
            <span class="left-res-item">
              <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-relic"/></svg>
              <span data-ui="relics">—</span> Relics
            </span>
            <span class="left-res-item">
              <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-gold"/></svg>
              <span data-ui="gold">—</span> Gold
            </span>
            <span class="left-res-item">
              <svg width="14" height="14"><use href="assets/icons/sprite.svg#d-knot"/></svg>
              <span data-ui="knot">—</span> Knots
            </span>
          </div>

          <!-- Equipment row -->
          <div class="left-equip-row">
            <span class="left-equip-item">
              <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-weapon"/></svg>
              <span data-ui="weapon">—</span>
            </span>
            <span class="left-equip-item">
              <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-armor"/></svg>
              <span data-ui="armor">—</span>
            </span>
            <span class="left-equip-artifact">
              Artifact: <span data-ui="artifact">—</span>
            </span>
          </div>

          <!-- Potency accordion -->
          <details class="left-potency-details">
            <summary class="left-potency-summary">
              Potency <span class="left-potency-arrow">▶</span>
            </summary>
            <div class="left-potency-bars">
              <!-- rebuilt by bindLeftPanel via replaceChildren() -->
            </div>
          </details>

          <!-- Action buttons -->
          <div class="left-actions-row">
            <button class="btn left-inspect-btn" data-action="inspect">Inspect</button>
            <button class="btn btn-gold left-endturn-btn" data-action="endTurn">End Turn</button>
          </div>
        </div>
      </div>
      <div class="map-controls">
        <span id="hudZoom" class="map-zoom-indicator">100%</span>
        <button class="btn map-btn" id="zoomIn" data-action="zoomIn" title="Zoom In (Mouse Wheel)">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons/sprite.svg#i-zoomin"/></svg>
        </button>
        <button class="btn map-btn" id="zoomOut" data-action="zoomOut" title="Zoom Out (Mouse Wheel)">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons/sprite.svg#i-zoomout"/></svg>
        </button>
        <button class="btn map-btn" id="zoomReset" data-action="resetCamera" title="Reset View">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons/sprite.svg#i-center"/></svg>
        </button>
        <button class="btn map-btn" id="centerChampion" data-action="centerChampion" title="Center on Champion (C)">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="assets/icons/sprite.svg#d-seal"/></svg>
        </button>
      </div>
    </div>
    <div id="mapMount">
    </div>
  </section>

  <!-- Right sidebar: renamed id -->
  <aside class="rightbar" id="rightPanel">
    <div class="panel rt-heptagram-card">
      <h4>Paley Heptagram</h4>
      <div id="paleyMount" class="rt-heptagram-svg"></div>
      <div class="rt-heptagram-hint">i → i+1, i+2, i+4</div>
    </div>

    <div class="panel rt-log-panel">
      <h4>Event Log</h4>
      <div class="rt-log-entries">
        <!-- rebuilt by bindRightPanel: shows main log (rich view) by default;
             toggling Log History replaces it with the text-only overflow. -->
      </div>
    </div>
  </aside>
</div>