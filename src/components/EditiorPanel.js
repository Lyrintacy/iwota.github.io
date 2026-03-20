import React, { useState, useCallback } from 'react';
import useStore from '../store/useStore';

export default function EditorPanel() {
  const rooms = useStore(s => s.rooms);
  const sections = useStore(s => s.sections);
  const currentRoomIndex = useStore(s => s.currentRoomIndex);
  const editorMode = useStore(s => s.editorMode);
  const showEditor = useStore(s => s.showEditor);
  const toggleEditor = useStore(s => s.toggleEditor);
  const navigateToRoom = useStore(s => s.navigateToRoom);
  const updateRoomElement = useStore(s => s.updateRoomElement);
  const addRoomElement = useStore(s => s.addRoomElement);
  const removeRoomElement = useStore(s => s.removeRoomElement);
  const moveRoom = useStore(s => s.moveRoom);
  
  const [expandedRoom, setExpandedRoom] = useState(currentRoomIndex);
  const [editingElement, setEditingElement] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  
  const isViewMode = editorMode === 'view';
  
  const handleClose = useCallback(() => {
    toggleEditor(editorMode);
  }, [toggleEditor, editorMode]);
  
  const handleDragStart = (index) => {
    if (isViewMode) return;
    setDragIndex(index);
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
  };
  
  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) return;
    moveRoom(dragIndex, toIndex);
    setDragIndex(null);
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div style={{
        width: '90%',
        maxWidth: 900,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              color: '#fff',
              fontFamily: "'Space Mono', monospace",
              fontSize: 20,
              margin: 0,
            }}>
              {isViewMode ? '📖 View All Rooms' : '✏️ Edit Mode'}
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              margin: '4px 0 0',
              fontFamily: "'Space Mono', monospace",
            }}>
              {isViewMode ? 'Press F to close' : 'Press F2 to close • Drag rooms to reorder'}
            </p>
          </div>
          
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
            }}
          >
            Close (ESC)
          </button>
        </div>
        
        {/* Rooms list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: 10,
        }}>
          {rooms.map((room, roomIdx) => {
            const section = sections.find(s => s.id === room.section);
            const isFirst = roomIdx === 0 || rooms[roomIdx - 1]?.section !== room.section;
            const isExpanded = expandedRoom === roomIdx;
            const isCurrent = roomIdx === currentRoomIndex;
            
            return (
              <React.Fragment key={room.id}>
                {/* Section header */}
                {isFirst && section && (
                  <div style={{
                    marginTop: roomIdx > 0 ? 24 : 0,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    {section.gif && (
                      <img
                        src={section.gif}
                        alt=""
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 4,
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <span style={{
                      color: section.color,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 14,
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                    }}>
                      {section.name}
                    </span>
                  </div>
                )}
                
                {/* Room card */}
                <div
                  draggable={!isViewMode}
                  onDragStart={() => handleDragStart(roomIdx)}
                  onDragOver={(e) => handleDragOver(e, roomIdx)}
                  onDrop={(e) => handleDrop(e, roomIdx)}
                  style={{
                    background: isCurrent
                      ? `rgba(${hexToRgb(section?.color || '#666')}, 0.1)`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCurrent ? `${section?.color}50` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8,
                    marginBottom: 6,
                    overflow: 'hidden',
                    cursor: !isViewMode ? 'grab' : 'pointer',
                  }}
                >
                  {/* Room header */}
                  <div
                    onClick={() => {
                      setExpandedRoom(isExpanded ? -1 : roomIdx);
                    }}
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: section?.color || '#666',
                      }} />
                      <span style={{
                        color: '#ddd',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                      }}>
                        Room {roomIdx + 1}
                      </span>
                      <span style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                      }}>
                        Exit: {room.exitDirection}
                      </span>
                      {isCurrent && (
                        <span style={{
                          background: `${section?.color}30`,
                          color: section?.color,
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontFamily: "'Space Mono', monospace",
                        }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToRoom(roomIdx);
                          handleClose();
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#aaa',
                          padding: '4px 10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 10,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        Go →
                      </button>
                      <span style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 14,
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}>
                        ▼
                      </span>
                    </div>
                  </div>
                  
                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 16px',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {room.elements.map(el => (
                        <div key={el.id} style={{
                          padding: '8px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}>
                          {/* Type badge */}
                          <span style={{
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontFamily: "'Space Mono', monospace",
                            flexShrink: 0,
                            marginTop: 2,
                            background:
                              el.type === 'text' ? 'rgba(99,102,241,0.15)' :
                              el.type === 'link' ? 'rgba(236,72,153,0.15)' :
                              'rgba(20,184,166,0.15)',
                            color:
                              el.type === 'text' ? '#6366f1' :
                              el.type === 'link' ? '#ec4899' :
                              '#14b8a6',
                          }}>
                            {el.type.toUpperCase()}
                          </span>
                          
                          <div style={{ flex: 1 }}>
                            {!isViewMode && editingElement === el.id ? (
                              // Edit form
                              <EditElementForm
                                el={el}
                                roomIndex={roomIdx}
                                onSave={() => setEditingElement(null)}
                              />
                            ) : (
                              <div>
                                {el.type === 'image' ? (
                                  <img
                                    src={el.src}
                                    alt=""
                                    style={{
                                      maxWidth: 120,
                                      maxHeight: 80,
                                      borderRadius: 4,
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <span style={{
                                    color: el.color || '#ccc',
                                    fontSize: 12,
                                    fontFamily: "'Space Mono', monospace",
                                    lineHeight: 1.4,
                                  }}>
                                    {el.content}
                                  </span>
                                )}
                                {el.type === 'link' && (
                                  <div style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.3)',
                                    marginTop: 2,
                                    fontFamily: "'Space Mono', monospace",
                                  }}>
                                    → {el.url}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Edit/Delete buttons */}
                          {!isViewMode && editingElement !== el.id && (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                onClick={() => setEditingElement(el.id)}
                                style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: 'none',
                                  color: '#888',
                                  padding: '3px 8px',
                                  borderRadius: 3,
                                  cursor: 'pointer',
                                  fontSize: 10,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeRoomElement(roomIdx, el.id)}
                                style={{
                                  background: 'rgba(255,50,50,0.1)',
                                  border: 'none',
                                  color: '#f55',
                                  padding: '3px 8px',
                                  borderRadius: 3,
                                  cursor: 'pointer',
                                  fontSize: 10,
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Add element button (edit mode) */}
                      {!isViewMode && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          {['text', 'image', 'link'].map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                const newEl = {
                                  id: `e_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
                                  type,
                                  content: type === 'image' ? undefined : `New ${type}`,
                                  src: type === 'image' ? 'https://via.placeholder.com/150' : undefined,
                                  url: type === 'link' ? 'https://example.com' : undefined,
                                  x: 0.5,
                                  y: 0.5,
                                  fontSize: 1,
                                  color: section?.color || '#ffffff',
                                  width: type === 'image' ? 150 : undefined,
                                  height: type === 'image' ? 100 : undefined,
                                };
                                addRoomElement(roomIdx, newEl);
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.4)',
                                padding: '4px 10px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 10,
                                fontFamily: "'Space Mono', monospace",
                              }}
                            >
                              + {type}
                            </button>
                          ))}
                        </div>
                      )}
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

function EditElementForm({ el, roomIndex, onSave }) {
  const updateRoomElement = useStore(s => s.updateRoomElement);
  const [values, setValues] = useState({ ...el });
  
  const handleSave = () => {
    updateRoomElement(roomIndex, el.id, values);
    onSave();
  };
  
  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ddd',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "'Space Mono', monospace",
    width: '100%',
    marginBottom: 4,
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {el.type !== 'image' && (
        <input
          value={values.content || ''}
          onChange={e => setValues(v => ({ ...v, content: e.target.value }))}
          placeholder="Content"
          style={inputStyle}
        />
      )}
      {el.type === 'image' && (
        <input
          value={values.src || ''}
          onChange={e => setValues(v => ({ ...v, src: e.target.value }))}
          placeholder="Image URL"
          style={inputStyle}
        />
      )}
      {el.type === 'link' && (
        <input
          value={values.url || ''}
          onChange={e => setValues(v => ({ ...v, url: e.target.value }))}
          placeholder="Link URL"
          style={inputStyle}
        />
      )}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="number"
          value={values.x || 0.5}
          onChange={e => setValues(v => ({ ...v, x: parseFloat(e.target.value) || 0.5 }))}
          step={0.05}
          min={0}
          max={1}
          placeholder="X"
          style={{ ...inputStyle, width: 60 }}
        />
        <input
          type="number"
          value={values.y || 0.5}
          onChange={e => setValues(v => ({ ...v, y: parseFloat(e.target.value) || 0.5 }))}
          step={0.05}
          min={0}
          max={1}
          placeholder="Y"
          style={{ ...inputStyle, width: 60 }}
        />
        <input
          value={values.color || '#ffffff'}
          onChange={e => setValues(v => ({ ...v, color: e.target.value }))}
          placeholder="Color"
          style={{ ...inputStyle, width: 80 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={handleSave}
          style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#6366f1',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          Save
        </button>
        <button
          onClick={onSave}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#888',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '100,100,100';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}