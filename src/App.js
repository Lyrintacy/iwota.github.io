import React, { useEffect, useCallback } from 'react';
import RoomView from './components/RoomView';
import MapPanel from './components/MapPanel';
import EditorPanel from './components/EditorPanel';
import Notification from './components/Notification';
import useStore from './store/useStore';

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
    return function() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [handleKeyDown, handleKeyUp, handleWheel]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#1a1a24', display: 'flex', overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <RoomView />

        {/* Door transition fade */}
        {doorFadeOpacity > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#1a1a24', opacity: doorFadeOpacity,
            pointerEvents: 'none',
            zIndex: 90,
          }} />
        )}

        {/* Map teleport fade */}
        {mapFadeOpacity > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#1a1a24', opacity: mapFadeOpacity,
            pointerEvents: mapFadeOpacity > 0.5 ? 'all' : 'none',
            zIndex: 100,
          }} />
        )}

        {/* Entry fade */}
        {entryFade > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#000000', opacity: entryFade,
            pointerEvents: entryFade > 0.3 ? 'all' : 'none',
            zIndex: 200,
          }} />
        )}

        {/* HUD */}
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
            fontFamily: "'Concert One', sans-serif",
            display: 'flex', gap: 14,
          }}>
            <span>WASD Move</span>
            <span>Scroll Navigate</span>
            <span>F View</span>
            <span>F2 Edit</span>
          </div>
        </div>
      </div>

      <MapPanel />
      {showEditor && <EditorPanel />}
      <Notification />
    </div>
  );
}