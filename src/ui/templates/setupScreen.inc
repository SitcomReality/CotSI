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
      <button id="continueBtn" class="btn-gold setup-begin-btn" data-action="continueSavedGame" hidden>Continue</button>
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
        <div class="setup-radius-presets">
          <button class="setup-preset-btn" data-action="setMapRadius" data-radius="7">Sudden Death (7)</button>
          <button class="setup-preset-btn" data-action="setMapRadius" data-radius="21">Small (21)</button>
          <button class="setup-preset-btn" data-action="setMapRadius" data-radius="35">Medium (35)</button>
          <button class="setup-preset-btn" data-action="setMapRadius" data-radius="77">Massive (77)</button>
        </div>

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
          </div>
        </details>

      </div>
    </div>

  </div>
</div>
