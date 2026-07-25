<div id="setup" class="setup-screen">
  <div class="setup-main">

    <!-- ===== Left column: faction roster ===== -->
    <div class="setup-roster">
      <div class="setup-mode-toggle">
        <button class="setup-mode-btn active" data-mode="7" data-action="setGameMode">7 Champions</button>
        <button class="setup-mode-btn" data-mode="3" data-action="setGameMode">3 Champions</button>
      </div>

      <!-- Faction cards injected by JS -->
      <div id="setupRoster" class="setup-roster-grid"></div>
    </div>

    <!-- ===== Right column: control panel ===== -->
    <div class="setup-panel">
      <button class="btn-gold setup-begin-btn" data-action="beginGame">Exist</button>

      <div class="setup-panel-fields">

        <!-- Seed -->
        <label class="setup-field">
          <span class="setup-label">Seed</span>
          <div class="setup-seed-row">
            <input id="seedInput" class="field-input" value="glut-17">
            <button class="setup-rand-btn" data-action="randomizeSeed" title="Randomize seed">&#8635;</button>
          </div>
        </label>

        <!-- Map Radius -->
        <label class="setup-field">
          <span class="setup-label">Map Radius</span>
          <input id="mapRadius" class="field-input" type="number" min="3" max="99" value="21">
        </label>

        <!-- Relic Target -->
        <label class="setup-field">
          <span class="setup-label">Relic target</span>
          <input id="relicTarget" class="field-input" type="number" min="5" max="50" value="25">
        </label>

        <!-- Last Standing -->
        <label class="setup-field setup-check-row">
          <input type="checkbox" id="optLast" checked> Last Standing victory
        </label>

        <!-- Advanced: terrain + biome (collapsed by default) -->
        <details class="setup-advanced">
          <summary>Terrain &amp; Biome</summary>
          <div class="setup-advanced-body">
            <label class="setup-field">
              <span class="setup-label">Biome</span>
              <select id="biomeSelect" class="field-input"></select>
            </label>

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
          </div>
        </details>

      </div>
    </div>

  </div>
</div>
