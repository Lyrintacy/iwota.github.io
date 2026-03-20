import React, { useRef, useEffect, useCallback, useState } from 'react';
import useStore from '../store/useStore';
import config from '../config';

var WALL_DEPTH = 58;
var DOOR_W = 80;
var DOOR_H = 14;
var GRID_SIZE = 42;
var BG_COLOR = '#22213a';

export default function RoomView() {
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

    // Lerp player toward target each frame
    useStore.getState().lerpPlayerToTarget();

    // Gray background (lighter than room floor)
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Room dimensions
    var rW = Math.min(w - 50, 720);
    var rH = Math.min(h - 36, 600);
    var rX = (w - rW) / 2;
    var rY = (h - rH) / 2;

    // Collect glow sources for reactive grid
    var glowSources = [];
    glowSources.push({
      nx: playerPos.x, ny: playerPos.y,
      color: sColor, radius: 0.18, intensity: 1.0
    });
    for (var ei = 0; ei < room.elements.length; ei++) {
      var elem = room.elements[ei];
      glowSources.push({
        nx: elem.x, ny: elem.y,
        color: elem.color || sColor,
        radius: elem.type === 'image' ? 0.14 : 0.13,
        intensity: 0.7
      });
    }

    // Draw room
    drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources);

    // Doors
    var canFwd = ci < rooms.length - 1;
    var canBack = ci > 0;

    if (canBack) {
      drawDoor(ctx, rX + rW / 2 - DOOR_W / 2, rY + rH - DOOR_H,
        DOOR_W, DOOR_H, '#666680', now, false);
    }
    if (canFwd) {
      var ed = exitRect(room.exitDirection, rX, rY, rW, rH);
      drawDoor(ctx, ed.x, ed.y, ed.w, ed.h, sColor, now, true);
      drawArrow(ctx, room.exitDirection, ed, sColor);
    }

    // WASD movement
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
        px = npx;
        py = npy;
      }
    }

    // Door collision
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

    // ---- DRAW CHARACTER ----
    var plx = rX + px * rW;
    var ply = rY + py * rH;

    // Soft glow only (no ring)
    var lg = ctx.createRadialGradient(plx, ply - 6, 0, plx, ply - 6, 80);
    lg.addColorStop(0, sColor + '16');
    lg.addColorStop(0.4, sColor + '08');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(plx - 80, ply - 86, 160, 160);

    // Character dimensions
    var HEAD_W = 20;
    var HEAD_H = 15;
    var BODY_W = 12;
    var BODY_H = 8;
    var LEG_W = 4;
    var LEG_H = 5;
    var LEG_GAP = 4;

    // Positions (head squashes down onto body)
    var legY = ply + 7;
    var bodyY = ply - 1;
    var headY = ply - 12;

    var bodyX = plx - BODY_W / 2;
    var headX = plx - HEAD_W / 2;
    var lLegX = plx - LEG_GAP / 2 - LEG_W;
    var rLegX = plx + LEG_GAP / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
    ctx.beginPath();
    ctx.ellipse(plx, legY + LEG_H + 2, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#c4b0b0';
    ctx.fillRect(lLegX, legY, LEG_W, LEG_H);
    ctx.fillRect(rLegX, legY, LEG_W, LEG_H);

    // Body (same width as leg span)
    ctx.fillStyle = '#e0d0d0';
    ctx.fillRect(bodyX, bodyY, BODY_W, BODY_H);

    // Section color stripe
    ctx.fillStyle = sColor + '45';
    ctx.fillRect(bodyX, bodyY + 3, BODY_W, 2);

    // Head (wider, squashed, overlaps body by 3px)
    ctx.fillStyle = '#f6eaea';
    ctx.fillRect(headX, headY, HEAD_W, HEAD_H);

    // Head border
    ctx.strokeStyle = sColor + '30';
    ctx.lineWidth = 1;
    ctx.strokeRect(headX + 0.5, headY + 0.5, HEAD_W - 1, HEAD_H - 1);

    // Eyes (big black squares, no shine)
    var eyeSize = 6;
    var eyeGap = 2;
    var eyeY2 = headY + 5;
    var leftEyeX = plx - eyeGap / 2 - eyeSize;
    var rightEyeX = plx + eyeGap / 2;

    ctx.fillStyle = '#111';
    ctx.fillRect(leftEyeX, eyeY2, eyeSize, eyeSize);
    ctx.fillRect(rightEyeX, eyeY2, eyeSize, eyeSize);

    // Blush (section color)
    ctx.fillStyle = sColor + '22';
    ctx.fillRect(headX + 2, eyeY2 + eyeSize, 3, 2);
    ctx.fillRect(headX + HEAD_W - 5, eyeY2 + eyeSize, 3, 2);

    // Room info
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px "Concert One", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((ci + 1) + ' / ' + rooms.length, rX + 10, rY + rH - 10);

    ctx.fillStyle = sColor + '60';
    ctx.textAlign = 'center';
    ctx.fillText(section.name.toUpperCase(), w / 2, rY - WALL_DEPTH + 16);

    // Progress bar toward exit
    if (canFwd) {
      var exitNX = 0.5, exitNY = 0.02;
      if (room.exitDirection === 'left') { exitNX = 0.02; exitNY = 0.5; }
      else if (room.exitDirection === 'right') { exitNX = 0.98; exitNY = 0.5; }

      var startDist = Math.sqrt(Math.pow(0.5 - exitNX, 2) + Math.pow(0.82 - exitNY, 2));
      var curDist = Math.sqrt(Math.pow(px - exitNX, 2) + Math.pow(py - exitNY, 2));
      var progress = Math.max(0, Math.min(1, 1 - curDist / startDist));

      if (progress > 0.05) {
        var bW = rW * 0.3;
        var bH2 = 3;
        var bX = (w - bW) / 2;
        var bY = rY + rH + WALL_DEPTH + 14;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(bX, bY, bW, bH2);
        ctx.fillStyle = sColor + '70';
        ctx.fillRect(bX, bY, bW * progress, bH2);
      }
    }

    frameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(function() {
    var resize = function() {
      var c = containerRef.current;
      var cv = canvasRef.current;
      if (!c || !cv) return;
      var r = c.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      cv.style.width = r.width + 'px';
      cv.style.height = r.height + 'px';
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
      <ContentOverlay containerRef={containerRef} />
    </div>
  );
}

// ---- HELPERS ----

function findSec(sections, id) {
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].id === id) return sections[i];
  }
  return { color: '#6366f1', name: '?', id: id };
}

function exitRect(dir, rX, rY, rW, rH) {
  if (dir === 'top') return { x: rX + rW / 2 - DOOR_W / 2, y: rY, w: DOOR_W, h: DOOR_H };
  if (dir === 'left') return { x: rX, y: rY + rH / 2 - DOOR_W / 2, w: DOOR_H, h: DOOR_W };
  if (dir === 'right') return { x: rX + rW - DOOR_H, y: rY + rH / 2 - DOOR_W / 2, w: DOOR_H, h: DOOR_W };
  return { x: rX + rW / 2 - DOOR_W / 2, y: rY, w: DOOR_W, h: DOOR_H };
}

// ---- GRID SEGMENT COLOR (reactive to glow sources) ----

function gridSegColor(nx, ny, glowSources) {
  var baseAlpha = 0.025;
  var bestStrength = 0;
  var bestColor = null;

  for (var i = 0; i < glowSources.length; i++) {
    var g = glowSources[i];
    var dx = nx - g.nx;
    var dy = ny - g.ny;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < g.radius) {
      var strength = (1 - dist / g.radius) * g.intensity;
      if (strength > bestStrength) {
        bestStrength = strength;
        bestColor = g.color;
      }
    }
  }

  if (bestStrength > 0.01 && bestColor) {
    var alpha = Math.min(baseAlpha + bestStrength * 0.2, 0.25);
    var alphaInt = Math.floor(alpha * 255);
    var hex = alphaInt.toString(16);
    if (hex.length < 2) hex = '0' + hex;
    return bestColor + hex;
  }

  return 'rgba(255,255,255,' + baseAlpha + ')';
}

// ---- ROOM DRAWING ----

function drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources) {
  // Very dark floor
  var fg = ctx.createRadialGradient(
    rX + rW / 2, rY + rH / 2, 10,
    rX + rW / 2, rY + rH / 2, rW * 0.7
  );
  fg.addColorStop(0, '#212124');
  fg.addColorStop(0.5, '#111111');
  fg.addColorStop(1, '#000000');
  ctx.fillStyle = fg;
  ctx.fillRect(rX, rY, rW, rH);

  // ---- REACTIVE GRID (sharp 1px lines) ----
  ctx.lineWidth = 1;

  // Vertical line segments
  for (var vx = rX + GRID_SIZE; vx < rX + rW; vx += GRID_SIZE) {
    var svx = Math.floor(vx) + 0.5; // pixel-perfect alignment
    for (var vy = rY; vy < rY + rH; vy += GRID_SIZE) {
      var segEnd = Math.min(vy + GRID_SIZE, rY + rH);
      var midNX = (vx - rX) / rW;
      var midNY = ((vy + segEnd) / 2 - rY) / rH;

      ctx.strokeStyle = gridSegColor(midNX, midNY, glowSources);
      ctx.beginPath();
      ctx.moveTo(svx, vy);
      ctx.lineTo(svx, segEnd);
      ctx.stroke();
    }
  }

  // Horizontal line segments
  for (var hy = rY + GRID_SIZE; hy < rY + rH; hy += GRID_SIZE) {
    var shy = Math.floor(hy) + 0.5;
    for (var hx = rX; hx < rX + rW; hx += GRID_SIZE) {
      var hSegEnd = Math.min(hx + GRID_SIZE, rX + rW);
      var hMidNX = ((hx + hSegEnd) / 2 - rX) / rW;
      var hMidNY = (hy - rY) / rH;

      ctx.strokeStyle = gridSegColor(hMidNX, hMidNY, glowSources);
      ctx.beginPath();
      ctx.moveTo(hx, shy);
      ctx.lineTo(hSegEnd, shy);
      ctx.stroke();
    }
  }

  // ---- WALLS (bright v2 style) ----
  var d = WALL_DEPTH;

  // Top wall
  var gt = ctx.createLinearGradient(0, rY - d, 0, rY);
  gt.addColorStop(0, '#6b756e88'); //the furhtest away
  gt.addColorStop(0.3, '#a3b0a793');
  gt.addColorStop(0.7, '#5a6962');
  gt.addColorStop(1, '#2a2e2d'); //the closest to the floor
  ctx.fillStyle = gt;
  ctx.beginPath();
  ctx.moveTo(rX - d, rY - d); ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW, rY); ctx.lineTo(rX, rY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.lineWidth = 0.5; ctx.stroke();

  // Bottom wall
  var gb = ctx.createLinearGradient(0, rY + rH, 0, rY + rH + d);
  gb.addColorStop(0, '#2a2e2d'); //the closest to the floor
  gb.addColorStop(0.3, '#5a6962');
  gb.addColorStop(0.7, '#a3b0a779');
  gb.addColorStop(1, '#6b756e79'); //the furhtest away
  ctx.fillStyle = gb;
  ctx.beginPath();
  ctx.moveTo(rX, rY + rH); ctx.lineTo(rX + rW, rY + rH);
  ctx.lineTo(rX + rW + d, rY + rH + d); ctx.lineTo(rX - d, rY + rH + d);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  // Left wall
  var gl = ctx.createLinearGradient(rX - d, 0, rX, 0);
  gl.addColorStop(0, '#6b756e77');//the furhtest away
  gl.addColorStop(0.3, '#a3b0a779');
  gl.addColorStop(0.7, '#5a6962');
  gl.addColorStop(1, '#2a2e2d'); //the closest to the floor
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.moveTo(rX - d, rY - d); ctx.lineTo(rX, rY);
  ctx.lineTo(rX, rY + rH); ctx.lineTo(rX - d, rY + rH + d);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  // Right wall
  var gr = ctx.createLinearGradient(rX + rW, 0, rX + rW + d, 0);
  gr.addColorStop(0, '#2a2e2d'); //the closest to the floor
  gr.addColorStop(0.3, '#5a6962');
  gr.addColorStop(0.7, '#a3b0a781');
  gr.addColorStop(1, '#6b756e85'); //the furhtest away
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(rX + rW, rY); ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW + d, rY + rH + d); ctx.lineTo(rX + rW, rY + rH);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  // Room border
  ctx.strokeStyle = sColor + '45';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rX, rY, rW, rH);

  // Inner edge
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rX + 1, rY + 1, rW - 2, rH - 2);

  // Corner accents
  var corners = [[rX, rY], [rX + rW, rY], [rX, rY + rH], [rX + rW, rY + rH]];
  for (var c = 0; c < corners.length; c++) {
    var cg = ctx.createRadialGradient(
      corners[c][0], corners[c][1], 0,
      corners[c][0], corners[c][1], 35
    );
    cg.addColorStop(0, sColor + '30');
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.fillRect(corners[c][0] - 35, corners[c][1] - 35, 70, 70);
  }
}

function drawDoor(ctx, x, y, w, h, color, now, isExit) {
  var maxD = Math.max(w, h);
  var glow = ctx.createRadialGradient(
    x + w / 2, y + h / 2, 1,
    x + w / 2, y + h / 2, maxD * 1.3
  );
  glow.addColorStop(0, color + '50');
  glow.addColorStop(0.5, color + '18');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 18, y - 18, w + 36, h + 36);

  ctx.fillStyle = isExit ? color + '80' : color + '35';
  ctx.fillRect(x, y, w, h);

  var p = (Math.sin(now * 0.003) + 1) * 0.5;
  var ph = Math.floor(25 + p * 40).toString(16);
  if (ph.length < 2) ph = '0' + ph;
  ctx.fillStyle = isExit ? color + ph : color + '12';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function drawArrow(ctx, dir, rect, color) {
  ctx.fillStyle = color + 'bb';
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (dir === 'left') ctx.fillText('\u25C0', rect.x - 14, rect.y + rect.h / 2);
  else if (dir === 'right') ctx.fillText('\u25B6', rect.x + rect.w + 14, rect.y + rect.h / 2);
  else ctx.fillText('\u25B2', rect.x + rect.w / 2, rect.y - 14);
}

// ---- HTML CONTENT OVERLAY ----

function ContentOverlay(props) {
  var containerRef = props.containerRef;
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

  var rW = Math.min(size.w - 50, 720);
  var rH = Math.min(size.h - 36, 600);
  var rX = (size.w - rW) / 2;
  var rY = (size.h - rH) / 2;

  return React.createElement('div', {
    style: { position: 'absolute', inset: 0, pointerEvents: 'none' }
  }, room.elements.map(function(el) {
    return React.createElement(ElementRenderer, {
      key: el.id, el: el,
      rX: rX, rY: rY, rW: rW, rH: rH,
      playerPos: playerPos, sectionColor: section.color,
      showEditor: showEditor,
    });
  }));
}

function ElementRenderer(props) {
  var el = props.el;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var playerPos = props.playerPos;
  var sectionColor = props.sectionColor;
  var showEditor = props.showEditor;

  var sx = rX + el.x * rW;
  var sy = rY + el.y * rH;
  var dx = el.x - playerPos.x;
  var dy = el.y - playerPos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var radius = 0.13;
  var near = dist < radius && !showEditor;

  var offX = 0, offY = 0, distortion = 0, imgOp = 1;
  if (near) {
    var force = 1 - dist / radius;
    var angle = Math.atan2(dy, dx);
    offX = Math.cos(angle) * force * 22;
    offY = Math.sin(angle) * force * 18;
    distortion = force;
    imgOp = 0.25 + (1 - force) * 0.75;
  }

  if (el.type === 'text') {
    var ls = distortion * 5;
    var blur = distortion * 1.2;
    var skew = distortion * Math.sin(Date.now() * 0.008) * 2.5;
    return React.createElement('div', {
      style: {
        position: 'absolute', left: sx + offX, top: sy + offY,
        transform: 'translate(-50%,-50%) skewX(' + skew + 'deg)',
        color: el.color || '#fff',
        fontSize: ((el.fontSize || 1) * 16) + 'px',
        fontFamily: config.contentFont,
        fontWeight: el.fontWeight || 'normal',
        fontStyle: el.fontStyle || 'normal',
        letterSpacing: ls + 'px',
        filter: blur > 0.1 ? 'blur(' + blur + 'px)' : 'none',
        textAlign: 'center',
        maxWidth: el.maxWidth ? el.maxWidth + 'px' : '520px',
        lineHeight: 1.6, userSelect: 'text', pointerEvents: 'auto', cursor: 'text',
        textShadow: '0 0 ' + (8 + distortion * 18) + 'px ' + (el.color || sectionColor) + '30',
        transition: 'letter-spacing 0.1s, filter 0.1s',
        whiteSpace: el.maxWidth ? 'pre-wrap' : 'nowrap',
      }
    }, el.content);
  }

  if (el.type === 'image') {
    return React.createElement('div', {
      style: {
        position: 'absolute', left: sx + offX, top: sy + offY,
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
    return React.createElement(LinkEl, {
      key: el.id, el: el, sx: sx + offX, sy: sy + offY,
      near: near, distortion: distortion, sectionColor: sectionColor,
    });
  }

  return null;
}

function LinkEl(props) {
  var el = props.el, sx = props.sx, sy = props.sy;
  var near = props.near, distortion = props.distortion, sectionColor = props.sectionColor;
  var wasNearRef = useRef(false);

  useEffect(function() {
    if (near && !wasNearRef.current) {
      useStore.getState().setHoveredLink(el);
    } else if (!near && wasNearRef.current) {
      var cur = useStore.getState().hoveredLink;
      if (cur && cur.id === el.id) {
        useStore.getState().setHoveredLink(null);
      }
    }
    wasNearRef.current = near;
  });

  useEffect(function() {
    return function() {
      var cur = useStore.getState().hoveredLink;
      if (cur && cur.id === el.id) {
        useStore.getState().setHoveredLink(null);
      }
    };
  }, [el.id]);

  var ls = distortion * 3;
  var color = el.color || sectionColor;

  return React.createElement('div', {
    style: {
      position: 'absolute', left: sx, top: sy,
      transform: 'translate(-50%,-50%)', pointerEvents: 'auto',
    }
  },
    React.createElement('a', {
      href: el.url, target: '_blank', rel: 'noopener noreferrer',
      onClick: function(e) { e.stopPropagation(); },
      style: {
        color: color,
        fontSize: ((el.fontSize || 1) * 16) + 'px',
        fontFamily: config.contentFont,
        textDecoration: 'none', letterSpacing: ls + 'px',
        borderBottom: '2px solid ' + color + '50',
        paddingBottom: 3, cursor: 'pointer',
        textShadow: '0 0 12px ' + color + '40',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }
    }, el.content),
    near ? React.createElement('div', {
      style: {
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)', marginTop: 10,
        padding: '4px 12px', background: 'rgba(0,0,0,0.85)',
        border: '1px solid ' + color + '40',
        borderRadius: 4, fontSize: 10, color: '#bbb',
        fontFamily: "'Space Mono', monospace", whiteSpace: 'nowrap',
      }
    }, 'Press SPACE to open') : null
  );
}