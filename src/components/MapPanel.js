import React, { useRef, useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function MapPanel() {
  var rooms = useStore(function(s) { return s.rooms; });
  var sections = useStore(function(s) { return s.sections; });
  var currentRoomIndex = useStore(function(s) { return s.currentRoomIndex; });
  var navigateViaMap = useStore(function(s) { return s.navigateViaMap; });
  var setMapHovered = useStore(function(s) { return s.setMapHovered; });
  var mapHovered = useStore(function(s) { return s.mapHovered; });

  var scrollRef = useRef(null);
  var hoveredState = useState(-1);
  var hovered = hoveredState[0];
  var setHovered = hoveredState[1];

  useEffect(function() {
    if (!scrollRef.current) return;
    var el = scrollRef.current.querySelector('[data-ri="' + currentRoomIndex + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentRoomIndex]);

  var items = React.useMemo(function() {
    var result = [];
    var lastSec = null;
    rooms.forEach(function(room, idx) {
      if (room.section !== lastSec) {
        lastSec = room.section;
        var sec = null;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].id === lastSec) { sec = sections[i]; break; }
        }
        result.push({ type: 'section', section: sec, sectionId: lastSec });
      }
      result.push({ type: 'room', room: room, index: idx, sectionId: lastSec });
    });
    return result;
  }, [rooms, sections]);

  return (
    <div
      onMouseEnter={function() { setMapHovered(true); }}
      onMouseLeave={function() { setMapHovered(false); }}
      onWheel={function(e) { e.stopPropagation(); }}
      style={{
        width: 130, minWidth: 130, height: '100vh',
        background: mapHovered ? 'rgba(12,12,28,0.98)' : 'rgba(10,10,20,0.96)',
        borderLeft: '1px solid ' + (mapHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'),
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.25s', position: 'relative', zIndex: 200,
        overflow: 'visible',
      }}
    >
      <div style={{
        padding: '14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.45)',
          fontFamily: "'Space Mono', monospace",
          textTransform: 'uppercase', letterSpacing: 3,
        }}>MAP</div>
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.2)',
          fontFamily: "'Space Mono', monospace", marginTop: 3,
        }}>{rooms.length} rooms</div>
      </div>

      {mapHovered && (
        <div style={{
          position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, color: 'rgba(255,255,255,0.3)',
          fontFamily: "'Space Mono', monospace", whiteSpace: 'nowrap',
          background: 'rgba(8,8,18,0.9)', padding: '2px 8px', borderRadius: 3, zIndex: 5,
        }}>scroll map</div>
      )}

      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', overflowX: 'visible',
        padding: '22px 0', scrollbarWidth: 'none',
      }}>
        <style>{'div::-webkit-scrollbar{width:0}'}</style>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          overflow: 'visible',
        }}>
          {items.map(function(item, i) {
            if (item.type === 'section') {
              var sec = item.section;
              return (
                <div key={'s-' + item.sectionId} style={{
                  marginTop: i > 0 ? 26 : 0, marginBottom: 10, textAlign: 'center',
                  padding: '0 8px',
                }}>
                  {sec && sec.gif ? (
                    <img src={sec.gif} alt="" style={{
                      width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                      border: '2px solid ' + (sec.color || '#666') + '40',
                      display: 'block', margin: '0 auto 6px',
                    }} onError={function(e) { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: (sec ? sec.color : '#666') + '15',
                      border: '2px solid ' + (sec ? sec.color : '#666') + '30',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 6px',
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 3,
                        background: sec ? sec.color : '#666', opacity: 0.5,
                      }} />
                    </div>
                  )}
                  <div style={{
                    fontSize: 9, color: sec ? sec.color : '#888',
                    fontFamily: "'Space Mono', monospace",
                    textTransform: 'uppercase', letterSpacing: 1,
                    maxWidth: 100, wordBreak: 'break-word', lineHeight: 1.3,
                    margin: '0 auto', fontWeight: 'bold',
                  }}>{sec ? sec.name : '?'}</div>
                </div>
              );
            }

            var ri = item.index;
            var cur = ri === currentRoomIndex;
            var hov = hovered === ri;
            var past = ri < currentRoomIndex;
            var secItem = null;
            for (var si = 0; si < sections.length; si++) {
              if (sections[si].id === item.sectionId) { secItem = sections[si]; break; }
            }
            var c = secItem ? secItem.color : '#666';
            var sz = hov ? 46 : cur ? 42 : 34;

            return (
              <React.Fragment key={'r-' + ri}>
                {i > 0 && items[i - 1] && items[i - 1].type === 'room' ? (
                  <div style={{
                    width: 2, height: 14,
                    background: past ? c + '55' : 'rgba(255,255,255,0.06)',
                    borderRadius: 1,
                  }} />
                ) : null}

                <div
                  data-ri={ri}
                  onMouseEnter={function() { setHovered(ri); }}
                  onMouseLeave={function() { setHovered(-1); }}
                  onClick={function() { navigateViaMap(ri); }}
                  style={{
                    width: sz, height: sz, borderRadius: 7,
                    background: cur ? c + 'cc' : past ? c + '28' : 'rgba(255,255,255,0.05)',
                    border: '2px solid ' + (cur ? c : hov ? c + '80' : 'rgba(255,255,255,0.07)'),
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    boxShadow: cur ? '0 0 16px ' + c + '45' : hov ? '0 0 12px ' + c + '22' : 'none',
                    overflow: 'visible',
                  }}
                >
                  <span style={{
                    fontSize: cur ? 13 : 11, fontWeight: cur ? 700 : 400,
                    color: cur ? '#fff' : past ? c + '90' : 'rgba(255,255,255,0.3)',
                    fontFamily: "'Space Mono', monospace",
                  }}>{ri + 1}</span>

                  {cur ? <div style={{
                    position: 'absolute', left: -10, width: 5, height: 5,
                    borderRadius: '50%', background: c, boxShadow: '0 0 8px ' + c,
                  }} /> : null}

                  {/* Tooltip - positioned LEFT of the map panel entirely */}
                  {hov ? (
                    <div style={{
                      position: 'fixed',
                      right: 145,
                      padding: '5px 12px',
                      background: 'rgba(5,5,15,0.95)',
                      border: '1px solid ' + c + '50',
                      borderRadius: 5,
                      fontSize: 11, color: '#ddd',
                      fontFamily: "'Space Mono', monospace",
                      whiteSpace: 'nowrap', pointerEvents: 'none',
                      zIndex: 999,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                    }}>Room {ri + 1}</div>
                  ) : null}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{
        padding: '10px', borderTop: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.2)',
          fontFamily: "'Space Mono', monospace",
        }}>click to jump</div>
      </div>
    </div>
  );
}