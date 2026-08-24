<div class="modal" id="optionsModal">
  <div class="modal-card options-card chamfer glint">
    <div class="modal-header-row">
      <h2 class="options-title">Options</h2>
      <span class="modal-round-label">Settings</span>
    </div>

    <section class="options-section">
      <h3 class="options-section-title">Graphics</h3>
      <label class="options-toggle-row">
        <span class="options-toggle-label">Shadows</span>
        <input type="checkbox" class="options-checkbox" id="optionsShadows" data-action="toggleShadows">
      </label>
      <label class="options-toggle-row">
        <span class="options-toggle-label">Fog &amp; Mist</span>
        <input type="checkbox" class="options-checkbox" id="optionsFogMist" data-action="toggleFogMist">
      </label>
      <label class="options-toggle-row">
        <span class="options-toggle-label">Selection Ring</span>
        <input type="checkbox" class="options-checkbox" id="optionsSelectionRing" data-action="toggleSelectionRing">
      </label>
      <label class="options-toggle-row">
        <span class="options-toggle-label">Feature Sparkles</span>
        <input type="checkbox" class="options-checkbox" id="optionsParticles" data-action="toggleParticles">
      </label>
      <label class="options-toggle-row">
        <span class="options-toggle-label">Charged Font Glow</span>
        <input type="checkbox" class="options-checkbox" id="optionsGlows" data-action="toggleGlows">
      </label>
    </section>

    <section class="options-section">
      <h3 class="options-section-title">Game Speed</h3>
      <p class="options-hint mini">Applies to bots, combat, and animation.</p>
      <div class="options-speed-row" id="optionsSpeedRow">
        <button class="btn options-speed-btn" data-action="setGameSpeed" data-speed="0.5">0.5×</button>
        <button class="btn options-speed-btn" data-action="setGameSpeed" data-speed="1">1×</button>
        <button class="btn options-speed-btn" data-action="setGameSpeed" data-speed="2">2×</button>
        <button class="btn options-speed-btn" data-action="setGameSpeed" data-speed="4">4×</button>
      </div>
    </section>

    <section class="options-section">
      <h3 class="options-section-title">Save</h3>
      <div class="options-speed-row">
        <button class="btn options-speed-btn" data-action="saveGame">Save Game</button>
        <button class="btn options-speed-btn" data-action="saveAndExitToSetup">Save &amp; Exit to Menu</button>
      </div>
    </section>

    <div class="modal-footer">
      <button class="btn-gold options-close-btn" data-action="optionsClose">Close</button>
    </div>
  </div>
</div>
