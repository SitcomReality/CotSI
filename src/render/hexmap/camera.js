// Camera state for pan/zoom
const camera = { scale: 1, tx: 0, ty: 0, dragging: false, lastX: 0, lastY: 0 };

export function resetCamera() {
  camera.scale = 1;
  camera.tx = 0;
  camera.ty = 0;
  camera.dragging = false;
  camera.lastX = 0;
  camera.lastY = 0;
}

export function getCamera() {
  return camera;
}

export function applyCameraTransform(svgElement) {
  const g = svgElement.querySelector('#mapLayer');
  if (g) g.setAttribute('transform', `translate(${camera.tx},${camera.ty}) scale(${camera.scale})`);
}

export { camera };