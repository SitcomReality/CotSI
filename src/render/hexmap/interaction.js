import { camera, applyCameraTransform } from './camera.js';
import { HEX_SIZE } from './constants.js';
import { coordKey } from '../../world/map.js';

export function setupMapInteraction(svgElement, onTileClick, getTooltipContent){
  const mapLayer = svgElement.querySelector('#mapLayer');
  const svg = svgElement;
  let isPanning = false;
  let startX = 0, startY = 0;
  let startTx = 0, startTy = 0;
  let tooltipEl = null;
  
  function screenToMap(clientX, clientY){
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - camera.tx) / camera.scale;
    const y = (clientY - rect.top - camera.ty) / camera.scale;
    return {x, y};
  }
  
  function findHexAt(x, y, hexSize=HEX_SIZE){
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / hexSize;
    const r = (2/3 * y) / hexSize;
    const cube_q = q, cube_r = r, cube_s = -cube_q - cube_r;
    let rq = Math.round(cube_q), rr = Math.round(cube_r), rs = Math.round(cube_s);
    const dq = Math.abs(rq - cube_q), dr = Math.abs(rr - cube_r), ds = Math.abs(rs - cube_s);
    if(dq > dr && dq > ds) rq = -rr - rs;
    else if(dr > ds) rr = -rq - rs;
    return {q: rq, r: rr};
  }
  
  function showTooltip(clientX, clientY, key){
    if(!getTooltipContent) return;
    const content = getTooltipContent(key);
    if(!content) return;
    if(!tooltipEl){
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'mapTooltip';
      tooltipEl.style.cssText = 'position:fixed;z-index:80;background:#fff7dfe8;border:1px solid #b99b6a;padding:7px 9px;border-radius:9px;font-size:12px;color:#3a2310;pointer-events:none;max-width:260px;box-shadow:0 10px 30px #0002;font-family:Georgia,serif';
      document.body.appendChild(tooltipEl);
    }
    tooltipEl.innerHTML = content;
    tooltipEl.style.left = (clientX + 14) + 'px';
    tooltipEl.style.top = (clientY + 14) + 'px';
    tooltipEl.style.display = 'block';
  }
  
  function hideTooltip(){
    if(tooltipEl) tooltipEl.style.display = 'none';
  }
  
  svg.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.18;
    const newScale = Math.max(0.35, Math.min(3.5, camera.scale * zoomFactor));
    camera.tx = mouseX - (mouseX - camera.tx) * (newScale / camera.scale);
    camera.ty = mouseY - (mouseY - camera.ty) * (newScale / camera.scale);
    camera.scale = newScale;
    applyCameraTransform(svg);
  }, {passive:false});
  
  svg.addEventListener('mousedown', (e)=>{
    if(e.button === 1 || (e.button === 0 && e.shiftKey)){
      e.preventDefault();
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      startTx = camera.tx;
      startTy = camera.ty;
      svg.style.cursor = 'grabbing';
    }
  });
  
  window.addEventListener('mousemove', (e)=>{
    if(!isPanning) return;
    camera.tx = startTx + (e.clientX - startX);
    camera.ty = startTy + (e.clientY - startY);
    applyCameraTransform(svg);
  });
  
  window.addEventListener('mouseup', ()=>{
    if(isPanning){
      isPanning = false;
      svg.style.cursor = '';
    }
  });
  
  // Mouse hover for tooltips
  svg.addEventListener('mousemove', (e)=>{
    if(isPanning) return;
    const rect = svg.getBoundingClientRect();
    const mapPos = screenToMap(e.clientX, e.clientY);
    const hex = findHexAt(mapPos.x - camera.offsetX, mapPos.y - camera.offsetY);
    const key = coordKey(hex);
    showTooltip(e.clientX, e.clientY, key);
  });
  
  svg.addEventListener('mouseleave', hideTooltip);
  
  // Touch support
  let lastTouchDist = 0;
  let lastTouchCenter = {x:0, y:0};
  
  svg.addEventListener('touchstart', (e)=>{
    if(e.touches.length === 1){
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTx = camera.tx;
      startTy = camera.ty;
    } else if(e.touches.length === 2){
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchCenter = {x: (t1.clientX + t2.clientX)/2, y: (t1.clientY + t2.clientY)/2};
    }
  }, {passive:false});
  
  svg.addEventListener('touchmove', (e)=>{
    if(e.touches.length === 1){
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if(Math.abs(dx) > 5 || Math.abs(dy) > 5){
        isPanning = true;
        camera.tx = startTx + dx;
        camera.ty = startTy + dy;
        applyCameraTransform(svg);
      }
    } else if(e.touches.length === 2){
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if(lastTouchDist > 0){
        const zoomFactor = dist / lastTouchDist;
        const newScale = Math.max(0.35, Math.min(3.5, camera.scale * zoomFactor));
        const rect = svg.getBoundingClientRect();
        const centerX = lastTouchCenter.x - rect.left;
        const centerY = lastTouchCenter.y - rect.top;
        camera.tx = centerX - (centerX - camera.tx) * (newScale / camera.scale);
        camera.ty = centerY - (centerY - camera.ty) * (newScale / camera.scale);
        camera.scale = newScale;
        applyCameraTransform(svg);
      }
      lastTouchDist = dist;
      lastTouchCenter = {x: (t1.clientX + t2.clientX)/2, y: (t1.clientY + t2.clientY)/2};
    }
  }, {passive:false});
  
  svg.addEventListener('touchend', (e)=>{
    if(e.changedTouches.length === 1 && !isPanning){
      const touch = e.changedTouches[0];
      const rect = svg.getBoundingClientRect();
      const mapPos = screenToMap(touch.clientX, touch.clientY);
      const hex = findHexAt(mapPos.x - camera.offsetX, mapPos.y - camera.offsetY);
      const key = coordKey(hex);
      if(onTileClick) onTileClick(key);
    }
    isPanning = false;
    lastTouchDist = 0;
  });
  
  svg.addEventListener('click', (e)=>{
    if(isPanning) return;
    if(e.button !== 0) return;
    if(e.shiftKey) return;
    const rect = svg.getBoundingClientRect();
    const mapPos = screenToMap(e.clientX, e.clientY);
    const hex = findHexAt(mapPos.x - camera.offsetX, mapPos.y - camera.offsetY);
    const key = coordKey(hex);
    if(onTileClick) onTileClick(key);

    console.log("non panning click caught");
    console.log("key:")
    console.log(key);
  });
  
  camera.offsetX = 0;
  camera.offsetY = 0;
  
  return () => {
    svg.style.cursor = '';
    if(tooltipEl) tooltipEl.remove();
  };
}