<div id="devToolsPanel" class="devtools">
  <div class="devtools__header">
    <span class="devtools__title">Dev Tools</span>
    <span class="devtools__hint">` to toggle</span>
  </div>
  <div class="devtools__tabs" id="devToolsTabs">
    <button class="devtools__tab is-active" data-action="dev:switchTab" data-tab="cheats">Cheats</button>
    <button class="devtools__tab" data-action="dev:switchTab" data-tab="perf">Performance</button>
    <button class="devtools__tab" data-action="dev:switchTab" data-tab="bot">Bot Control</button>
    <button class="devtools__tab" data-action="dev:switchTab" data-tab="capture">Capture</button>
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
          <button class="devtools__btn" data-action="dev:cheat:fillMoves">Fill AP</button>
          <button class="devtools__btn devtools__btn--toggle" data-action="dev:cheat:teleport" id="devTeleportBtn">Teleport Mode: OFF</button>
        </div>
      </div>
      <div class="devtools__section">
        <div class="devtools__section-title">Map</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn devtools__btn--toggle" data-action="dev:cheat:revealFog" id="devRevealFogBtn">Reveal Map: OFF</button>
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
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:render3d">
              <input type="checkbox" checked />
              render3d
            </label>
            <span class="devtools__perf-val" id="devPerfRender3d">—</span>
          </div>
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:overlays">
              <input type="checkbox" checked />
              overlays
            </label>
            <span class="devtools__perf-val" id="devPerfOverlays">—</span>
          </div>
          <div class="devtools__measurement">
            <label class="devtools__label" data-action="dev:perf:toggle:animMove">
              <input type="checkbox" checked />
              animMove
            </label>
            <span class="devtools__perf-val" id="devPerfAnimMove">—</span>
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
      <div class="devtools__section">
        <div class="devtools__section-title">Capture</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn" data-action="dev:perf:startCapture" id="devPerfCaptureStart">Start Capture</button>
          <button class="devtools__btn" data-action="dev:perf:stopCapture" id="devPerfCaptureStop" disabled>Stop</button>
          <button class="devtools__btn" data-action="dev:perf:copyReport" id="devPerfCopyReport">Copy Report</button>
        </div>
        <div id="devPerfCaptureStatus" style="font-size:11px;color:var(--text-dim,#888);margin-top:4px;">Idle</div>
      </div>
    </div>

    <!-- Capture tab -->
    <div class="devtools__body" id="devBodyCapture">
      <div class="devtools__section">
        <div class="devtools__section-title">Video (WebM)</div>
        <div class="devtools__btn-row">
          <button class="devtools__btn" data-action="dev:capture:start" id="devCaptureStart">Start Recording</button>
          <button class="devtools__btn" data-action="dev:capture:stop" id="devCaptureStop" disabled>Stop</button>
        </div>
        <div id="devCaptureStatus" style="font-size:11px;color:var(--text-dim,#888);margin-top:4px;">Idle — records the map viewport (3D + highlights) to a downloaded .webm</div>
      </div>
    </div>

    <!-- Bot Control tab -->
    <div class="devtools__body" id="devBodyBot">
      <div class="devtools__section">
        <div class="devtools__section-title">Controller Override</div>
        <div class="devtools__champ-list">
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
