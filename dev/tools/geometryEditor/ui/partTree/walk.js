/** A group node — a part with a `children` array and no shape of its own. */
export const isGroupNode = (part) => Array.isArray(part.children);

/**
 * Flat list of every node in a parts tree, in render order. Each entry carries
 * the node plus its tree context: `parent` (null at the root), `depth`, and
 * `index` within the parent's children array (or the root parts array).
 */
export function listNodes(parts) {
  const out = [];
  const walk = (list, parent, depth) => {
    list.forEach((node, index) => {
      out.push({ node, parent, depth, index });
      if (Array.isArray(node.children)) walk(node.children, node, depth + 1);
    });
  };
  walk(parts, null, 0);
  return out;
}

/** Total node count of a parts tree (groups + leaves). */
export function countNodes(parts) {
  let n = 0;
  const walk = (list) => {
    for (const node of list) {
      n++;
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(parts);
  return n;
}

/**
 * Resolve a part id to its tree entry ({ node, parent, depth, index }), or
 * null. Ids are unique across a whole parts tree (schema-validated), so a flat
 * lookup by walking is unambiguous.
 */
export function findNodeById(parts, id) {
  for (const entry of listNodes(parts)) {
    if (entry.node.id === id) return entry;
  }
  return null;
}

/** The sibling array a node sits in (the root parts array at depth 0). */
export function siblingList(parts, entry) {
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
 * highlight must union over.
 */
export function descendantLeafIds(entry) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node.children)) node.children.forEach(walk);
    else out.push(node.id);
  };
  walk(entry.node);
  return out;
}
