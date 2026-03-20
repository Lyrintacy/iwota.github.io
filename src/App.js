import React, { useEffect, useCallback, useRef } from 'react';
import RoomCanvas from './components/RoomCanvas';
import MapPanel from './components/MapPanel';
import EditorPanel from './components/EditorPanel';
import TransitionOverlay from './components/TransitionOverlay';
import HUDOverlay from './components/HUDOverlay';
import useStore from './store/useStore';

export default function App() {
  const {
    setKeyPressed,
    navigateNext,
    navigatePrev,
    mapHovered,
    transitioning,
    toggleEditor,
    hoveredLink,
    showEditor,
    entryFade,
    setEntryFade,
    hasEntered,
    setHasEntered,
  } = useStore();
  
  const scrollAccum = useRef(0);
  
  // Entry fade
  useEffect(() => {
    if (!hasEntered) {
      const start = Date.now();
      const duration = 1500;
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        setEntryFade(1 - progress);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setHasEntered(true);
        }
      };
      // Small delay before fade in
      setTimeout(() => requestAnimationFrame(animate), 500);
    }
  }, [hasEntered, setEntryFade, setHasEntered]);
  
  const handleKeyDown = useCallback((e) => {
    const key = e.key.toLowerCase();
    
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      setKeyPressed(key, true);
    }
    
    if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const link = useStore.getState().hoveredLink;
      if (link) {
        window.open(link.url, '_blank');
      }
    }
    
    if (key === 'f' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleEditor('view');
    }
    
    if (e.key === 'F2') {
      e.preventDefault();
      toggleEditor('edit');
    }
  }, [setKeyPressed, toggleEditor]);
  
  const handleKeyUp = useCallback((e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      setKeyPressed(key, false);
    }
  }, [setKeyPressed]);
  
  const handleWheel = useCallback((e) => {
    if (mapHovered || showEditor) return;
    if (transitioning) return;
    
    scrollAccum.current += e.deltaY;
    
    if (scrollAccum.current > 150) {
      scrollAccum.current = 0;
      navigateNext();
    } else if (scrollAccum.current < -150) {
      scrollAccum.current = 0;
      navigatePrev();
    }
  }, [mapHovered, transitioning, navigateNext, navigatePrev, showEditor]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [handleKeyDown, handleKeyUp, handleWheel]);
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Main Canvas Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <RoomCanvas />
        <HUDOverlay />
        <TransitionOverlay />
        
        {/* Entry fade */}
        {entryFade > 0 && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#000',
            opacity: entryFade,
            pointerEvents: entryFade > 0.5 ? 'all' : 'none',
            zIndex: 1000,
          }} />
        )}
      </div>
      
      {/* Map Panel */}
      <MapPanel />
      
      {/* Editor */}
      {showEditor && <EditorPanel />}
    </div>
  );
}