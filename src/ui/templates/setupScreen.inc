<div id="setup" class="setup-screen">
  <div class="setup-card">
    <h1>Champions of the Supernal Interregnum</h1>
    <div class="setup-sub">An illuminated manuscript hex-crawl. Seven broken gods. One Paley paradox. — Codex v2 modular build</div>
    <div class="setup-grid">
      <div class="panel">
        <h4>World seed</h4>
        <input id="seedInput" class="field-input" value="glut-17">
        <div class="rel-fields">
          <h4>Map size</h4>
          <span class="size-pill" data-r="3" data-action="selectSize">Tiny</span>
          <span class="size-pill" data-r="5" data-action="selectSize">Small</span>
          <span class="size-pill" data-r="7" data-action="selectSize">Medium</span>
          <span class="size-pill active" data-r="9" data-action="selectSize">Large</span>
          <span class="size-pill" data-r="13" data-action="selectSize">Vast</span>
          <span class="size-pill" data-r="17" data-action="selectSize">Immense</span>
          <span class="size-pill" data-r="21" data-action="selectSize">Mythic</span>
        </div>
        <div class="rel-fields">
          <h4>Biome</h4>
          <select id="biomeSelect" class="field-input biome-select"></select>
        </div>
        <div class="setup-advanced">
          <label class="setup-advanced-toggle">
            <input type="checkbox" id="advToggle"> Advanced
          </label>
          <div class="setup-advanced-body" id="advBody">
            <div class="slider-row">
              <label>Height variation <span id="hvVal">1.0</span>x</label>
              <input type="range" id="hvSlider" min="0.5" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="slider-row">
              <label>Wateriness <span id="wtVal">1.0</span>x</label>
              <input type="range" id="wtSlider" min="0.0" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="slider-row">
              <label>Mountainousness <span id="mtVal">1.0</span>x</label>
              <input type="range" id="mtSlider" min="0.0" max="2.0" step="0.1" value="1.0">
            </div>
          </div>
        </div>
        <div class="setup-grid-row">
          <label>Relic target<br><input id="relicTarget" class="field-input small" type="number" min="5" max="50" value="25"></label>
          <label class="relic-label-row"><input type="checkbox" id="optLast" checked> Last Standing</label>
        </div>
        <p class="mini setup-mini">Seeded manuscript terrain: plains • forest • desert • marsh • mountains • broken water. Fog of War = visible / explored. Dig on empty parchment at night.</p>
      </div>
      <div class="panel">
        <h4>Choose your champions (2–7)</h4>
        <div id="factionList"></div>
        <div class="faction-actions">
          <div class="mini">Click a faction to toggle. Click Human/Bot to switch. Paley: i beats i+1,i+2,i+4.</div>
          <button class="btn-gold" id="beginBtn" data-action="beginGame">Begin Interregnum ▶</button>
        </div>
      </div>
    </div>
  </div>
</div>