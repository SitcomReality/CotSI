import { h } from '../domBuilder.js';

export function buildLogOverflow(logs) {
  const isOpen = false; // default collapsed

  const textContent = (logs && logs.length > 0)
    ? logs.slice().reverse().map(e => typeof e === 'string' ? e : (e.plainText || '')).join('\n')
    : 'No history yet.';

  const textArea = h('textarea', {
    class: 'log-overflow__text',
    readonly: 'true',
    rows: '12',
    style: { display: isOpen ? 'block' : 'none' },
  }, textContent);

  const toggleBtn = h('button', {
    class: 'log-overflow__toggle',
    onclick: () => {
      const isNowOpen = textArea.style.display !== 'block';
      textArea.style.display = isNowOpen ? 'block' : 'none';
      toggleBtn.classList.toggle('log-overflow__toggle--open', isNowOpen);
    },
  }, h('span', { class: 'log-overflow__chevron' }, '\u25B6'), ' Log History');

  return h('div', { class: 'log-overflow' },
    toggleBtn,
    textArea,
  );
}
