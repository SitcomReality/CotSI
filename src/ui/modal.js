// Generic modal helpers

export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

export function setRewardModal(title, body) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = body;
  showModal('rewardModal');
}

export function openArtifactChoiceModal(reward, onChoice) {
  const titleEl = document.getElementById('rewardTitle');
  const bodyEl = document.getElementById('rewardBody');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = reward.title;

  const choicesHtml = reward.choices.map((c, i) => `
    <div class="artifact-choice" data-idx="${i}" style="
      background:#fff7dfaa;border:2px solid #d0a86a;border-radius:10px;padding:12px;margin:8px 0;
      cursor:pointer;transition:border-color .15s,background .15s;
    ">
      <div style="font-weight:800;color:#9a5a12;font-size:15px">${c.label}</div>
      <div class="mini" style="color:#5a3a22;margin-top:4px">${c.detail}</div>
    </div>
  `).join('');

  bodyEl.innerHTML = `${reward.body}<div style="margin-top:10px">${choicesHtml}</div>`;
  showModal('rewardModal');

  document.querySelectorAll('.artifact-choice').forEach(el => {
    el.onmouseenter = () => { el.style.borderColor = '#b88728'; el.style.background = '#fff4cf'; };
    el.onmouseleave = () => { el.style.borderColor = '#d0a86a'; el.style.background = '#fff7dfaa'; };
    el.onclick = () => {
      const idx = +el.dataset.idx;
      const choice = reward.choices[idx];
      hideModal('rewardModal');
      if (onChoice) onChoice(choice);
    };
  });
}