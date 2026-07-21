<div id="setup" class="setup-screen">
  <div class="setup-heptagram">
    <!-- Paley heptagram SVG injected by JS as background layer -->
    <div id="setupHeptagramSVG" class="setup-heptagram-svg"></div>

    <!-- Faction badges overlaid on heptagram nodes, injected by JS -->
    <div id="setupNodes" class="setup-nodes"></div>

    <!-- Central control panel (overlaid at heptagram center) -->
    <div class="setup-center">
      <button class="btn-gold setup-begin-btn" id="beginBtn" data-action="beginGame">Begin Interregnum</button>

      <div class="setup-mode-toggle">
        <button class="setup-mode-btn active" data-mode="7" data-action="setGameMode">7 Champions</button>
        <button class="setup-mode-btn" data-mode="3" data-action="setGameMode">3 Champions</button>
      </div>

      <div class="setup-center-row">
        <label class="setup-field">
          <span class="setup-label">Seed</span>
          <input id="seedInput" class="field-input" value="glut-17">
        </label>
      </div>

      <details class="setup-details">
        <summary class="setup-details-summary">Map Settings</summary>
        <div class="setup-details-body">
          <label class="setup-field">
            <span class="setup-label">Biome</span>
            <select id="biomeSelect" class="field-input"></select>
          </label>

          <label class="setup-field">
            <span class="setup-label">Size</span>
            <div class="setup-size-pills">
              <span class="size-pill" data-r="5" data-action="selectSize">S</span>
              <span class="size-pill" data-r="7" data-action="selectSize">M</span>
              <span class="size-pill active" data-r="9" data-action="selectSize">L</span>
              <span class="size-pill" data-r="13" data-action="selectSize">XL</span>
              <span class="size-pill" data-r="21" data-action="selectSize">XXL</span>
            </div>
          </label>

          <label class="setup-field">
            <span class="setup-label">Relic target</span>
            <input id="relicTarget" class="field-input small" type="number" min="5" max="50" value="25">
          </label>

          <label class="setup-field setup-check-row">
            <input type="checkbox" id="optLast" checked> Last Standing victory
          </label>

          <details class="setup-advanced-details">
            <summary>Terrain sliders</summary>
            <div class="setup-slider-row">
              <label>Height <span id="hvVal">1.0</span>x</label>
              <input type="range" id="hvSlider" min="0.5" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="setup-slider-row">
              <label>Water <span id="wtVal">1.0</span>x</label>
              <input type="range" id="wtSlider" min="0.0" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="setup-slider-row">
              <label>Mountains <span id="mtVal">1.0</span>x</label>
              <input type="range" id="mtSlider" min="0.0" max="2.0" step="0.1" value="1.0">
            </div>
          </details>
        </div>
      </details>
    </div>
  </div>
</div>
