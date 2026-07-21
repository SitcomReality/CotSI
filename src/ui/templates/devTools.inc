<div id="devToolsPanel" class="devtools">
  <div class="devtools__header">
    <span class="devtools__title">Dev Tools</span>
    <span class="devtools__hint">` to toggle</span>
  </div>
  <div class="devtools__tabs" id="devToolsTabs">
    <button class="devtools__tab is-active" data-devtab="cheats">Cheats</button>
    <button class="devtools__tab" data-devtab="perf">Performance</button>
    <button class="devtools__tab" data-devtab="bot">Bot Control</button>
  </div>
  <div class="devtools__bodies" id="devToolsBodies">
    <!-- Cheats tab -->
    <div class="devtools__body is-active" id="devBodyCheats">
      <div class="devtools__section">
        <div class="devtools__section-title">Resources</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn" data-action="dev:cheat:gold10">+10 Gold</button>
          <button class="devtools__btn" data-action="dev:cheat:hp50">+50 HP</button>
          <button class="devtools__btn" data-action="dev:cheat:hpFull">Full HP</button>
          <button class="devtools__btn" data-action="dev:cheat:relic1">+1 Relic</button>
          <button class="devtools__btn" data-action="dev:cheat:knot5">+5 Knots</button>
          <button class="devtools__btn" data-action="dev:cheat:potencyAll">+3 All Potency</button>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Movement</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn" data-action="dev:cheat:fillMoves">Fill Moves</button>
          <button class="devtools__btn devtools__btn--toggle" data-action="dev:cheat:teleport" id="devTeleportBtn">Teleport Mode: OFF</button>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Combat</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn" data-action="dev:cheat:combatDamage" id="devCombatDmgBtn">Deal 20 Damage</button>
          <button class="devtools__btn" data-action="dev:cheat:combatWin">Instant Win</button>
        </div>
        <div class="devtools__field">
          <label class="devtools__label">Damage amount:</label>
          <input class="devtools__input" id="devCombatDmgInput" type="number" value="20" min="1" max="999" />
        </div>
      </div>
    </div>

    <!-- Performance tab -->
    <div class="devtools__body" id="devBodyPerf">
      <div class="devtools__section">
        <div class="devtools__section-title">Display</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn devtools__btn--toggle" data-action="dev:perf:toggleOverlay" id="devPerfOverlayBtn">Live Overlay: OFF</button>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Measurements</div>
        <div id="devPerfMeasurements">
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:refreshAll">
              <input type="checkbox" checked />
              refreshAll
            </label>
            <span class="devtools__perf-val" id="devPerfRefreshAll">—</span>
          </div>
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:mapRefresh">
              <input type="checkbox" />
              mapRefresh
            </label>
            <span class="devtools__perf-val" id="devPerfMapRefresh">—</span>
          </div>
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:runBot">
              <input type="checkbox" />
              runBot
            </label>
            <span class="devtools__perf-val" id="devPerfRunBot">—</span>
          </div>
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:combatFlow">
              <input type="checkbox" />
              combatFlow
            </label>
            <span class="devtools__perf-val" id="devPerfCombatFlow">—</span>
          </div>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Stats</div>
        <div class="devtools__stat-row">
          <span class="devtools__stat">FPS: <strong id="devPerfFps">—</strong></span>
          <span class="devtools__stat">Frame: <strong id="devPerfFrameTime">—</strong>ms</span>
        </div>
      </div>
    </div>

    <!-- Bot Control tab -->
    <div class="devtools__body" id="devBodyBot">
      <div class="devtools__section">
        <div class="devtools__section-title">Controller Override</div>
        <div id="devBotChampList">
          <!-- populated by JS -->
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Turn Execution</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn devtools__btn--toggle" data-action="dev:bot:stepMode" id="devBotStepBtn">Step Mode: OFF</button>
          <button class="devtools__btn" data-action="dev:bot:stepOnce" id="devBotStepOnceBtn">Step</button>
          <button class="devtools__btn" data-action="dev:bot:autoPlay" id="devBotAutoPlayBtn">Play</button>
          <button class="devtools__btn" data-action="dev:bot:autoStop" id="devBotAutoStopBtn" disabled>Stop</button>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Last Decision</div>
        <div id="devBotLastDecision" class="devtools__decision">—</div>
      </div>
    </div>
  </div>
</div>
