<div class="modal" id="combatModal">
  <div class="modal-card">
    <div class="fx-layer"></div>
    <div class="modal-header-row">
      <h2>Supernal Duel — Paley Weave</h2>
      <div class="modal-round-label" id="combatRoundLabel">Round 1</div>
    </div>
    <div class="combat-arena">
      <div class="combatant" id="leftCombat"></div>
      <div class="vs-cell">
        <div class="vs-text">VS</div>
        <div class="combat-order" id="combatOrder">Order …</div>
        <div class="awaiting-prompt" id="awaitingPrompt"></div>
      </div>
      <div class="combatant" id="rightCombat"></div>
    </div>
    <div class="combat-actions">
      <div class="play-slots">
        <div class="play-slot" id="sA1">Pick 1</div>
        <div class="play-slot" id="sA2">Pick 2</div>
        <div class="play-arrow">→</div>
        <div class="play-slot" id="sB1">???</div>
        <div class="play-slot" id="sB2">???</div>
      </div>
      <div class="score-bar">
        <span>Score <span class="cs-big" id="csLeft">—</span></span>
        <span><span class="cs-big" id="csRight">—</span> Score</span>
      </div>
      <div class="combat-log-area mini" id="combatLog"></div>
      <div class="combat-buttons">
        <button class="btn" id="fleeCombat" data-action="fleeCombat">Flee</button>
      </div>
    </div>
  </div>
</div>