import React from 'react';
import useStore from '../store/useStore';

export default function TransitionOverlay() {
  const transitionOpacity = useStore(s => s.transitionOpacity);
  
  if (transitionOpacity <= 0) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#000',
      opacity: transitionOpacity,
      pointerEvents: transitionOpacity > 0.5 ? 'all' : 'none',
      zIndex: 100,
      transition: 'none',
    }} />
  );
}