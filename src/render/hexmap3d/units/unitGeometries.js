import * as THREE from '../../../vendor/three.module.js';
import { PIECE_CAP } from '../../../params/render/geometryParams.js';

// =========================================================================
// Piece cap geometry — the flat icon disc that rides on top of mob & trader
// bodies (pieceIcons.js). The entities' 3D bodies themselves come from the
// descriptor pipeline (features/descriptors/data/mobs.js + traders.js), so
// this is the only piece geometry left.
// =========================================================================

let pieceCapGeo = null;

/** Ultra-thin disc carrying the icon CanvasTexture. */
export function getPieceCapGeo() {
  if (!pieceCapGeo) {
    pieceCapGeo = new THREE.CylinderGeometry(PIECE_CAP.radiusX, PIECE_CAP.radiusY, PIECE_CAP.height, PIECE_CAP.segments);
  }
  return pieceCapGeo;
}
