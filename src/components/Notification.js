import React from 'react';
import useStore from '../store/useStore';

export default function Notification() {
  const notification = useStore(s => s.notification);

  if (!notification) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 24px',
      background: 'rgba(10,10,25,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      color: '#ddd',
      fontSize: 13,
      fontFamily: "'Space Mono', monospace",
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      animation: 'notifIn 0.25s ease',
    }}>
      {notification}
      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}