/**
 * header.js — Part inspector header: the breadcrumb back to the object-level
 * controls.
 */
import { S } from '../../../state.js';
import { el } from '../../formControls/index.js';
import { inspectorHead } from '../../inspectorHead.js';
import { isAlternativesNode, isGroupNode } from '../../partTree/index.js';

/** Inspector header for part editing: breadcrumb back to the object. */
export function renderPartHeader(container, node, ctx) {
  const d = S.descriptor;
  const back = el('button', 'breadcrumb', `← ${d.displayName}`);
  back.type = 'button';
  back.title = 'Back to object-level controls';
  back.addEventListener('click', () => {
    S.selectedPartId = null;
    ctx.renderAll();
  });
  const kind = isAlternativesNode(node) ? 'alternatives' : isGroupNode(node) ? 'group' : node.shape;
  const title = `${node.id} · ${kind}`;
  const head = inspectorHead(title, null, back);
  if (isAlternativesNode(node)) {
    head.title = 'Choice point: every item rolls ONE option by weight (seeded per node). It carries no position — wrap a hinged config in a group inside the option.';
  }
  container.append(head);
}
