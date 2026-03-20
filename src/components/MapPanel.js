import React, { useRef, useState, useCallback, useEffect } from 'react';
import useStore from '../store/useStore';

const NODE_SIZE = 32;
const NODE_GAP = 12;
const SECTION_GAP = 24;

export default function MapPanel() {
  const rooms = useStore(s => s.rooms);
  const sections = useStore(s => s.sections);
  const currentRoomIndex = useStore(s => s.currentRoomIndex);
  const navigateToRoom = useStore(s => s.navigateToRoom);
  const setMapHovered = useStore(s => s.setMapHovered);
  const mapHovered = useStore(s => s.mapHovered);
  
  const scrollRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(-1);
  
  // Build grouped structure
  const grouped = React.useMemo(() => {
    const result = [];
    let currentSection = null;
    
    rooms.forEach((room, index) => {
      if (room.section !== currentSection) {
        currentSection = room.section;
        const sec = sections.find(s => s.id === currentSection);
        result.push({
          type: 'section',
          section: sec,
          sectionId: currentSection,
        });
      }
      result.push({
        type: 'room',
        room,
        index,
        sectionId: currentSection,
      });
    });
    
    return result;
  }, [rooms, sections]);
  
  // Auto-scroll to current room
  useEffect(() => {
    if (scrollRef.current) {
      const nodes = scrollRef.current.querySelectorAll('[data-room-index]');
      const currentNode = scrollRef.current.querySelector(`[data-room-index="${currentRoomIndex}"]`);
      if (currentNode) {
        currentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentRoomIndex]);
  
  const handleWheel = useCallback((e) => {
    e.stopPropagation();
    // Let native scroll happen on the panel
  }, []);
  
  return (
    <div
      onMouseEnter={() => setMapHovered(true)}
      onMouseLeave={() => setMapHovered(false)}
      onWheel={handleWheel}
      style={{
        width: 80,
        minWidth: 80,
        height: '100vh',
        background: mapHovered ? 'rgba(15,15,30,0.98)' : 'rgba(10,10,20,0.95)',
        borderLeft: `1px solid ${mapHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        position: 'relative',
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.4)',
          fontFamily: "'Space Mono', monospace",
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          MAP
        </div>
      </div>
      
      {/* Scroll hint */}
      {mapHovered && (
        <div style={{
          position: 'absolute',
          top: 38,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'Space Mono', monospace",
          whiteSpace: 'nowrap',
          zIndex: 10,
          background: 'rgba(10,10,20,0.9)',
          padding: '2px 6px',
          borderRadius: 3,
        }}>
          scroll ↕
        </div>
      )}
      
      {/* Nodes */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 0',
          scrollbarWidth: 'none',
        }}
      >
        <style>{`
          div::-webkit-scrollbar { width: 0; }
        `}</style>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          {grouped.map((item, i) => {
            if (item.type === 'section') {
              const sec = item.section;
              return (
                <div key={`section-${item.sectionId}`} style={{
                  marginTop: i > 0 ? SECTION_GAP : 0,
                  marginBottom: 8,
                  textAlign: 'center',
                }}>
                  {sec?.gif && (
                    <img
                      src={sec.gif}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        objectFit: 'cover',
                        border: `1px solid ${sec.color}40`,
                        marginBottom: 4,
                      }}
                    />
                  )}
                  <div style={{
                    fontSize: 7,
                    color: sec?.color || '#aaa',
                    fontFamily: "'Space Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    lineHeight: 1.2,
                    maxWidth: 60,
                    wordBreak: 'break-word',
                  }}>
                    {sec?.name || item.sectionId}
                  </div>
                </div>
              );
            }
            
            // Room node
            const roomIdx = item.index;
            const isCurrent = roomIdx === currentRoomIndex;
            const isHovered = hoveredNode === roomIdx;
            const isPast = roomIdx < currentRoomIndex;
            const sec = sections.find(s => s.id === item.sectionId);
            const nodeColor = sec?.color || '#666';
            
            const size = isHovered ? NODE_SIZE + 8 : (isCurrent ? NODE_SIZE + 4 : NODE_SIZE);
            
            return (
              <React.Fragment key={`room-${roomIdx}`}>
                {/* Connector line */}
                {i > 0 && grouped[i - 1]?.type === 'room' && (
                  <div style={{
                    width: 2,
                    height: NODE_GAP,
                    background: isPast ? `${nodeColor}60` : 'rgba(255,255,255,0.08)',
                  }} />
                )}
                
                <div
                  data-room-index={roomIdx}
                  onMouseEnter={() => setHoveredNode(roomIdx)}
                  onMouseLeave={() => setHoveredNode(-1)}
                  onClick={() => navigateToRoom(roomIdx)}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: 6,
                    background: isCurrent
                      ? `${nodeColor}cc`
                      : isPast
                        ? `${nodeColor}30`
                        : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCurrent ? nodeColor : isHovered ? `${nodeColor}80` : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: isCurrent
                      ? `0 0 15px ${nodeColor}40`
                      : isHovered
                        ? `0 0 10px ${nodeColor}20`
                        : 'none',
                  }}
                >
                  {/* Room number */}
                  <span style={{
                    fontSize: isCurrent ? 11 : 9,
                    fontWeight: isCurrent ? '700' : '400',
                    color: isCurrent ? '#fff' : isPast ? `${nodeColor}90` : 'rgba(255,255,255,0.3)',
                    fontFamily: "'Space Mono', monospace",
                  }}>
                    {roomIdx + 1}
                  </span>
                  
                  {/* Current indicator */}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      left: -8,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: nodeColor,
                      boxShadow: `0 0 8px ${nodeColor}`,
                    }} />
                  )}
                  
                  {/* Hover tooltip */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      right: '100%',
                      marginRight: 8,
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.9)',
                      border: `1px solid ${nodeColor}40`,
                      borderRadius: 4,
                      fontSize: 10,
                      color: '#ddd',
                      fontFamily: "'Space Mono', monospace",
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}>
                      Room {roomIdx + 1}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}