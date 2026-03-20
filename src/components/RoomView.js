import React, { useRef, useEffect, useCallback, useState } from 'react';
import useStore from '../store/useStore';
import config from '../config';

var WALL_DEPTH = 58;
var DOOR_W = 80;
var DOOR_H = 14;
var GRID_SIZE = 42;

export default function RoomView(props) {
  var isMobile = props.isMobile;
  var canvasRef = useRef(null);
  var containerRef = useRef(null);
  var sizeRef = useRef({ w: 800, h: 600 });
  var frameRef = useRef(null);

  var draw = useCallback(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = sizeRef.current.w;
    var h = sizeRef.current.h;
    var now = Date.now();

    var state = useStore.getState();
    var rooms = state.rooms;
    var sections = state.sections;
    var ci = state.currentRoomIndex;
    var playerPos = state.playerPos;
    var keysPressed = state.keysPressed;
    var playerSpeed = state.playerSpeed;
    var isMapTransitioning = state.isMapTransitioning;
    var showEditor = state.showEditor;
    var doorCooldown = state.doorCooldown;

    var room = rooms[ci];
    if (!room) { frameRef.current = requestAnimationFrame(draw); return; }

    var section = findSec(sections, room.section);
    var sColor = section.color;

    useStore.getState().lerpPlayerToTarget();

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, w, h);

    var rW = Math.min(w - (isMobile ? 20 : 50), 720);
    var rH = Math.min(h - (isMobile ? 20 : 36), 600);
    var rX = (w - rW) / 2;
    var rY = (h - rH) / 2;

    var glowSources = [];
    glowSources.push({ nx: playerPos.x, ny: playerPos.y, color: sColor, radius: 0.18, intensity: 1.0 });
    for (var ei = 0; ei < room.elements.length; ei++) {
      var elem = room.elements[ei];
      glowSources.push({ nx: elem.x, ny: elem.y, color: elem.color || sColor,
        radius: elem.type === 'image' ? 0.14 : 0.13, intensity: 0.7 });
    }

    drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources);

    var canFwd = ci < rooms.length - 1;
    var canBack = ci > 0;

    if (canBack) {
      drawDoor(ctx, rX + rW / 2 - DOOR_W / 2, rY + rH - DOOR_H, DOOR_W, DOOR_H, config.entranceDoorColor, now, false);
    }
    if (canFwd) {
      var ed = exitRect(room.exitDirection, rX, rY, rW, rH);
      drawDoor(ctx, ed.x, ed.y, ed.w, ed.h, sColor, now, true);
      drawArrow(ctx, room.exitDirection, ed, sColor);
    }

    var px = playerPos.x;
    var py = playerPos.y;

    if (!showEditor && !isMapTransitioning && !doorCooldown) {
      var moved = false;
      var npx = px;
      var npy = py;
      if (keysPressed['w'] || keysPressed['arrowup']) { npy -= playerSpeed; moved = true; }
      if (keysPressed['s'] || keysPressed['arrowdown']) { npy += playerSpeed; moved = true; }
      if (keysPressed['a'] || keysPressed['arrowleft']) { npx -= playerSpeed; moved = true; }
      if (keysPressed['d'] || keysPressed['arrowright']) { npx += playerSpeed; moved = true; }
      if (moved) {
        npx = Math.max(0.01, Math.min(0.99, npx));
        npy = Math.max(0.01, Math.min(0.99, npy));
        useStore.getState().movePlayerDirect({ x: npx, y: npy });
        px = npx; py = npy;
      }
    }

    if (!isMapTransitioning && !doorCooldown && !showEditor) {
      var scrX = rX + px * rW;
      var scrY = rY + py * rH;
      var hitPad = 18;
      if (canFwd) {
        var exR = exitRect(room.exitDirection, rX, rY, rW, rH);
        if (scrX > exR.x - hitPad && scrX < exR.x + exR.w + hitPad &&
            scrY > exR.y - hitPad && scrY < exR.y + exR.h + hitPad) {
          useStore.getState().navigateViaDoor(1);
        }
      }
      if (canBack) {
        var entX1 = rX + rW / 2 - DOOR_W / 2;
        var entX2 = entX1 + DOOR_W;
        var entY1 = rY + rH - DOOR_H;
        if (scrX > entX1 - hitPad && scrX < entX2 + hitPad &&
            scrY > entY1 - hitPad && scrY < rY + rH + hitPad) {
          useStore.getState().navigateViaDoor(-1);
        }
      }
    }

    // Character
    var plx = rX + px * rW;
    var ply = rY + py * rH;

    var lg = ctx.createRadialGradient(plx, ply - 6, 0, plx, ply - 6, 80);
    lg.addColorStop(0, sColor + '16'); lg.addColorStop(0.4, sColor + '08'); lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg; ctx.fillRect(plx - 80, ply - 86, 160, 160);

    var HEAD_W = 20, HEAD_H = 14, BODY_W = 12, BODY_H = 8;
    var LEG_W = 4, LEG_H = 5, LEG_GAP = 4;
    var legY = ply + 7, bodyY2 = ply - 1, headY2 = ply - 12;
    var bodyX2 = plx - BODY_W / 2, headX2 = plx - HEAD_W / 2;
    var lLegX = plx - LEG_GAP / 2 - LEG_W, rLegX = plx + LEG_GAP / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(plx, legY + LEG_H + 2, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = config.legColor; ctx.fillRect(lLegX, legY, LEG_W, LEG_H); ctx.fillRect(rLegX, legY, LEG_W, LEG_H);
    ctx.fillStyle = config.bodyColor; ctx.fillRect(bodyX2, bodyY2, BODY_W, BODY_H);
    ctx.fillStyle = sColor + '45'; ctx.fillRect(bodyX2, bodyY2 + 3, BODY_W, 2);
    ctx.fillStyle = config.headColor; ctx.fillRect(headX2, headY2, HEAD_W, HEAD_H);
    ctx.strokeStyle = sColor + '30'; ctx.lineWidth = 1;
    ctx.strokeRect(headX2 + 0.5, headY2 + 0.5, HEAD_W - 1, HEAD_H - 1);
    var eyeSize = 6, eyeGap2 = 2, eyeY2 = headY2 + 5;
    ctx.fillStyle = config.eyeColor;
    ctx.fillRect(plx - eyeGap2 / 2 - eyeSize, eyeY2, eyeSize, eyeSize);
    ctx.fillRect(plx + eyeGap2 / 2, eyeY2, eyeSize, eyeSize);
    ctx.fillStyle = sColor + '22';
    ctx.fillRect(headX2 + 2, eyeY2 + eyeSize, 3, 2);
    ctx.fillRect(headX2 + HEAD_W - 5, eyeY2 + eyeSize, 3, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '10px "Concert One", sans-serif';
    ctx.textAlign = 'left'; ctx.fillText((ci + 1) + ' / ' + rooms.length, rX + 10, rY + rH - 10);
    ctx.fillStyle = sColor + '60'; ctx.textAlign = 'center';
    ctx.fillText(section.name.toUpperCase(), w / 2, rY - WALL_DEPTH + 16);

    if (canFwd) {
      var exitNX = 0.5, exitNY = 0.02;
      if (room.exitDirection === 'left') { exitNX = 0.02; exitNY = 0.5; }
      else if (room.exitDirection === 'right') { exitNX = 0.98; exitNY = 0.5; }
      var startDist = Math.sqrt(Math.pow(0.5 - exitNX, 2) + Math.pow(0.82 - exitNY, 2));
      var curDist = Math.sqrt(Math.pow(px - exitNX, 2) + Math.pow(py - exitNY, 2));
      var progress = Math.max(0, Math.min(1, 1 - curDist / startDist));
      if (progress > 0.05) {
        var bW = rW * 0.3, bH2 = 3, bX = (w - bW) / 2, bY2 = rY + rH + WALL_DEPTH + 14;
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(bX, bY2, bW, bH2);
        ctx.fillStyle = sColor + '70'; ctx.fillRect(bX, bY2, bW * progress, bH2);
      }
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [isMobile]);

  useEffect(function() {
    var resize = function() {
      var c = containerRef.current; var cv = canvasRef.current;
      if (!c || !cv) return;
      var r = c.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      cv.getContext('2d').scale(dpr, dpr);
      sizeRef.current = { w: r.width, h: r.height };
    };
    resize();
    window.addEventListener('resize', resize);
    return function() { window.removeEventListener('resize', resize); };
  }, []);

  useEffect(function() {
    frameRef.current = requestAnimationFrame(draw);
    return function() { cancelAnimationFrame(frameRef.current); };
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      <ContentOverlay containerRef={containerRef} isMobile={isMobile} />
    </div>
  );
}

// ---- DRAWING HELPERS (unchanged) ----

function findSec(sections, id) {
  for (var i = 0; i < sections.length; i++) { if (sections[i].id === id) return sections[i]; }
  return { color: '#6366f1', name: '?', id: id };
}

function exitRect(dir, rX, rY, rW, rH) {
  if (dir === 'top') return { x: rX + rW / 2 - DOOR_W / 2, y: rY, w: DOOR_W, h: DOOR_H };
  if (dir === 'left') return { x: rX, y: rY + rH / 2 - DOOR_W / 2, w: DOOR_H, h: DOOR_W };
  if (dir === 'right') return { x: rX + rW - DOOR_H, y: rY + rH / 2 - DOOR_W / 2, w: DOOR_H, h: DOOR_W };
  return { x: rX + rW / 2 - DOOR_W / 2, y: rY, w: DOOR_W, h: DOOR_H };
}

function gridSegColor(nx, ny, glowSources) {
  var baseAlpha = config.gridBaseAlpha;
  var bestStrength = 0; var bestColor = null;
  for (var i = 0; i < glowSources.length; i++) {
    var g = glowSources[i]; var dx = nx - g.nx; var dy = ny - g.ny;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < g.radius) { var strength = (1 - dist / g.radius) * g.intensity;
      if (strength > bestStrength) { bestStrength = strength; bestColor = g.color; } }
  }
  if (bestStrength > 0.01 && bestColor) {
    var alpha = Math.min(baseAlpha + bestStrength * 0.2, 0.25);
    var hex = Math.floor(alpha * 255).toString(16); if (hex.length < 2) hex = '0' + hex;
    return bestColor + hex;
  }
  return 'rgba(255,255,255,' + baseAlpha + ')';
}

function drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources) {
  // Floor
  var fg = ctx.createRadialGradient(rX + rW / 2, rY + rH / 2, 10, rX + rW / 2, rY + rH / 2, rW * 0.7);
  fg.addColorStop(0, config.floorCenter);
  fg.addColorStop(0.5, config.floorMid);
  fg.addColorStop(1, config.floorEdge);
  ctx.fillStyle = fg;
  ctx.fillRect(rX, rY, rW, rH);

  // Grid
  ctx.lineWidth = 1;
  for (var vx = rX + GRID_SIZE; vx < rX + rW; vx += GRID_SIZE) {
    var svx = Math.floor(vx) + 0.5;
    for (var vy = rY; vy < rY + rH; vy += GRID_SIZE) {
      var segEnd = Math.min(vy + GRID_SIZE, rY + rH);
      ctx.strokeStyle = gridSegColor((vx - rX) / rW, ((vy + segEnd) / 2 - rY) / rH, glowSources);
      ctx.beginPath(); ctx.moveTo(svx, vy); ctx.lineTo(svx, segEnd); ctx.stroke();
    }
  }
  for (var hy = rY + GRID_SIZE; hy < rY + rH; hy += GRID_SIZE) {
    var shy = Math.floor(hy) + 0.5;
    for (var hx = rX; hx < rX + rW; hx += GRID_SIZE) {
      var hSegEnd = Math.min(hx + GRID_SIZE, rX + rW);
      ctx.strokeStyle = gridSegColor(((hx + hSegEnd) / 2 - rX) / rW, (hy - rY) / rH, glowSources);
      ctx.beginPath(); ctx.moveTo(hx, shy); ctx.lineTo(hSegEnd, shy); ctx.stroke();
    }
  }

  var d = WALL_DEPTH;

  // ---- TOP WALL ----
  // Gradient: outer (far from floor) → inner (touching floor)
  var gt = ctx.createLinearGradient(0, rY - d, 0, rY);
  gt.addColorStop(0, config.wallOuter);
  gt.addColorStop(0.3, config.wallMidDark);
  gt.addColorStop(0.7, config.wallMidBright);
  gt.addColorStop(1, config.wallInner);
  ctx.fillStyle = gt;
  ctx.beginPath();
  ctx.moveTo(rX - d, rY - d);
  ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW, rY);
  ctx.lineTo(rX, rY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = sColor + '20';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ---- BOTTOM WALL ----
  // Gradient: inner (touching floor) → outer (far from floor)
  var gb = ctx.createLinearGradient(0, rY + rH, 0, rY + rH + d);
  gb.addColorStop(0, config.wallInner);
  gb.addColorStop(0.3, config.wallMidBright);
  gb.addColorStop(0.7, config.wallMidDark);
  gb.addColorStop(1, config.wallOuter);
  ctx.fillStyle = gb;
  ctx.beginPath();
  ctx.moveTo(rX, rY + rH);
  ctx.lineTo(rX + rW, rY + rH);
  ctx.lineTo(rX + rW + d, rY + rH + d);
  ctx.lineTo(rX - d, rY + rH + d);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = sColor + '20';
  ctx.stroke();

  // ---- LEFT WALL ----
  // Gradient: outer (far from floor) → inner (touching floor)
  var gl = ctx.createLinearGradient(rX - d, 0, rX, 0);
  gl.addColorStop(0, config.wallOuter);
  gl.addColorStop(0.3, config.wallMidDark);
  gl.addColorStop(0.7, config.wallMidBright);
  gl.addColorStop(1, config.wallInner);
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.moveTo(rX - d, rY - d);
  ctx.lineTo(rX, rY);
  ctx.lineTo(rX, rY + rH);
  ctx.lineTo(rX - d, rY + rH + d);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = sColor + '20';
  ctx.stroke();

  // ---- RIGHT WALL ----
  // Gradient: inner (touching floor) → outer (far from floor)
  var gr = ctx.createLinearGradient(rX + rW, 0, rX + rW + d, 0);
  gr.addColorStop(0, config.wallInner);
  gr.addColorStop(0.3, config.wallMidBright);
  gr.addColorStop(0.7, config.wallMidDark);
  gr.addColorStop(1, config.wallOuter);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(rX + rW, rY);
  ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW + d, rY + rH + d);
  ctx.lineTo(rX + rW, rY + rH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = sColor + '20';
  ctx.stroke();

  // Room border
  ctx.strokeStyle = sColor + '45';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rX, rY, rW, rH);

  // Inner edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rX + 1, rY + 1, rW - 2, rH - 2);

  // Corner accents
  var corners = [[rX, rY], [rX + rW, rY], [rX, rY + rH], [rX + rW, rY + rH]];
  for (var c = 0; c < corners.length; c++) {
    var cg = ctx.createRadialGradient(corners[c][0], corners[c][1], 0, corners[c][0], corners[c][1], 35);
    cg.addColorStop(0, sColor + '30');
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.fillRect(corners[c][0] - 35, corners[c][1] - 35, 70, 70);
  }
}

function drawDoor(ctx, x, y, w, h, color, now, isExit) {
  var maxD = Math.max(w, h);
  var glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, maxD * 1.3);
  glow.addColorStop(0, color + '50'); glow.addColorStop(0.5, color + '18'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(x - 18, y - 18, w + 36, h + 36);
  ctx.fillStyle = isExit ? color + '80' : color + '35'; ctx.fillRect(x, y, w, h);
  var p = (Math.sin(now * 0.003) + 1) * 0.5;
  var ph = Math.floor(25 + p * 40).toString(16); if (ph.length < 2) ph = '0' + ph;
  ctx.fillStyle = isExit ? color + ph : color + '12'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function drawArrow(ctx, dir, rect, color) {
  ctx.fillStyle = color + 'bb'; ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (dir === 'left') ctx.fillText('\u25C0', rect.x - 14, rect.y + rect.h / 2);
  else if (dir === 'right') ctx.fillText('\u25B6', rect.x + rect.w + 14, rect.y + rect.h / 2);
  else ctx.fillText('\u25B2', rect.x + rect.w / 2, rect.y - 14);
}

// =============================================================
// CONTENT OVERLAY — text avoids images, player parts text
// =============================================================

function ContentOverlay(props) {
  var containerRef = props.containerRef;
  var isMobile = props.isMobile;
  var ci = useStore(function(s) { return s.currentRoomIndex; });
  var rooms = useStore(function(s) { return s.rooms; });
  var sections = useStore(function(s) { return s.sections; });
  var playerPos = useStore(function(s) { return s.playerPos; });
  var showEditor = useStore(function(s) { return s.showEditor; });

  var sizeState = useState({ w: 800, h: 600 });
  var size = sizeState[0];
  var setSize = sizeState[1];

  useEffect(function() {
    var update = function() {
      if (containerRef.current) {
        var r = containerRef.current.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    return function() { window.removeEventListener('resize', update); };
  }, [containerRef]);

  var room = rooms[ci];
  if (!room) return null;
  var section = findSec(sections, room.section);

  var rW = Math.min(size.w - (isMobile ? 20 : 50), 720);
  var rH = Math.min(size.h - (isMobile ? 20 : 36), 600);
  var rX = (size.w - rW) / 2;
  var rY = (size.h - rH) / 2;

  // Collect image bounding boxes for text avoidance
  var imageBounds = [];
  for (var i = 0; i < room.elements.length; i++) {
    var el = room.elements[i];
    if (el.type === 'image') {
      var imgW = el.width || 150;
      var imgH = el.height || 100;
      var imgSX = rX + el.x * rW;
      var imgSY = rY + el.y * rH;
      imageBounds.push({
        left: imgSX - imgW / 2 - 20,
        right: imgSX + imgW / 2 + 20,
        top: imgSY - imgH / 2 - 20,
        bottom: imgSY + imgH / 2 + 20,
        cx: imgSX,
        cy: imgSY,
      });
    }
  }

  return React.createElement('div', {
    style: { position: 'absolute', inset: 0, pointerEvents: 'none' }
  }, room.elements.map(function(el) {
    return React.createElement(ElementRenderer, {
      key: el.id, el: el,
      rX: rX, rY: rY, rW: rW, rH: rH,
      playerPos: playerPos, sectionColor: section.color,
      showEditor: showEditor, isMobile: isMobile,
      imageBounds: imageBounds,
    });
  }));
}

// =============================================================
// ELEMENT RENDERER — routes to correct component
// =============================================================

function ElementRenderer(props) {
  var el = props.el;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var playerPos = props.playerPos;
  var sectionColor = props.sectionColor;
  var showEditor = props.showEditor;
  var isMobile = props.isMobile;
  var imageBounds = props.imageBounds;

  var sx = rX + el.x * rW;
  var sy = rY + el.y * rH;

  // Calculate avoidance offset from images
  var avoidX = 0, avoidY = 0;
  if (el.type === 'text' || el.type === 'link') {
    for (var ib = 0; ib < imageBounds.length; ib++) {
      var b = imageBounds[ib];
      var dx = sx - b.cx;
      var dy = sy - b.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var avoidR = Math.max(b.right - b.left, b.bottom - b.top) * 0.7;

      if (dist < avoidR && dist > 1) {
        var force = Math.pow(1 - dist / avoidR, 1.5) * 60;
        var angle = Math.atan2(dy, dx);
        avoidX += Math.cos(angle) * force;
        avoidY += Math.sin(angle) * force;
      }
    }
  }

  sx += avoidX;
  sy += avoidY;

  if (el.type === 'text') {
    return React.createElement(SplittableText, {
      el: el, sx: sx, sy: sy,
      playerPos: playerPos, rX: rX, rY: rY, rW: rW, rH: rH,
      sectionColor: sectionColor, showEditor: showEditor,
    });
  }

  if (el.type === 'image') {
    var imgDx = el.x - playerPos.x;
    var imgDy = el.y - playerPos.y;
    var imgDist = Math.sqrt(imgDx * imgDx + imgDy * imgDy);
    var imgOp = 1;
    var imgPushX = 0, imgPushY = 0;
    if (imgDist < 0.14 && !showEditor) {
      var f = 1 - imgDist / 0.14;
      imgOp = 0.3 + (1 - f) * 0.7;
      var a = Math.atan2(imgDy, imgDx);
      imgPushX = Math.cos(a) * f * 12;
      imgPushY = Math.sin(a) * f * 10;
    }
    return React.createElement('div', {
      style: {
        position: 'absolute', left: rX + el.x * rW + imgPushX, top: rY + el.y * rH + imgPushY,
        transform: 'translate(-50%,-50%)', pointerEvents: 'auto',
      }
    }, React.createElement('img', {
      src: el.src, alt: '', draggable: false,
      style: {
        width: el.width || 150, height: el.height || 100,
        objectFit: 'cover', borderRadius: 6, opacity: imgOp,
        border: '1px solid rgba(255,255,255,0.1)', transition: 'opacity 0.2s',
      },
      onError: function(e) { e.target.style.display = 'none'; }
    }));
  }

  if (el.type === 'link') {
    return React.createElement(SplittableLink, {
      el: el, sx: sx, sy: sy,
      playerPos: playerPos, rX: rX, rY: rY, rW: rW, rH: rH,
      sectionColor: sectionColor, showEditor: showEditor, isMobile: isMobile,
    });
  }

  return null;
}

// =============================================================
// SPLITTABLE TEXT — player parts text like Moses parts the sea
// =============================================================

function SplittableText(props) {
  var el = props.el;
  var sx = props.sx, sy = props.sy;
  var playerPos = props.playerPos;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var sectionColor = props.sectionColor;
  var showEditor = props.showEditor;

  var fontSize = (el.fontSize || 1) * 16;
  var content = el.content || '';
  var color = el.color || '#fff';
  var maxWidth = el.maxWidth || 520;

  var playerSX = rX + playerPos.x * rW;
  var playerSY = rY + playerPos.y * rH;

  var pDist = Math.sqrt(Math.pow(sx - playerSX, 2) + Math.pow(sy - playerSY, 2));
  var interactRadius = 90;
  var isNear = pDist < interactRadius + fontSize * 3 && !showEditor;

  // When far away, render as normal text
  if (!isNear) {
    return React.createElement('div', {
      style: {
        position: 'absolute', left: sx, top: sy,
        transform: 'translate(-50%,-50%)',
        color: color,
        fontSize: fontSize + 'px',
        fontFamily: config.contentFont,
        fontWeight: el.fontWeight || 'normal',
        fontStyle: el.fontStyle || 'normal',
        textAlign: 'center',
        maxWidth: maxWidth + 'px',
        lineHeight: 1.6,
        userSelect: 'text', pointerEvents: 'auto', cursor: 'text',
        textShadow: '0 0 8px ' + color + '25',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }
    }, content);
  }

  // Near — render per-word with displacement
  var charW = fontSize * 0.58;
  var lineH = fontSize * 1.6;
  var lines = wrapText(content, maxWidth, charW);
  var totalH = lines.length * lineH;
  var startY = sy - totalH / 2;
  var elements = [];

  for (var li = 0; li < lines.length; li++) {
    var words = lines[li].split(/(\s+)/);
    var lineW = lines[li].length * charW;
    var cursorX = sx - lineW / 2;
    var lineY2 = startY + li * lineH + lineH / 2;

    for (var wi = 0; wi < words.length; wi++) {
      var word = words[wi];
      if (!word) continue;

      var wordW = word.length * charW;
      var wordCX = cursorX + wordW / 2;
      var wordCY = lineY2;

      // Distance from word center to player
      var wdx = wordCX - playerSX;
      var wdy = wordCY - playerSY;
      var wDist = Math.sqrt(wdx * wdx + wdy * wdy);

      var offX = 0, offY = 0, opacity = 1;

      if (wDist < interactRadius) {
        var force = 1 - wDist / interactRadius;
        force = force * force * force; // Cubic — very smooth, strong near center

        // Push word away from player — "parting" effect
        // Mostly horizontal so text splits left/right
        var pushAngle = Math.atan2(wdy, wdx);
        var horizBias = 1.8; // Push more horizontally
        var pushX = Math.cos(pushAngle) * force * 55 * horizBias;
        var pushY = Math.sin(pushAngle) * force * 35;

        offX = pushX;
        offY = pushY;
        opacity = 0.35 + (1 - force) * 0.65;
      }

      var isSpace = word.trim() === '';

      if (!isSpace) {
        elements.push(
          React.createElement('span', {
            key: li + '-' + wi,
            style: {
              position: 'absolute',
              left: wordCX + offX,
              top: wordCY + offY,
              transform: 'translate(-50%,-50%)',
              color: color,
              fontSize: fontSize + 'px',
              fontFamily: config.contentFont,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              opacity: opacity,
              textShadow: opacity < 0.9
                ? '0 0 ' + (15 + (1 - opacity) * 15) + 'px ' + (sectionColor) + '50'
                : '0 0 8px ' + color + '25',
              whiteSpace: 'pre',
              pointerEvents: 'none',
              userSelect: 'none',
              transition: 'none',
              willChange: 'transform, opacity',
            }
          }, word)
        );
      }

      cursorX += wordW;
    }
  }

  return React.createElement('div', {
    style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }
  }, elements);
}

// =============================================================
// SPLITTABLE LINK — same parting effect + clickable
// =============================================================

function SplittableLink(props) {
  var el = props.el;
  var sx = props.sx, sy = props.sy;
  var playerPos = props.playerPos;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var sectionColor = props.sectionColor;
  var showEditor = props.showEditor;
  var isMobile = props.isMobile;

  var wasNearRef = useRef(false);
  var color = el.color || sectionColor;
  var fontSize = (el.fontSize || 1) * 16;
  var content = el.content || '';
  var charW = fontSize * 0.58;

  var playerSX = rX + playerPos.x * rW;
  var playerSY = rY + playerPos.y * rH;
  var pDist = Math.sqrt(Math.pow(sx - playerSX, 2) + Math.pow(sy - playerSY, 2));
  var interactRadius = 80;
  var isNear = pDist < interactRadius && !showEditor;

  useEffect(function() {
    if (isNear && !wasNearRef.current) {
      useStore.getState().setHoveredLink(el);
    } else if (!isNear && wasNearRef.current) {
      var cur = useStore.getState().hoveredLink;
      if (cur && cur.id === el.id) useStore.getState().setHoveredLink(null);
    }
    wasNearRef.current = isNear;
  });

  useEffect(function() {
    return function() {
      var cur = useStore.getState().hoveredLink;
      if (cur && cur.id === el.id) useStore.getState().setHoveredLink(null);
    };
  }, [el.id]);

  // Not near: normal render
  if (!isNear) {
    return React.createElement('div', {
      style: { position: 'absolute', left: sx, top: sy, transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }
    },
      React.createElement('a', {
        href: el.url, target: '_blank', rel: 'noopener noreferrer',
        onClick: function(e) { e.stopPropagation(); },
        style: {
          color: color, fontSize: fontSize + 'px', fontFamily: config.contentFont,
          textDecoration: 'none', borderBottom: '2px solid ' + color + '50',
          paddingBottom: 3, cursor: 'pointer', textShadow: '0 0 12px ' + color + '40',
          whiteSpace: 'nowrap',
        }
      }, content)
    );
  }

  // Near: per-word parting
  var words = content.split(/(\s+)/);
  var totalW = content.length * charW;
  var cursorX = sx - totalW / 2;
  var elements = [];

  for (var wi = 0; wi < words.length; wi++) {
    var word = words[wi];
    if (!word) continue;
    var wordW = word.length * charW;
    var wordCX = cursorX + wordW / 2;

    var wdx = wordCX - playerSX;
    var wdy = sy - playerSY;
    var wDist = Math.sqrt(wdx * wdx + wdy * wdy);

    var offX = 0, offY = 0, opacity = 1;

    if (wDist < interactRadius) {
      var force = 1 - wDist / interactRadius;
      force = force * force * force;
      var pushAngle = Math.atan2(wdy, wdx);
      offX = Math.cos(pushAngle) * force * 50 * 1.8;
      offY = Math.sin(pushAngle) * force * 30;
      opacity = 0.4 + (1 - force) * 0.6;
    }

    if (word.trim() !== '') {
      elements.push(
        React.createElement('span', {
          key: wi,
          style: {
            position: 'absolute', left: wordCX + offX, top: sy + offY,
            transform: 'translate(-50%,-50%)',
            color: color, fontSize: fontSize + 'px', fontFamily: config.contentFont,
            opacity: opacity,
            textShadow: opacity < 0.9
              ? '0 0 ' + (15 + (1 - opacity) * 12) + 'px ' + color + '60'
              : '0 0 12px ' + color + '40',
            whiteSpace: 'pre', pointerEvents: 'none', userSelect: 'none',
          }
        }, word)
      );
    }
    cursorX += wordW;
  }

  return React.createElement('div', {
    style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }
  },
    elements,
    // Invisible clickable link overlay
    React.createElement('a', {
      href: el.url, target: '_blank', rel: 'noopener noreferrer',
      onClick: function(e) { e.stopPropagation(); },
      style: {
        position: 'absolute',
        left: sx - totalW / 2 - 10,
        top: sy - fontSize / 2 - 5,
        width: totalW + 20,
        height: fontSize + 10,
        pointerEvents: 'auto', cursor: 'pointer', zIndex: 10,
      }
    }),
    // Tooltip
    !isMobile ? React.createElement('div', {
      style: {
        position: 'absolute', left: sx, top: sy + fontSize / 2 + 18,
        transform: 'translateX(-50%)',
        padding: '4px 12px', background: 'rgba(0,0,0,0.85)',
        border: '1px solid ' + color + '40', borderRadius: 4,
        fontSize: 10, color: '#bbb', fontFamily: config.uiFont,
        whiteSpace: 'nowrap', pointerEvents: 'none',
      }
    }, 'Press SPACE to open') : null
  );
}

// =============================================================
// TEXT WRAPPING HELPER — simulates word wrap
// =============================================================

function wrapText(text, maxWidth, charWidth) {
  var paragraphs = text.split('\n');
  var allLines = [];

  for (var p = 0; p < paragraphs.length; p++) {
    var para = paragraphs[p];
    if (para === '') { allLines.push(''); continue; }

    var words = para.split(' ');
    var currentLine = '';

    for (var w = 0; w < words.length; w++) {
      var testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
      var testWidth = testLine.length * charWidth;

      if (testWidth > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) allLines.push(currentLine);
  }

  return allLines;
}