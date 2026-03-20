import React, { useEffect, useCallback, useState } from 'react';
import RoomView from './components/RoomView';
import MapPanel from './components/MapPanel';
import EditorPanel from './components/EditorPanel';
import Notification from './components/Notification';
import Header from './components/Header';
import useStore from './store/useStore';
import config from './config';

export default function App() {
  var setKeyPressed = useStore(function(s) { return s.setKeyPressed; });
  var showEditor = useStore(function(s) { return s.showEditor; });
  var toggleEditor = useStore(function(s) { return s.toggleEditor; });
  var entryFade = useStore(function(s) { return s.entryFade; });
  var setEntryFade = useStore(function(s) { return s.setEntryFade; });
  var hasEntered = useStore(function(s) { return s.hasEntered; });
  var setHasEntered = useStore(function(s) { return s.setHasEntered; });
  var mapFadeOpacity = useStore(function(s) { return s.mapFadeOpacity; });
  var doorFadeOpacity = useStore(function(s) { return s.doorFadeOpacity; });
  var scrollMovePlayer = useStore(function(s) { return s.scrollMovePlayer; });

  var isMobileState = useState(window.innerWidth < 768);
  var isMobile = isMobileState[0];
  var setIsMobile = isMobileState[1];

  var showMapState = useState(false);
  var showMap = showMapState[0];
  var setShowMap = showMapState[1];

  // Track window size
  useEffect(function() {
    var handleResize = function() {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return function() { window.removeEventListener('resize', handleResize); };
  }, []);

  // Entry fade
  useEffect(function() {
    if (!hasEntered) {
      var start = Date.now();
      var animate = function() {
        var p = Math.min((Date.now() - start) / 1800, 1);
        setEntryFade(1 - p);
        if (p < 1) requestAnimationFrame(animate);
        else setHasEntered(true);
      };
      setTimeout(function() { requestAnimationFrame(animate); }, 600);
    }
  }, []);

  // Touch handling for mobile scroll
  var touchStartRef = React.useRef(null);

  var handleTouchStart = useCallback(function(e) {
    if (useStore.getState().mapHovered) return;
    if (useStore.getState().showEditor) return;
    touchStartRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
  }, []);

  var handleTouchMove = useCallback(function(e) {
    if (!touchStartRef.current) return;
    if (useStore.getState().mapHovered) return;
    if (useStore.getState().showEditor) return;
    if (useStore.getState().isMapTransitioning) return;

    var dy = touchStartRef.current.y - e.touches[0].clientY;
    // Swipe up = positive dy = scroll forward
    if (Math.abs(dy) > 3) {
      e.preventDefault();
      scrollMovePlayer(dy * 2.5);
      touchStartRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    }
  }, [scrollMovePlayer]);

  var handleTouchEnd = useCallback(function() {
    touchStartRef.current = null;
  }, []);

  var handleKeyDown = useCallback(function(e) {
    var key = e.key.toLowerCase();
    var code = e.code;
    var moveKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];

    if (moveKeys.indexOf(key) !== -1) {
      if (!useStore.getState().showEditor) {
        e.preventDefault();
        setKeyPressed(key, true);
      }
    }
    if (code === 'Space' || key === ' ') {
      var link = useStore.getState().hoveredLink;
      if (link && !useStore.getState().showEditor) {
        e.preventDefault();
        window.open(link.url, '_blank');
      }
    }
    if (key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!useStore.getState().showEditor || useStore.getState().editorMode === 'view') {
        e.preventDefault();
        toggleEditor('view');
      }
    }
    if (e.key === 'F2') {
      e.preventDefault();
      toggleEditor('edit');
    }
    if (key === 'escape' && useStore.getState().showEditor) {
      e.preventDefault();
      toggleEditor(useStore.getState().editorMode);
    }
  }, [setKeyPressed, toggleEditor]);

  var handleKeyUp = useCallback(function(e) {
    var key = e.key.toLowerCase();
    var moveKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
    if (moveKeys.indexOf(key) !== -1) {
      setKeyPressed(key, false);
    }
  }, [setKeyPressed]);

  var handleWheel = useCallback(function(e) {
    if (useStore.getState().mapHovered) return;
    if (useStore.getState().showEditor) return;
    if (useStore.getState().isMapTransitioning) return;
    e.preventDefault();
    scrollMovePlayer(e.deltaY);
  }, [scrollMovePlayer]);

  useEffect(function() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return function() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleKeyDown, handleKeyUp, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: config.background, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: config.contentFont,
    }}>
      {/* Header */}
      <Header isMobile={isMobile} />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Room */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <RoomView isMobile={isMobile} />

          {/* Door fade */}
          {doorFadeOpacity > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: '#000', opacity: doorFadeOpacity,
              pointerEvents: 'none', zIndex: 90,
            }} />
          )}

          {/* Map fade */}
          {mapFadeOpacity > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: config.background, opacity: mapFadeOpacity,
              pointerEvents: mapFadeOpacity > 0.5 ? 'all' : 'none',
              zIndex: 100,
            }} />
          )}

          {/* Entry fade */}
          {entryFade > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: config.background, opacity: entryFade,
              pointerEvents: entryFade > 0.3 ? 'all' : 'none',
              zIndex: 200,
            }} />
          )}

          {/* HUD - hide on mobile */}
          {!isMobile && (
            <div style={{
              position: 'absolute', bottom: 14, left: 14, zIndex: 50,
              pointerEvents: 'none',
            }}>
              <div style={{
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 10, color: 'rgba(255,255,255,0.3)',
                fontFamily: config.uiFont,
                display: 'flex', gap: 14,
              }}>
                <span>WASD Move</span>
                <span>Scroll Navigate</span>
                <span>F View</span>
                <span>F2 Edit</span>
              </div>
            </div>
          )}

          {/* Mobile map toggle button */}
          {isMobile && (
            <button
              onClick={function() { setShowMap(!showMap); }}
              style={{
                position: 'absolute', bottom: 16, right: 16, zIndex: 300,
                width: 44, height: 44, borderRadius: 22,
                background: showMap ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.5)',
                border: '1px solid ' + (showMap ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.12)'),
                color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              {showMap ? '\u2715' : '\u2630'}
            </button>
          )}

          {/* Mobile swipe hint */}
          {isMobile && !showMap && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 50,
              pointerEvents: 'none',
              padding: '4px 10px',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: 4,
              fontSize: 9, color: 'rgba(255,255,255,0.25)',
              fontFamily: config.uiFont,
            }}>
              swipe to navigate
            </div>
          )}
        </div>

        {/* Map - desktop always visible, mobile toggleable */}
        {(!isMobile || showMap) && (
          <div style={{
            position: isMobile ? 'absolute' : 'relative',
            right: 0, top: 0, bottom: 0,
            zIndex: isMobile ? 400 : 200,
          }}>
            <MapPanel isMobile={isMobile} onClose={function() { setShowMap(false); }} />
          </div>
        )}

        {/* Mobile map backdrop */}
        {isMobile && showMap && (
          <div
            onClick={function() { setShowMap(false); }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 350,
            }}
          />
        )}
      </div>

      {showEditor && <EditorPanel />}
      <Notification />
    </div>
  );
}