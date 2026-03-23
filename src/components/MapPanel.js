import React, { useRef, useState, useEffect } from 'react';
import useStore from '../store/useStore';
import config from '../config';

export default function MapPanel(props) {
  var isMobile = props.isMobile;
  var onClose = props.onClose;
  var onNavigate = props.onNavigate;

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

  var handleRoomClick = function(ri) {
    navigateViaMap(ri);
    // Tell parent we navigated (for mobile close)
    if (onNavigate) onNavigate();
  };

  var panelWidth = isMobile ? 180 : 130;

  return (
    <div
      data-map-panel="true"
      onMouseEnter={function() { if (!isMobile) setMapHovered(true); }}
      onMouseLeave={function() { if (!isMobile) setMapHovered(false); }}
      onWheel={function(e) { e.stopPropagation(); }}
      onTouchStart={function(e) { e.stopPropagation(); }}
      onTouchMove={function(e) { e.stopPropagation(); }}
      onTouchEnd={function(e) { e.stopPropagation(); }}
      style={{
        width: panelWidth, minWidth: panelWidth, height: '100%',
        background: isMobile ? 'rgba(10,10,22,0.98)' : (mapHovered ? 'rgba(12,12,28,0.98)' : 'rgba(10,10,20,0.96)'),
        borderLeft: '1px solid ' + (mapHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'),
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.25s', position: 'relative',
        overflow: 'visible',
        touchAction: 'pan-y',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.45)',
          fontFamily: config.uiFont,
          textTransform: 'uppercase', letterSpacing: 3,
        }}>MAP</div>
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.2)',
          fontFamily: config.uiFont,
        }}>({rooms.length})</div>

        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={function() { if (onClose) onClose(); }}
            style={{
              position: 'absolute', right: 8, top: 10,
              width: 28, height: 28, borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#888', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {'\u00D7'}
          </button>
        )}
      </div>

      {/* Nodes */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', overflowX: 'visible',
        padding: '22px 0', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
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
                    fontFamily: config.uiFont,
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
                  onMouseEnter={function() { if (!isMobile) setHovered(ri); }}
                  onMouseLeave={function() { if (!isMobile) setHovered(-1); }}
                  onClick={function() { handleRoomClick(ri); }}
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
                    fontFamily: config.uiFont,
                  }}>{ri + 1}</span>

                  {cur ? <div style={{
                    position: 'absolute', left: -10, width: 5, height: 5,
                    borderRadius: '50%', background: c, boxShadow: '0 0 8px ' + c,
                  }} /> : null}

                  {/* Tooltip - desktop only */}
                  {hov && !isMobile ? (
                    <div style={{
                      position: 'fixed',
                      right: panelWidth + 15,
                      padding: '5px 12px',
                      background: 'rgba(5,5,15,0.95)',
                      border: '1px solid ' + c + '50',
                      borderRadius: 5,
                      fontSize: 11, color: '#ddd',
                      fontFamily: config.uiFont,
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
        textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.2)',
          fontFamily: config.uiFont,
        }}>click to jump</div>
      </div>
    </div>
  );
}