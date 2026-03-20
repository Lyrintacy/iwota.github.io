import React from 'react';
import useStore from '../store/useStore';

export default function HUDOverlay() {
  const hoveredLink = useStore(s => s.hoveredLink);
  const currentRoomIndex = useStore(s => s.currentRoomIndex);
  const rooms = useStore(s => s.rooms);
  
  return (
    <div style={{
      position: 'absolute',
      bottom: 12,
      left: 12,
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      {/* Controls hint */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Space Mono', monospace",
          display: 'flex',
          gap: 12,
        }}>
          <span>WASD / ↑↓←→ Move</span>
          <span>|</span>
          <span>Scroll: Next Room</span>
          <span>|</span>
          <span>F: View All</span>
          <span>|</span>
          <span>F2: Edit</span>
        </div>
      </div>
    </div>
  );
}