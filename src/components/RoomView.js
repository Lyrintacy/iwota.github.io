import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
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

    drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources);

    var canFwd = ci < rooms.length - 1;
    var canBack = ci > 0;

    if (canBack) {
      drawDoor(ctx, rX + rW / 2 - DOOR_W / 2, rY + rH - DOOR_H,
        DOOR_W, DOOR_H, config.entranceDoorColor, now, false);
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
        px = npx;
        py = npy;
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

    // Character drawing
    var plx = rX + px * rW;
    var ply = rY + py * rH;

    var lg = ctx.createRadialGradient(plx, ply - 6, 0, plx, ply - 6, 80);
    lg.addColorStop(0, sColor + '16');
    lg.addColorStop(0.4, sColor + '08');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(plx - 80, ply - 86, 160, 160);

    var HEAD_W = 20, HEAD_H = 14, BODY_W = 12, BODY_H = 8;
    var LEG_W = 4, LEG_H = 5, LEG_GAP = 4;
    var legY = ply + 7;
    var bodyY = ply - 1;
    var headY = ply - 12;
    var bodyX = plx - BODY_W / 2;
    var headX = plx - HEAD_W / 2;
    var lLegX = plx - LEG_GAP / 2 - LEG_W;
    var rLegX = plx + LEG_GAP / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(plx, legY + LEG_H + 2, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = config.legColor;
    ctx.fillRect(lLegX, legY, LEG_W, LEG_H);
    ctx.fillRect(rLegX, legY, LEG_W, LEG_H);

    ctx.fillStyle = config.bodyColor;
    ctx.fillRect(bodyX, bodyY, BODY_W, BODY_H);

    ctx.fillStyle = sColor + '45';
    ctx.fillRect(bodyX, bodyY + 3, BODY_W, 2);

    ctx.fillStyle = config.headColor;
    ctx.fillRect(headX, headY, HEAD_W, HEAD_H);

    ctx.strokeStyle = sColor + '30';
    ctx.lineWidth = 1;
    ctx.strokeRect(headX + 0.5, headY + 0.5, HEAD_W - 1, HEAD_H - 1);

    var eyeSize = 6, eyeGap = 2, eyeY2 = headY + 5;
    ctx.fillStyle = config.eyeColor;
    ctx.fillRect(plx - eyeGap / 2 - eyeSize, eyeY2, eyeSize, eyeSize);
    ctx.fillRect(plx + eyeGap / 2, eyeY2, eyeSize, eyeSize);

    ctx.fillStyle = sColor + '22';
    ctx.fillRect(headX + 2, eyeY2 + eyeSize, 3, 2);
    ctx.fillRect(headX + HEAD_W - 5, eyeY2 + eyeSize, 3, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px "Concert One", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((ci + 1) + ' / ' + rooms.length, rX + 10, rY + rH - 10);

    ctx.fillStyle = sColor + '60';
    ctx.textAlign = 'center';
    ctx.fillText(section.name.toUpperCase(), w / 2, rY - WALL_DEPTH + 16);

    if (canFwd) {
      var exitNX = 0.5, exitNY = 0.02;
      if (room.exitDirection === 'left') { exitNX = 0.02; exitNY = 0.5; }
      else if (room.exitDirection === 'right') { exitNX = 0.98; exitNY = 0.5; }
      var startDist = Math.sqrt(Math.pow(0.5 - exitNX, 2) + Math.pow(0.82 - exitNY, 2));
      var curDist = Math.sqrt(Math.pow(px - exitNX, 2) + Math.pow(py - exitNY, 2));
      var progress = Math.max(0, Math.min(1, 1 - curDist / startDist));
      if (progress > 0.05) {
        var bW = rW * 0.3, bH2 = 3;
        var bX = (w - bW) / 2, bY2 = rY + rH + WALL_DEPTH + 14;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(bX, bY2, bW, bH2);
        ctx.fillStyle = sColor + '70';
        ctx.fillRect(bX, bY2, bW * progress, bH2);
      }
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [isMobile]);

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
      <ContentOverlay containerRef={containerRef} isMobile={isMobile} />
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

function gridSegColor(nx, ny, glowSources) {
  var baseAlpha = config.gridBaseAlpha;
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

function drawRoom(ctx, rX, rY, rW, rH, sColor, now, glowSources) {
  var fg = ctx.createRadialGradient(rX + rW / 2, rY + rH / 2, 10, rX + rW / 2, rY + rH / 2, rW * 0.7);
  fg.addColorStop(0, config.floorCenter);
  fg.addColorStop(0.5, config.floorMid);
  fg.addColorStop(1, config.floorEdge);
  ctx.fillStyle = fg;
  ctx.fillRect(rX, rY, rW, rH);

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
  var gt = ctx.createLinearGradient(0, rY - d, 0, rY);
  gt.addColorStop(0, config.wallOuter); gt.addColorStop(0.3, config.wallMidDark);
  gt.addColorStop(0.7, config.wallMidBright); gt.addColorStop(1, config.wallInner);
  ctx.fillStyle = gt;
  ctx.beginPath(); ctx.moveTo(rX - d, rY - d); ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW, rY); ctx.lineTo(rX, rY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.lineWidth = 0.5; ctx.stroke();

  var gb = ctx.createLinearGradient(0, rY + rH, 0, rY + rH + d);
  gb.addColorStop(0, config.wallInner); gb.addColorStop(0.3, config.wallMidBright);
  gb.addColorStop(0.7, config.wallMidDark); gb.addColorStop(1, config.wallOuter);
  ctx.fillStyle = gb;
  ctx.beginPath(); ctx.moveTo(rX, rY + rH); ctx.lineTo(rX + rW, rY + rH);
  ctx.lineTo(rX + rW + d, rY + rH + d); ctx.lineTo(rX - d, rY + rH + d); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  var gl = ctx.createLinearGradient(rX - d, 0, rX, 0);
  gl.addColorStop(0, config.wallOuter); gl.addColorStop(0.3, '#3a3a50');
  gl.addColorStop(0.7, '#555570'); gl.addColorStop(1, '#707088');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.moveTo(rX - d, rY - d); ctx.lineTo(rX, rY);
  ctx.lineTo(rX, rY + rH); ctx.lineTo(rX - d, rY + rH + d); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  var gr = ctx.createLinearGradient(rX + rW, 0, rX + rW + d, 0);
  gr.addColorStop(0, '#707088'); gr.addColorStop(0.3, '#555570');
  gr.addColorStop(0.7, '#3a3a50'); gr.addColorStop(1, config.wallOuter);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(rX + rW, rY); ctx.lineTo(rX + rW + d, rY - d);
  ctx.lineTo(rX + rW + d, rY + rH + d); ctx.lineTo(rX + rW, rY + rH); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sColor + '20'; ctx.stroke();

  ctx.strokeStyle = sColor + '45'; ctx.lineWidth = 1.5; ctx.strokeRect(rX, rY, rW, rH);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.strokeRect(rX + 1, rY + 1, rW - 2, rH - 2);

  var corners = [[rX, rY], [rX + rW, rY], [rX, rY + rH], [rX + rW, rY + rH]];
  for (var c = 0; c < corners.length; c++) {
    var cg = ctx.createRadialGradient(corners[c][0], corners[c][1], 0, corners[c][0], corners[c][1], 35);
    cg.addColorStop(0, sColor + '30'); cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg; ctx.fillRect(corners[c][0] - 35, corners[c][1] - 35, 70, 70);
  }
}

function drawDoor(ctx, x, y, w, h, color, now, isExit) {
  var maxD = Math.max(w, h);
  var glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, maxD * 1.3);
  glow.addColorStop(0, color + '50'); glow.addColorStop(0.5, color + '18'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(x - 18, y - 18, w + 36, h + 36);
  ctx.fillStyle = isExit ? color + '80' : color + '35'; ctx.fillRect(x, y, w, h);
  var p = (Math.sin(now * 0.003) + 1) * 0.5;
  var ph = Math.floor(25 + p * 40).toString(16);
  if (ph.length < 2) ph = '0' + ph;
  ctx.fillStyle = isExit ? color + ph : color + '12'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function drawArrow(ctx, dir, rect, color) {
  ctx.fillStyle = color + 'bb'; ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (dir === 'left') ctx.fillText('\u25C0', rect.x - 14, rect.y + rect.h / 2);
  else if (dir === 'right') ctx.fillText('\u25B6', rect.x + rect.w + 14, rect.y + rect.h / 2);
  else ctx.fillText('\u25B2', rect.x + rect.w / 2, rect.y - 14);
}

// =============================================
// HTML CONTENT OVERLAY — with per-letter physics
// =============================================

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

  // Collect image positions for text avoidance
  var imageElements = [];
  for (var i = 0; i < room.elements.length; i++) {
    if (room.elements[i].type === 'image') {
      imageElements.push(room.elements[i]);
    }
  }

  return React.createElement('div', {
    style: { position: 'absolute', inset: 0, pointerEvents: 'none' }
  }, room.elements.map(function(el) {
    // Calculate text offset to avoid overlapping images
    var avoidOffX = 0;
    var avoidOffY = 0;
    if (el.type === 'text' || el.type === 'link') {
      for (var im = 0; im < imageElements.length; im++) {
        var img = imageElements[im];
        var dx = el.x - img.x;
        var dy = el.y - img.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var avoidRadius = 0.18;
        if (dist < avoidRadius && dist > 0.001) {
          var force = (1 - dist / avoidRadius) * 0.08;
          var angle = Math.atan2(dy, dx);
          avoidOffX += Math.cos(angle) * force * rW;
          avoidOffY += Math.sin(angle) * force * rH;
        }
      }
    }

    return React.createElement(ElementRenderer, {
      key: el.id, el: el,
      rX: rX, rY: rY, rW: rW, rH: rH,
      playerPos: playerPos, sectionColor: section.color,
      showEditor: showEditor, isMobile: isMobile,
      avoidOffX: avoidOffX, avoidOffY: avoidOffY,
    });
  }));
}

function ElementRenderer(props) {
  var el = props.el;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var playerPos = props.playerPos;
  var sectionColor = props.sectionColor;
  var showEditor = props.showEditor;
  var isMobile = props.isMobile;
  var avoidOffX = props.avoidOffX || 0;
  var avoidOffY = props.avoidOffY || 0;

  var sx = rX + el.x * rW + avoidOffX;
  var sy = rY + el.y * rH + avoidOffY;
  var dx = el.x - playerPos.x;
  var dy = el.y - playerPos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var radius = 0.15;
  var near = dist < radius && !showEditor;

  if (el.type === 'text') {
    return React.createElement(TextWithLetterPhysics, {
      el: el, sx: sx, sy: sy, near: near,
      playerPos: playerPos, rX: rX, rY: rY, rW: rW, rH: rH,
      sectionColor: sectionColor, radius: radius,
    });
  }

  if (el.type === 'image') {
    var imgOp = 1;
    var imgOffX = 0, imgOffY = 0;
    if (near) {
      var force = 1 - dist / radius;
      imgOp = 0.25 + (1 - force) * 0.75;
      var angle = Math.atan2(dy, dx);
      imgOffX = Math.cos(angle) * force * 15;
      imgOffY = Math.sin(angle) * force * 12;
    }
    return React.createElement('div', {
      style: {
        position: 'absolute', left: sx + imgOffX, top: sy + imgOffY,
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
      key: el.id, el: el, sx: sx, sy: sy,
      near: near, playerPos: playerPos,
      rX: rX, rY: rY, rW: rW, rH: rH,
      sectionColor: sectionColor, radius: radius, isMobile: isMobile,
    });
  }

  return null;
}

// =============================================
// TEXT WITH PER-LETTER PHYSICS
// =============================================

function TextWithLetterPhysics(props) {
  var el = props.el;
  var sx = props.sx, sy = props.sy;
  var near = props.near;
  var playerPos = props.playerPos;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var sectionColor = props.sectionColor;
  var radius = props.radius;

  var fontSize = (el.fontSize || 1) * 16;
  var charWidth = fontSize * 0.62;
  var lineHeight = fontSize * 1.6;
  var content = el.content || '';
  var color = el.color || '#fff';

  // Split into lines
  var lines = content.split('\n');

  // Player screen position
  var playerSX = rX + playerPos.x * rW;
  var playerSY = rY + playerPos.y * rH;

  // If player is NOT near, render as normal text (performance)
  if (!near) {
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
        maxWidth: el.maxWidth ? el.maxWidth + 'px' : '520px',
        lineHeight: 1.6,
        userSelect: 'text', pointerEvents: 'auto', cursor: 'text',
        textShadow: '0 0 8px ' + (color) + '30',
        whiteSpace: el.maxWidth ? 'pre-wrap' : 'nowrap',
      }
    }, content);
  }

  // Player IS near — render per-letter with physics
  var letterElements = [];
  var totalHeight = lines.length * lineHeight;
  var startY = sy - totalHeight / 2;

  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    var lineW = line.length * charWidth;
    var lineStartX = sx - lineW / 2;
    var lineY = startY + li * lineHeight + lineHeight / 2;

    for (var ci = 0; ci < line.length; ci++) {
      var ch = line[ci];
      var letterX = lineStartX + ci * charWidth + charWidth / 2;
      var letterY = lineY;

      // Distance from this specific letter to player
      var ldx = letterX - playerSX;
      var ldy = letterY - playerSY;
      var lDist = Math.sqrt(ldx * ldx + ldy * ldy);

      var letterRadius = 70;
      var offX = 0, offY = 0, rot = 0, opacity = 1, scale = 1;

      if (lDist < letterRadius) {
        var force = 1 - lDist / letterRadius;
        force = force * force; // Quadratic falloff — sharper near center
        var lAngle = Math.atan2(ldy, ldx);

        offX = Math.cos(lAngle) * force * 35;
        offY = Math.sin(lAngle) * force * 30;
        rot = (Math.random() - 0.5) * force * 8;
        opacity = 0.4 + (1 - force) * 0.6;
        scale = 1 + force * 0.15;
      }

      letterElements.push(
        React.createElement('span', {
          key: li + '-' + ci,
          style: {
            display: 'inline-block',
            position: 'absolute',
            left: letterX + offX,
            top: letterY + offY,
            transform: 'translate(-50%,-50%) rotate(' + rot + 'deg) scale(' + scale + ')',
            color: color,
            fontSize: fontSize + 'px',
            fontFamily: config.contentFont,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            opacity: opacity,
            textShadow: '0 0 ' + (8 + (1 - opacity) * 20) + 'px ' + color + '50',
            transition: 'none',
            willChange: 'transform',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'pre',
          }
        }, ch === ' ' ? '\u00A0' : ch)
      );
    }
  }

  return React.createElement('div', {
    style: {
      position: 'absolute',
      left: 0, top: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none',
    }
  }, letterElements);
}

// =============================================
// LINK ELEMENT
// =============================================

function LinkEl(props) {
  var el = props.el, sx = props.sx, sy = props.sy;
  var near = props.near;
  var playerPos = props.playerPos;
  var rX = props.rX, rY = props.rY, rW = props.rW, rH = props.rH;
  var sectionColor = props.sectionColor;
  var radius = props.radius;
  var isMobile = props.isMobile;

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

  var color = el.color || sectionColor;
  var fontSize = (el.fontSize || 1) * 16;
  var content = el.content || '';
  var charWidth = fontSize * 0.62;

  var playerSX = rX + playerPos.x * rW;
  var playerSY = rY + playerPos.y * rH;

  // Normal rendering when not near
  if (!near) {
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
          fontSize: fontSize + 'px',
          fontFamily: config.contentFont,
          textDecoration: 'none',
          borderBottom: '2px solid ' + color + '50',
          paddingBottom: 3, cursor: 'pointer',
          textShadow: '0 0 12px ' + color + '40',
          whiteSpace: 'nowrap',
        }
      }, content)
    );
  }

  // Per-letter physics for links too
  var linkW = content.length * charWidth;
  var startX = sx - linkW / 2;
  var letterElements = [];

  for (var ci = 0; ci < content.length; ci++) {
    var ch = content[ci];
    var letterX = startX + ci * charWidth + charWidth / 2;
    var letterY = sy;

    var ldx = letterX - playerSX;
    var ldy = letterY - playerSY;
    var lDist = Math.sqrt(ldx * ldx + ldy * ldy);

    var letterRadius = 65;
    var offX = 0, offY = 0, rot = 0, opacity = 1;

    if (lDist < letterRadius) {
      var force = 1 - lDist / letterRadius;
      force = force * force;
      var lAngle = Math.atan2(ldy, ldx);
      offX = Math.cos(lAngle) * force * 30;
      offY = Math.sin(lAngle) * force * 25;
      rot = (Math.random() - 0.5) * force * 6;
      opacity = 0.5 + (1 - force) * 0.5;
    }

    letterElements.push(
      React.createElement('span', {
        key: ci,
        style: {
          display: 'inline-block',
          position: 'absolute',
          left: letterX + offX,
          top: letterY + offY,
          transform: 'translate(-50%,-50%) rotate(' + rot + 'deg)',
          color: color,
          fontSize: fontSize + 'px',
          fontFamily: config.contentFont,
          opacity: opacity,
          textShadow: '0 0 ' + (12 + (1 - opacity) * 15) + 'px ' + color + '60',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'pre',
        }
      }, ch === ' ' ? '\u00A0' : ch)
    );
  }

  return React.createElement('div', {
    style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }
  },
    letterElements,
    // Clickable invisible link on top
    React.createElement('a', {
      href: el.url, target: '_blank', rel: 'noopener noreferrer',
      onClick: function(e) { e.stopPropagation(); },
      style: {
        position: 'absolute',
        left: sx - linkW / 2 - 10,
        top: sy - fontSize / 2 - 5,
        width: linkW + 20,
        height: fontSize + 10,
        pointerEvents: 'auto',
        cursor: 'pointer',
        zIndex: 10,
      }
    }),
    // "Press SPACE" tooltip — not on mobile
    !isMobile ? React.createElement('div', {
      style: {
        position: 'absolute', left: sx, top: sy + fontSize / 2 + 15,
        transform: 'translateX(-50%)',
        padding: '4px 12px', background: 'rgba(0,0,0,0.85)',
        border: '1px solid ' + color + '40',
        borderRadius: 4, fontSize: 10, color: '#bbb',
        fontFamily: config.uiFont, whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }
    }, 'Press SPACE to open') : null
  );
}