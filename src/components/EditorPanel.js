import React, { useState, useRef } from 'react';
import useStore from '../store/useStore';

export default function EditorPanel() {
  var rooms = useStore(function(s) { return s.rooms; });
  var sections = useStore(function(s) { return s.sections; });
  var currentRoomIndex = useStore(function(s) { return s.currentRoomIndex; });
  var editorMode = useStore(function(s) { return s.editorMode; });
  var toggleEditor = useStore(function(s) { return s.toggleEditor; });
  var navigateViaMap = useStore(function(s) { return s.navigateViaMap; });
  var updateRoom = useStore(function(s) { return s.updateRoom; });
  var addRoomElement = useStore(function(s) { return s.addRoomElement; });
  var removeRoomElement = useStore(function(s) { return s.removeRoomElement; });
  var addRoom = useStore(function(s) { return s.addRoom; });
  var deleteRoom = useStore(function(s) { return s.deleteRoom; });
  var moveRoom = useStore(function(s) { return s.moveRoom; });
  var updateSection = useStore(function(s) { return s.updateSection; });
  var addSection = useStore(function(s) { return s.addSection; });
  var deleteSection = useStore(function(s) { return s.deleteSection; });
  var exportJSON = useStore(function(s) { return s.exportJSON; });
  var importJSON = useStore(function(s) { return s.importJSON; });
  var saveToGist = useStore(function(s) { return s.saveToGist; });
  var loadFromGist = useStore(function(s) { return s.loadFromGist; });
  var githubToken = useStore(function(s) { return s.githubToken; });
  var setGithubToken = useStore(function(s) { return s.setGithubToken; });
  var gistId = useStore(function(s) { return s.gistId; });
  var setGistId = useStore(function(s) { return s.setGistId; });
  var resetToDefaults = useStore(function(s) { return s.resetToDefaults; });

  var isView = editorMode === 'view';
  var expandedState = useState(currentRoomIndex);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var editingElState = useState(null);
  var editingEl = editingElState[0];
  var setEditingEl = editingElState[1];
  var showSettingsState = useState(false);
  var showSettings = showSettingsState[0];
  var setShowSettings = showSettingsState[1];
  var showSectionsState = useState(false);
  var showSections = showSectionsState[0];
  var setShowSections = showSectionsState[1];
  var dragFromState = useState(null);
  var dragFrom = dragFromState[0];
  var setDragFrom = dragFromState[1];
  var fileRef = useRef(null);

  var close = function() { toggleEditor(editorMode); };

  var inp = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ddd', padding: '5px 8px', borderRadius: 4,
    fontSize: 12, fontFamily: "'Space Mono', monospace",
    width: '100%',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 500, display: 'flex', justifyContent: 'center',
      }}
      onClick={function(e) { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{
        width: '92%', maxWidth: 940, height: '100%',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14, flexShrink: 0, gap: 12,
        }}>
          <div>
            <h2 style={{ color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: 18, margin: 0 }}>
              {isView ? 'All Rooms' : 'Editor'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0', fontFamily: "'Space Mono', monospace" }}>
              {isView ? 'Press F or Escape to close' : 'Edit content, add rooms, reorder. Press F2 or Escape to close'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!isView && (
              <React.Fragment>
                <Btn onClick={function() { setShowSections(!showSections); }} label="Sections" />
                <Btn onClick={function() { setShowSettings(!showSettings); }} label="Save/Load" />
              </React.Fragment>
            )}
            <Btn onClick={close} label="Close" />
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && !isView && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: 16, marginBottom: 12, flexShrink: 0,
          }}>
            <div style={{ fontSize: 13, color: '#ddd', fontFamily: "'Space Mono', monospace", marginBottom: 10, fontWeight: 'bold' }}>
              Save and Load
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <Btn onClick={exportJSON} label="Export JSON" accent />
              <Btn onClick={function() { if (fileRef.current) fileRef.current.click(); }} label="Import JSON" accent />
              <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
                onChange={function(e) { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; }} />
              <Btn onClick={resetToDefaults} label="Reset Defaults" danger />
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
                GitHub Gist Sync
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <input value={githubToken} onChange={function(e) { setGithubToken(e.target.value); }}
                  placeholder="GitHub Personal Access Token" type="password"
                  style={Object.assign({}, inp, { width: 260 })} />
                <input value={gistId} onChange={function(e) { setGistId(e.target.value); }}
                  placeholder="Gist ID (auto-created if empty)"
                  style={Object.assign({}, inp, { width: 220 })} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn onClick={saveToGist} label="Save to Gist" accent />
                <Btn onClick={loadFromGist} label="Load from Gist" accent />
              </div>
            </div>
          </div>
        )}

        {/* Sections Panel */}
        {showSections && !isView && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: 16, marginBottom: 12, flexShrink: 0,
          }}>
            <div style={{ fontSize: 13, color: '#ddd', fontFamily: "'Space Mono', monospace", marginBottom: 10, fontWeight: 'bold' }}>
              Sections
            </div>
            {sections.map(function(sec) {
              return React.createElement(SectionEditor, {
                key: sec.id, section: sec,
                onUpdate: function(u) { updateSection(sec.id, u); },
                onDelete: function() { deleteSection(sec.id); },
                canDelete: sections.length > 1,
              });
            })}
            <Btn onClick={function() {
              addSection({ id: 'section_' + Date.now(), name: 'New Section', color: '#888888', gif: '' });
            }} label="+ Add Section" style={{ marginTop: 8 }} />
          </div>
        )}

        {/* Rooms List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
          {rooms.map(function(room, ri) {
            var sec = null;
            for (var si = 0; si < sections.length; si++) {
              if (sections[si].id === room.section) { sec = sections[si]; break; }
            }
            var isFirst = ri === 0 || rooms[ri - 1].section !== room.section;
            var isExp = expanded === ri;
            var isCur = ri === currentRoomIndex;

            return (
              <React.Fragment key={room.id}>
                {isFirst && sec && (
                  <div style={{
                    marginTop: ri > 0 ? 20 : 0, marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: sec.color }} />
                    <span style={{
                      color: sec.color, fontFamily: "'Space Mono', monospace",
                      fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5,
                    }}>{sec.name}</span>
                  </div>
                )}

                <div
                  draggable={!isView}
                  onDragStart={function() { if (!isView) setDragFrom(ri); }}
                  onDragOver={function(e) { e.preventDefault(); }}
                  onDrop={function() { if (dragFrom !== null && dragFrom !== ri) moveRoom(dragFrom, ri); setDragFrom(null); }}
                  style={{
                    background: isCur ? (sec ? sec.color : '#666') + '10' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (isCur ? (sec ? sec.color : '#666') + '40' : dragFrom === ri ? '#fff3' : 'rgba(255,255,255,0.05)'),
                    borderRadius: 6, marginBottom: 5, overflow: 'hidden',
                    opacity: dragFrom === ri ? 0.5 : 1,
                  }}
                >
                  {/* Room header */}
                  <div onClick={function() { setExpanded(isExp ? -1 : ri); }}
                    style={{
                      padding: '8px 14px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!isView && <span style={{ cursor: 'grab', color: '#444', fontSize: 12 }}>||</span>}
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sec ? sec.color : '#666' }} />
                      <span style={{ color: '#ccc', fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                        Room {ri + 1}
                      </span>
                      <span style={{ color: '#555', fontSize: 9, fontFamily: "'Space Mono', monospace" }}>
                        exit:{room.exitDirection}
                      </span>
                      {isCur && React.createElement(Tag, { color: sec ? sec.color : '#666', label: 'CURRENT' })}
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <Btn small onClick={function(e) { e.stopPropagation(); navigateViaMap(ri); close(); }} label="Go" />
                      {!isView && (
                        <React.Fragment>
                          <Btn small onClick={function(e) { e.stopPropagation(); addRoom(ri, room.section); }} label="+" />
                          <Btn small danger onClick={function(e) { e.stopPropagation(); deleteRoom(ri); }} label="x"
                            disabled={rooms.length <= 1} />
                        </React.Fragment>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExp && (
                    <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Room settings */}
                      {!isView && (
                        <div style={{
                          display: 'flex', gap: 8, alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', marginBottom: 6,
                        }}>
                          <label style={{ fontSize: 10, color: '#777', fontFamily: "'Space Mono', monospace" }}>Section:</label>
                          <select value={room.section}
                            onChange={function(e) { updateRoom(ri, { section: e.target.value }); }}
                            style={Object.assign({}, inp, { width: 140, padding: '3px 6px', fontSize: 10 })}>
                            {sections.map(function(s) {
                              return <option key={s.id} value={s.id}>{s.name}</option>;
                            })}
                          </select>
                          <label style={{ fontSize: 10, color: '#777', fontFamily: "'Space Mono', monospace" }}>Exit:</label>
                          <select value={room.exitDirection}
                            onChange={function(e) { updateRoom(ri, { exitDirection: e.target.value }); }}
                            style={Object.assign({}, inp, { width: 80, padding: '3px 6px', fontSize: 10 })}>
                            <option value="top">top</option>
                            <option value="left">left</option>
                            <option value="right">right</option>
                          </select>
                        </div>
                      )}

                      {room.elements.length === 0 && (
                        <div style={{ color: '#444', fontSize: 11, padding: '8px 0', fontFamily: "'Space Mono', monospace" }}>
                          No elements yet
                        </div>
                      )}

                      {room.elements.map(function(el) {
                        return (
                          <div key={el.id} style={{
                            padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.025)',
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                          }}>
                            {React.createElement(Tag, {
                              color: el.type === 'text' ? '#6366f1' : el.type === 'link' ? '#ec4899' : '#14b8a6',
                              label: el.type.toUpperCase(),
                            })}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {editingEl === el.id && !isView ? (
                                React.createElement(ElementForm, {
                                  el: el, roomIndex: ri,
                                  onDone: function() { setEditingEl(null); },
                                })
                              ) : (
                                <div>
                                  {el.type === 'image' ? (
                                    <div>
                                      {el.src && <img src={el.src} alt="" style={{
                                        maxWidth: 100, maxHeight: 60, borderRadius: 3, objectFit: 'cover',
                                      }} onError={function(e) { e.target.style.display = 'none'; }} />}
                                      <div style={{ fontSize: 9, color: '#555', wordBreak: 'break-all', marginTop: 2 }}>
                                        {el.src ? el.src.substring(0, 50) : 'No URL set'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{
                                        color: el.color || '#ccc', fontSize: 11,
                                        fontFamily: "'Space Mono', monospace", lineHeight: 1.4,
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                      }}>{el.content}</div>
                                      {el.type === 'link' && (
                                        <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>
                                          {el.url}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {!isView && editingEl !== el.id && (
                              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                <Btn small onClick={function() { setEditingEl(el.id); }} label="Edit" />
                                <Btn small danger onClick={function() { removeRoomElement(ri, el.id); }} label="x" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add element buttons */}
                      {!isView && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 5 }}>
                          {['text', 'image', 'link'].map(function(type) {
                            return (
                              <Btn key={type} small onClick={function() {
                                var newEl = {
                                  id: 'el_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                                  type: type, x: 0.5, y: 0.5,
                                  fontSize: type === 'image' ? undefined : 1.0,
                                  color: sec ? sec.color : '#fff',
                                };
                                if (type === 'text') { newEl.content = 'New text'; }
                                if (type === 'link') { newEl.content = 'New link'; newEl.url = 'https://example.com'; }
                                if (type === 'image') { newEl.src = ''; newEl.width = 150; newEl.height = 100; }
                                addRoomElement(ri, newEl);
                                setEditingEl(newEl.id);
                              }} label={'+ ' + type} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Add room button */}
          {!isView && (
            <div style={{ marginTop: 12, marginBottom: 20 }}>
              <Btn onClick={function() { addRoom(rooms.length - 1, sections[0] ? sections[0].id : 'intro'); }}
                label="+ Add New Room" accent style={{ width: '100%', padding: '10px 0' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Element Edit Form ----
function ElementForm({ el, roomIndex, onDone }) {
  var updateRoomElement = useStore(function(s) { return s.updateRoomElement; });
  var vState = useState(Object.assign({}, el));
  var v = vState[0];
  var setV = vState[1];

  var save = function() { updateRoomElement(roomIndex, el.id, v); onDone(); };

  var inp = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ddd', padding: '5px 8px', borderRadius: 4,
    fontSize: 11, fontFamily: "'Space Mono', monospace", width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {el.type !== 'image' && (
        <textarea value={v.content || ''}
          onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { content: val }); }); }}
          placeholder="Content text..." rows={el.type === 'text' ? 3 : 1}
          style={Object.assign({}, inp, { resize: 'vertical', minHeight: 30 })} />
      )}
      {el.type === 'image' && (
        <React.Fragment>
          <input value={v.src || ''}
            onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { src: val }); }); }}
            placeholder="Image or GIF URL" style={inp} />
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="number" value={v.width || 150}
              onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { width: +val || 150 }); }); }}
              placeholder="Width" style={Object.assign({}, inp, { width: 70 })} />
            <input type="number" value={v.height || 100}
              onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { height: +val || 100 }); }); }}
              placeholder="Height" style={Object.assign({}, inp, { width: 70 })} />
          </div>
        </React.Fragment>
      )}
      {el.type === 'link' && (
        <input value={v.url || ''}
          onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { url: val }); }); }}
          placeholder="https://..." style={inp} />
      )}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <label style={{ fontSize: 9, color: '#666', fontFamily: "'Space Mono', monospace" }}>X:</label>
          <input type="number" value={v.x} step={0.05} min={0} max={1}
            onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { x: +val }); }); }}
            style={Object.assign({}, inp, { width: 55, padding: '3px 5px' })} />
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <label style={{ fontSize: 9, color: '#666', fontFamily: "'Space Mono', monospace" }}>Y:</label>
          <input type="number" value={v.y} step={0.05} min={0} max={1}
            onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { y: +val }); }); }}
            style={Object.assign({}, inp, { width: 55, padding: '3px 5px' })} />
        </div>
        {el.type !== 'image' && (
          <React.Fragment>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <label style={{ fontSize: 9, color: '#666', fontFamily: "'Space Mono', monospace" }}>Size:</label>
              <input type="number" value={v.fontSize || 1} step={0.1} min={0.3} max={5}
                onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { fontSize: +val }); }); }}
                style={Object.assign({}, inp, { width: 50, padding: '3px 5px' })} />
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <label style={{ fontSize: 9, color: '#666', fontFamily: "'Space Mono', monospace" }}>Color:</label>
              <input value={v.color || '#fff'}
                onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { color: val }); }); }}
                style={Object.assign({}, inp, { width: 75, padding: '3px 5px' })} />
              <input type="color" value={v.color || '#ffffff'}
                onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { color: val }); }); }}
                style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>
          </React.Fragment>
        )}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <Btn small accent onClick={save} label="Save" />
        <Btn small onClick={onDone} label="Cancel" />
      </div>
    </div>
  );
}

// ---- Section Editor ----
function SectionEditor({ section, onUpdate, onDelete, canDelete }) {
  var editingState = useState(false);
  var editing = editingState[0];
  var setEditing = editingState[1];
  var vState = useState(Object.assign({}, section));
  var v = vState[0];
  var setV = vState[1];

  if (!editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: section.color, flexShrink: 0 }} />
        <span style={{ flex: 1, color: '#ccc', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
          {section.name}
        </span>
        <Btn small onClick={function() { setV(Object.assign({}, section)); setEditing(true); }} label="Edit" />
        {canDelete && <Btn small danger onClick={onDelete} label="x" />}
      </div>
    );
  }

  var inp = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ddd', padding: '4px 7px', borderRadius: 3,
    fontSize: 11, fontFamily: "'Space Mono', monospace",
  };

  return (
    <div style={{
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
      display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <input value={v.name}
        onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { name: val }); }); }}
        placeholder="Name" style={Object.assign({}, inp, { width: 130 })} />
      <input value={v.color}
        onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { color: val }); }); }}
        style={Object.assign({}, inp, { width: 75 })} />
      <input type="color" value={v.color}
        onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { color: val }); }); }}
        style={{ width: 20, height: 20, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }} />
      <input value={v.gif || ''}
        onChange={function(e) { var val = e.target.value; setV(function(p) { return Object.assign({}, p, { gif: val }); }); }}
        placeholder="GIF URL" style={Object.assign({}, inp, { width: 150 })} />
      <Btn small accent onClick={function() { onUpdate(v); setEditing(false); }} label="OK" />
      <Btn small onClick={function() { setEditing(false); }} label="X" />
    </div>
  );
}

// ---- Reusable Button ----
function Btn({ onClick, label, small, accent, danger, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={Object.assign({
        background: danger ? 'rgba(255,50,50,0.12)' : accent ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (danger ? 'rgba(255,50,50,0.25)' : accent ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'),
        color: danger ? '#f66' : accent ? '#818cf8' : '#999',
        padding: small ? '3px 8px' : '5px 14px',
        borderRadius: 4, fontSize: small ? 10 : 11,
        fontFamily: "'Space Mono', monospace",
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }, style || {})}>
      {label}
    </button>
  );
}

function Tag({ color, label }) {
  return (
    <span style={{
      fontSize: 8, padding: '2px 5px', borderRadius: 2,
      fontFamily: "'Space Mono', monospace", flexShrink: 0,
      background: color + '18', color: color, letterSpacing: 0.5,
    }}>{label}</span>
  );
}