/** A group node — a part with a `children` array and no shape of its own. */
export const isGroupNode = (part) => Array.isArray(part.children);

/** An `alternatives` choice point — a node with an `alternatives` array. */
export const isAlternativesNode = (part) => Array.isArray(part.alternatives);

/**
 * Flat list of every node in a parts tree, in render order. Each entry carries
 * the node plus its tree context: `parent` (null at the root), `depth`, and
 * `index` within the parent's children array (or the root parts array).
 * Alternatives nodes are included; their OPTION rows are listed right after
 * the node (each entry's `option` field is the owning option object, or null
 * for regular nodes), and the option's parts recurse beneath it with
 * `choiceId` naming the owning alternatives node (for preview auto-switch).
 */
export function listNodes(parts) {
  const out = [];
  const walk = (list, parent, depth, option, choiceId) => {
    list.forEach((node, index) => {
      out.push({ node, parent, depth, index, option: option ?? null, choiceId: choiceId ?? null });
      if (Array.isArray(node.alternatives)) {
        node.alternatives.forEach((opt) => {
          walk(opt.parts ?? [], node, depth + 1, opt, node.id);
        });
      } else if (Array.isArray(node.children)) {
        walk(node.children, node, depth + 1, null, null);
      }
    });
  };
  walk(parts, null, 0, null, null);
  return out;
}

/** Total node count of a parts tree (groups + leaves + alternatives + options). */
export function countNodes(parts) {
  let n = 0;
  const walk = (list) => {
    for (const node of list) {
      n++;
      if (Array.isArray(node.alternatives)) {
        for (const opt of node.alternatives) walk(opt.parts ?? []);
      } else if (Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(parts);
  return n;
}

/**
 * Resolve a part id to its tree entry ({ node, parent, depth, index,
 * option? }), or null. Ids are unique across a whole parts tree
 * (schema-validated), so a flat lookup by walking is unambiguous.
 */
export function findNodeById(parts, id) {
  for (const entry of listNodes(parts)) {
    if (entry.node.id === id) return entry;
  }
  return null;
}

/** The sibling array a node sits in (the root parts array at depth 0, a
 *  group's children, or an option's parts). */
export function siblingList(parts, entry) {
  if (entry.option) return entry.option.parts ?? [];
  return entry.parent ? entry.parent.children : parts;
}

/** Ids of a node's siblings (excluding the node itself), in tree order. */
export function siblingIds(parts, entry) {
  return siblingList(parts, entry)
    .filter((n) => n.id !== entry.node.id)
    .map((n) => n.id);
}

/**
 * Ids of every LEAF node in the subtree rooted at `entry.node` (a leaf node →
 * its own id; a group → the union over its descendants). Records and meshes
 * only exist for leaves, so this is what a group's world bounds / selection
 * highlight must union over. For an alternatives node the union covers every
 * option's parts (the full vocabulary — only the chosen option renders, but
 * the gizmo must know the whole tree).
 */
export function descendantLeafIds(entry) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node.alternatives)) {
      for (const opt of node.alternatives) (opt.parts ?? []).forEach(walk);
    } else if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    } else {
      out.push(node.id);
    }
  };
  walk(entry.node);
  return out;
}
