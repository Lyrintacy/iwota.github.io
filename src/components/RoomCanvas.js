import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import useStore from '../store/useStore';

const ROOM_PADDING = 40;
const WALL_HEIGHT = 60;
const DOOR_WIDTH = 80;
const DOOR_HEIGHT = 14;
const PLAYER_SIZE = 18;

export default function RoomCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const sizeRef = useRef({ w: 800, h: 600 });
  
  const getState = useStore.getState;
  
  // Player interaction physics
  const elementOffsetsRef = useRef({});
  
  const getExitDoorRect = useCallback((exitDir, roomRect) => {
    const { x, y, w, h } = roomRect;
    switch (exitDir) {
      case 'top':
        return { dx: x + w / 2 - DOOR_WIDTH / 2, dy: y, dw: DOOR_WIDTH, dh: DOOR_HEIGHT };
      case 'left':
        return { dx: x, dy: y + h / 2 - DOOR_WIDTH / 2, dw: DOOR_HEIGHT, dh: DOOR_WIDTH };
      case 'right':
        return { dx: x + w - DOOR_HEIGHT, dy: y + h / 2 - DOOR_WIDTH / 2, dw: DOOR_HEIGHT, dh: DOOR_WIDTH };
      default:
        return { dx: x + w / 2 - DOOR_WIDTH / 2, dy: y, dw: DOOR_WIDTH, dh: DOOR_HEIGHT };
    }
  }, []);
  
  const getEntranceDoorRect = useCallback((roomRect) => {
    const { x, y, w, h } = roomRect;
    return { dx: x + w / 2 - DOOR_WIDTH / 2, dy: y + h - DOOR_HEIGHT, dw: DOOR_WIDTH, dh: DOOR_HEIGHT };
  }, []);
  
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = sizeRef.current;
    
    const state = getState();
    const room = state.rooms[state.currentRoomIndex];
    if (!room) return;
    
    const section = state.sections.find(s => s.id === room.section);
    const sectionColor = section ? section.color : '#6366f1';
    
    ctx.clearRect(0, 0, w, h);
    
    // Room dimensions
    const roomW = Math.min(w - 100, 600);
    const roomH = Math.min(h - 60, 520);
    const roomX = (w - roomW) / 2;
    const roomY = (h - roomH) / 2;
    const roomRect = { x: roomX, y: roomY, w: roomW, h: roomH };
    
    // -- Draw Floor --
    const floorGrad = ctx.createRadialGradient(
      roomX + roomW / 2, roomY + roomH / 2, 20,
      roomX + roomW / 2, roomY + roomH / 2, roomW * 0.7
    );
    floorGrad.addColorStop(0, '#1a1a2e');
    floorGrad.addColorStop(0.6, '#12121f');
    floorGrad.addColorStop(1, '#0a0a15');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(roomX, roomY, roomW, roomH);
    
    // Floor grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let gx = roomX; gx <= roomX + roomW; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, roomY);
      ctx.lineTo(gx, roomY + roomH);
      ctx.stroke();
    }
    for (let gy = roomY; gy <= roomY + roomH; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(roomX, gy);
      ctx.lineTo(roomX + roomW, gy);
      ctx.stroke();
    }
    
    // -- Draw Walls (pseudo-3D angled) --
    const drawWall = (side) => {
      ctx.save();
      const wallDepth = WALL_HEIGHT;
      let grad;
      
      switch (side) {
        case 'top':
          grad = ctx.createLinearGradient(roomX, roomY - wallDepth, roomX, roomY);
          grad.addColorStop(0, '#000000');
          grad.addColorStop(0.3, '#0d0d1a');
          grad.addColorStop(1, '#1a1a30');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(roomX - wallDepth, roomY - wallDepth);
          ctx.lineTo(roomX + roomW + wallDepth, roomY - wallDepth);
          ctx.lineTo(roomX + roomW, roomY);
          ctx.lineTo(roomX, roomY);
          ctx.closePath();
          ctx.fill();
          break;
        case 'bottom':
          grad = ctx.createLinearGradient(roomX, roomY + roomH, roomX, roomY + roomH + wallDepth);
          grad.addColorStop(0, '#1a1a30');
          grad.addColorStop(0.7, '#0d0d1a');
          grad.addColorStop(1, '#000000');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(roomX, roomY + roomH);
          ctx.lineTo(roomX + roomW, roomY + roomH);
          ctx.lineTo(roomX + roomW + wallDepth, roomY + roomH + wallDepth);
          ctx.lineTo(roomX - wallDepth, roomY + roomH + wallDepth);
          ctx.closePath();
          ctx.fill();
          break;
        case 'left':
          grad = ctx.createLinearGradient(roomX - wallDepth, roomY, roomX, roomY);
          grad.addColorStop(0, '#000000');
          grad.addColorStop(0.3, '#0a0a18');
          grad.addColorStop(1, '#151528');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(roomX - wallDepth, roomY - wallDepth);
          ctx.lineTo(roomX, roomY);
          ctx.lineTo(roomX, roomY + roomH);
          ctx.lineTo(roomX - wallDepth, roomY + roomH + wallDepth);
          ctx.closePath();
          ctx.fill();
          break;
        case 'right':
          grad = ctx.createLinearGradient(roomX + roomW, roomY, roomX + roomW + wallDepth, roomY);
          grad.addColorStop(0, '#151528');
          grad.addColorStop(0.7, '#0a0a18');
          grad.addColorStop(1, '#000000');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(roomX + roomW, roomY);
          ctx.lineTo(roomX + roomW + wallDepth, roomY - wallDepth);
          ctx.lineTo(roomX + roomW + wallDepth, roomY + roomH + wallDepth);
          ctx.lineTo(roomX + roomW, roomY + roomH);
          ctx.closePath();
          ctx.fill();
          break;
      }
      
      // Wall edge line
      ctx.strokeStyle = `${sectionColor}22`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    };
    
    drawWall('top');
    drawWall('bottom');
    drawWall('left');
    drawWall('right');
    
    // Wall border lines
    ctx.strokeStyle = `${sectionColor}40`;
    ctx.lineWidth = 2;
    ctx.strokeRect(roomX, roomY, roomW, roomH);
    
    // Corner glow
    const corners = [
      [roomX, roomY],
      [roomX + roomW, roomY],
      [roomX, roomY + roomH],
      [roomX + roomW, roomY + roomH],
    ];
    corners.forEach(([cx, cy]) => {
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      cGrad.addColorStop(0, `${sectionColor}30`);
      cGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad;
      ctx.fillRect(cx - 30, cy - 30, 60, 60);
    });
    
    // -- Draw Doors --
    const drawDoor = (rect, isExit) => {
      const { dx, dy, dw, dh } = rect;
      
      // Door glow
      const glowGrad = ctx.createRadialGradient(
        dx + dw / 2, dy + dh / 2, 2,
        dx + dw / 2, dy + dh / 2, Math.max(dw, dh)
      );
      const doorColor = isExit ? sectionColor : '#555577';
      glowGrad.addColorStop(0, `${doorColor}60`);
      glowGrad.addColorStop(0.5, `${doorColor}20`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(dx - 20, dy - 20, dw + 40, dh + 40);
      
      // Door body
      ctx.fillStyle = isExit ? `${doorColor}90` : '#33335560';
      ctx.fillRect(dx, dy, dw, dh);
      
      // Door inner glow
      const pulse = (Math.sin(Date.now() * 0.003) + 1) * 0.5;
      ctx.fillStyle = isExit ? `${doorColor}${Math.floor(30 + pulse * 40).toString(16)}` : '#44445530';
      ctx.fillRect(dx + 3, dy + 3, dw - 6, dh - 6);
      
      // Arrow indicator for exit
      if (isExit) {
        ctx.fillStyle = `${doorColor}cc`;
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        const arrowY = room.exitDirection === 'top' ? dy - 8 :
                       dy + dh + 16;
        const arrowX = dx + dw / 2;
        const arrows = { top: '▲', left: '◄', right: '►' };
        if (room.exitDirection === 'left') {
          ctx.fillText(arrows[room.exitDirection], dx - 12, dy + dh / 2 + 5);
        } else if (room.exitDirection === 'right') {
          ctx.fillText(arrows[room.exitDirection], dx + dw + 12, dy + dh / 2 + 5);
        } else {
          ctx.fillText(arrows[room.exitDirection] || '▲', arrowX, arrowY);
        }
      }
    };
    
    // Entrance door (bottom)
    const entranceDoor = getEntranceDoorRect(roomRect);
    if (state.currentRoomIndex > 0) {
      drawDoor(entranceDoor, false);
    }
    
    // Exit door
    if (state.currentRoomIndex < state.rooms.length - 1) {
      const exitDoor = getExitDoorRect(room.exitDirection, roomRect);
      drawDoor(exitDoor, true);
    }
    
    // -- Update player position --
    const keys = state.keysPressed;
    let px = state.playerPos.x;
    let py = state.playerPos.y;
    const speed = state.playerSpeed;
    
    if (!state.transitioning) {
      if (keys['w'] || keys['arrowup']) py -= speed;
      if (keys['s'] || keys['arrowdown']) py += speed;
      if (keys['a'] || keys['arrowleft']) px -= speed;
      if (keys['d'] || keys['arrowright']) px += speed;
      
      // Clamp to room bounds (normalized 0-1)
      const margin = 0.03;
      px = Math.max(margin, Math.min(1 - margin, px));
      py = Math.max(margin, Math.min(1 - margin, py));
      
      // Check door collision
      const playerScreenX = roomX + px * roomW;
      const playerScreenY = roomY + py * roomH;
      
      // Exit door collision
      if (state.currentRoomIndex < state.rooms.length - 1) {
        const ed = getExitDoorRect(room.exitDirection, roomRect);
        if (
          playerScreenX > ed.dx - 10 && playerScreenX < ed.dx + ed.dw + 10 &&
          playerScreenY > ed.dy - 10 && playerScreenY < ed.dy + ed.dh + 10
        ) {
          state.navigateNext();
        }
      }
      
      // Entrance door collision (go back)
      if (state.currentRoomIndex > 0) {
        const ent = getEntranceDoorRect(roomRect);
        if (
          playerScreenX > ent.dx - 10 && playerScreenX < ent.dx + ent.dw + 10 &&
          playerScreenY > ent.dy + ent.dh - 5 && playerScreenY > ent.dy + ent.dh
        ) {
          if (py > 0.97) {
            state.navigatePrev();
          }
        }
      }
      
      useStore.setState({ playerPos: { x: px, y: py } });
    }
    
    // -- Draw player light --
    const plx = roomX + px * roomW;
    const ply = roomY + py * roomH;
    
    const lightGrad = ctx.createRadialGradient(plx, ply, 0, plx, ply, 120);
    lightGrad.addColorStop(0, `${sectionColor}15`);
    lightGrad.addColorStop(0.5, `${sectionColor}08`);
    lightGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(plx - 120, ply - 120, 240, 240);
    
    // -- Draw Player --
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(plx, ply + PLAYER_SIZE * 0.6, PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    const bodyGrad = ctx.createRadialGradient(plx, ply - 2, 2, plx, ply, PLAYER_SIZE * 0.8);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.4, sectionColor);
    bodyGrad.addColorStop(1, `${sectionColor}80`);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(plx, ply, PLAYER_SIZE * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Player glow ring
    ctx.strokeStyle = `${sectionColor}60`;
    ctx.lineWidth = 2;
    const ringPulse = (Math.sin(Date.now() * 0.004) + 1) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(plx, ply, PLAYER_SIZE * 0.5 * ringPulse + 3, 0, Math.PI * 2);
    ctx.stroke();
    
    // Eyes
    const eyeOffX = 4;
    const eyeY = ply - 2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(plx - eyeOffX, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(plx + eyeOffX, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Room number indicator
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '11px Space Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Room ${state.currentRoomIndex + 1}/${state.rooms.length}`, roomX + 8, roomY + roomH - 8);
    
    // Section name at top
    if (section) {
      ctx.fillStyle = `${sectionColor}60`;
      ctx.font = '10px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(section.name.toUpperCase(), roomX + roomW / 2, roomY - WALL_HEIGHT + 15);
    }
    
    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [getState, getExitDoorRect, getEntranceDoorRect]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Start animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawFrame]);
  
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {/* HTML overlay for interactive content */}
      <RoomContentOverlay containerRef={containerRef} />
    </div>
  );
}

// HTML overlay for text, images, links
function RoomContentOverlay({ containerRef }) {
  const currentRoomIndex = useStore(s => s.currentRoomIndex);
  const rooms = useStore(s => s.rooms);
  const playerPos = useStore(s => s.playerPos);
  const sections = useStore(s => s.sections);
  const transitioning = useStore(s => s.transitioning);
  const setHoveredLink = useStore(s => s.setHoveredLink);
  
  const room = rooms[currentRoomIndex];
  const section = sections.find(s => s.id === room?.section);
  const sectionColor = section ? section.color : '#6366f1';
  
  const [containerSize, setContainerSize] = React.useState({ w: 800, h: 600 });
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);
  
  if (!room) return null;
  
  const roomW = Math.min(containerSize.w - 100, 600);
  const roomH = Math.min(containerSize.h - 60, 520);
  const roomX = (containerSize.w - roomW) / 2;
  const roomY = (containerSize.h - roomH) / 2;
  
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    }}>
      {room.elements.map(el => {
        const elScreenX = roomX + el.x * roomW;
        const elScreenY = roomY + el.y * roomH;
        
        // Distance from player
        const dx = el.x - playerPos.x;
        const dy = el.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 0.12;
        const isNear = dist < interactionRadius;
        
        // Calculate displacement (text moves away from player)
        let offsetX = 0, offsetY = 0;
        let textDistortion = 0;
        let imgOpacity = 1;
        
        if (isNear && !transitioning) {
          const force = 1 - (dist / interactionRadius);
          const angle = Math.atan2(dy, dx);
          offsetX = Math.cos(angle) * force * 25;
          offsetY = Math.sin(angle) * force * 20;
          textDistortion = force;
          imgOpacity = 0.3 + (1 - force) * 0.7;
        }
        
        if (el.type === 'text') {
          return (
            <TextElement
              key={el.id}
              el={el}
              screenX={elScreenX + offsetX}
              screenY={elScreenY + offsetY}
              distortion={textDistortion}
              sectionColor={sectionColor}
            />
          );
        }
        
        if (el.type === 'image') {
          return (
            <ImageElement
              key={el.id}
              el={el}
              screenX={elScreenX + offsetX}
              screenY={elScreenY + offsetY}
              opacity={imgOpacity}
            />
          );
        }
        
        if (el.type === 'link') {
          return (
            <LinkElement
              key={el.id}
              el={el}
              screenX={elScreenX + offsetX}
              screenY={elScreenY + offsetY}
              isNear={isNear}
              distortion={textDistortion}
              sectionColor={sectionColor}
              onHover={(link) => setHoveredLink(link)}
              onLeave={() => setHoveredLink(null)}
            />
          );
        }
        
        return null;
      })}
    </div>
  );
}

function TextElement({ el, screenX, screenY, distortion, sectionColor }) {
  const letterSpacing = distortion * 6;
  const blur = distortion * 1.5;
  const skewX = distortion * (Math.sin(Date.now() * 0.01) * 3);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: `translate(-50%, -50%) skewX(${skewX}deg)`,
        color: el.color || '#ffffff',
        fontSize: `${(el.fontSize || 1) * 16}px`,
        fontFamily: "'Space Mono', monospace",
        fontWeight: el.fontWeight || 'normal',
        fontStyle: el.fontStyle || 'normal',
        letterSpacing: `${letterSpacing}px`,
        filter: blur > 0 ? `blur(${blur}px)` : 'none',
        textAlign: 'center',
        maxWidth: el.maxWidth ? `${el.maxWidth}px` : '500px',
        lineHeight: 1.6,
        userSelect: 'text',
        pointerEvents: 'auto',
        cursor: 'text',
        textShadow: `0 0 ${10 + distortion * 20}px ${el.color || sectionColor}40`,
        transition: 'letter-spacing 0.15s ease, filter 0.15s ease',
        whiteSpace: el.maxWidth ? 'normal' : 'nowrap',
      }}
    >
      {el.content}
    </div>
  );
}

function ImageElement({ el, screenX, screenY, opacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        transition: 'opacity 0.2s ease',
      }}
    >
      <img
        src={el.src}
        alt=""
        style={{
          width: el.width || 150,
          height: el.height || 100,
          objectFit: 'cover',
          borderRadius: 6,
          opacity: opacity,
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'opacity 0.3s ease',
        }}
        draggable={false}
      />
    </div>
  );
}

function LinkElement({ el, screenX, screenY, isNear, distortion, sectionColor, onHover, onLeave }) {
  const letterSpacing = distortion * 4;
  
  useEffect(() => {
    if (isNear) {
      onHover(el);
    } else {
      onLeave();
    }
  }, [isNear, el, onHover, onLeave]);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
      }}
    >
      <a
        href={el.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          color: el.color || sectionColor,
          fontSize: `${(el.fontSize || 1) * 16}px`,
          fontFamily: "'Space Mono', monospace",
          textDecoration: 'none',
          letterSpacing: `${letterSpacing}px`,
          borderBottom: `2px solid ${el.color || sectionColor}60`,
          paddingBottom: 3,
          cursor: 'pointer',
          textShadow: `0 0 15px ${el.color || sectionColor}50`,
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.target.style.borderBottomColor = el.color || sectionColor;
          e.target.style.textShadow = `0 0 25px ${el.color || sectionColor}80`;
        }}
        onMouseLeave={(e) => {
          e.target.style.borderBottomColor = `${el.color || sectionColor}60`;
          e.target.style.textShadow = `0 0 15px ${el.color || sectionColor}50`;
        }}
      >
        {el.content}
      </a>
      
      {/* Space to open indicator */}
      {isNear && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 10,
          padding: '4px 12px',
          background: 'rgba(0,0,0,0.8)',
          border: `1px solid ${el.color || sectionColor}50`,
          borderRadius: 4,
          fontSize: 11,
          color: '#ccc',
          fontFamily: "'Space Mono', monospace",
          whiteSpace: 'nowrap',
          animation: 'fadeInUp 0.2s ease',
        }}>
          Press SPACE to open
        </div>
      )}
    </div>
  );
}