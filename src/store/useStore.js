import { create } from 'zustand';
import { defaultRooms, defaultSections } from '../data/defaultData';

var STORAGE_KEY = 'room_portfolio_data';
var GITHUB_GIST_KEY = 'room_portfolio_gist';

function loadSavedData() {
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.rooms && parsed.sections) return parsed;
    }
  } catch (e) { /* */ }
  return { rooms: defaultRooms, sections: defaultSections };
}

function saveData(rooms, sections) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms: rooms, sections: sections, savedAt: Date.now() }));
  } catch (e) { /* */ }
}

var useStore = create(function(set, get) {
  var initial = loadSavedData();

  return {
    rooms: initial.rooms,
    sections: initial.sections,
    currentRoomIndex: 0,

    playerPos: { x: 0.5, y: 0.82 },
    playerTarget: { x: 0.5, y: 0.82 },
    playerSpeed: 0.011,
    keysPressed: {},

    doorCooldown: false,
    doorFadeOpacity: 0,

    mapFadeOpacity: 0,
    isMapTransitioning: false,

    showEditor: false,
    editorMode: 'view',
    mapHovered: false,
    hoveredLink: null,
    entryFade: 1.0,
    hasEntered: false,
    notification: null,

    githubToken: localStorage.getItem('gh_token') || '',
    gistId: localStorage.getItem(GITHUB_GIST_KEY) || '',

    setPlayerPos: function(pos) { set({ playerPos: pos }); },
    setKeyPressed: function(key, val) {
      set(function(s) {
        var keys = {};
        for (var k in s.keysPressed) keys[k] = s.keysPressed[k];
        keys[key] = val;
        return { keysPressed: keys };
      });
    },
    setMapHovered: function(h) { set({ mapHovered: h }); },
    setHoveredLink: function(l) { set({ hoveredLink: l }); },
    setEntryFade: function(v) { set({ entryFade: v }); },
    setHasEntered: function(v) { set({ hasEntered: v }); },
    setNotification: function(n) {
      set({ notification: n });
      if (n) setTimeout(function() { set({ notification: null }); }, 3000);
    },
    setGithubToken: function(t) {
      localStorage.setItem('gh_token', t);
      set({ githubToken: t });
    },
    setGistId: function(id) {
      localStorage.setItem(GITHUB_GIST_KEY, id);
      set({ gistId: id });
    },

    scrollMovePlayer: function(rawDelta) {
      var s = get();
      if (s.isMapTransitioning || s.showEditor || s.doorCooldown) return;

      var room = s.rooms[s.currentRoomIndex];
      if (!room) return;

      var tx = s.playerTarget.x;
      var ty = s.playerTarget.y;

      var delta = rawDelta;
      if (delta > 300) delta = 300;
      if (delta < -300) delta = -300;

      var speed = Math.abs(delta) * 0.0008;

      var goalX, goalY;
      var goingForward = delta > 0;

      if (goingForward) {
        if (s.currentRoomIndex >= s.rooms.length - 1) return;
        if (room.exitDirection === 'top') { goalX = 0.5; goalY = 0.0; }
        else if (room.exitDirection === 'left') { goalX = 0.0; goalY = 0.5; }
        else { goalX = 1.0; goalY = 0.5; }
      } else {
        if (s.currentRoomIndex <= 0) return;
        goalX = 0.5;
        goalY = 1.0;
      }

      var dx = goalX - tx;
      var dy = goalY - ty;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.001) {
        var moveAmt = Math.min(speed, dist);
        tx += (dx / dist) * moveAmt;
        ty += (dy / dist) * moveAmt;
      }

      tx = Math.max(0.0, Math.min(1.0, tx));
      ty = Math.max(0.0, Math.min(1.0, ty));

      set({ playerTarget: { x: tx, y: ty } });
    },

    lerpPlayerToTarget: function() {
      var s = get();
      if (s.doorCooldown) return;

      var px = s.playerPos.x;
      var py = s.playerPos.y;
      var tx = s.playerTarget.x;
      var ty = s.playerTarget.y;

      var dx = tx - px;
      var dy = ty - py;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.001) return;

      var lerpFactor = 0.1;
      set({ playerPos: { x: px + dx * lerpFactor, y: py + dy * lerpFactor } });
    },

    movePlayerDirect: function(newPos) {
      set({ playerPos: newPos, playerTarget: newPos });
    },

    // Door transition with fade
    navigateViaDoor: function(direction) {
      var s = get();
      if (s.isMapTransitioning || s.doorCooldown) return;

      var newIndex = s.currentRoomIndex + direction;
      if (newIndex < 0 || newIndex >= s.rooms.length) return;

      set({ doorCooldown: true, doorFadeOpacity: 0 });

      // Fade to black
      var fadeOutStart = Date.now();
      var fadeOutDuration = 180;
      var fadeInDuration = 250;

      var animateFadeOut = function() {
        var elapsed = Date.now() - fadeOutStart;
        var p = Math.min(elapsed / fadeOutDuration, 1);
        set({ doorFadeOpacity: p });

        if (p < 1) {
          requestAnimationFrame(animateFadeOut);
        } else {
          // Switch room at peak black
          var startPos = direction === 1
            ? { x: 0.5, y: 0.82 }
            : { x: 0.5, y: 0.2 };

          set({
            currentRoomIndex: newIndex,
            playerPos: startPos,
            playerTarget: startPos,
          });

          // Fade back in
          var fadeInStart = Date.now();
          var animateFadeIn = function() {
            var elapsed2 = Date.now() - fadeInStart;
            var p2 = Math.min(elapsed2 / fadeInDuration, 1);
            set({ doorFadeOpacity: 1 - p2 });

            if (p2 < 1) {
              requestAnimationFrame(animateFadeIn);
            } else {
              set({ doorFadeOpacity: 0, doorCooldown: false });
            }
          };
          requestAnimationFrame(animateFadeIn);
        }
      };
      requestAnimationFrame(animateFadeOut);
    },

    navigateViaMap: function(targetIndex) {
      var s = get();
      if (s.isMapTransitioning) return;
      if (targetIndex === s.currentRoomIndex) return;
      if (targetIndex < 0 || targetIndex >= s.rooms.length) return;

      set({ isMapTransitioning: true, mapFadeOpacity: 0 });

      var fadeOut = function(start) {
        var elapsed = Date.now() - start;
        var p = Math.min(elapsed / 300, 1);
        set({ mapFadeOpacity: p });
        if (p < 1) {
          requestAnimationFrame(function() { fadeOut(start); });
        } else {
          var startPos = { x: 0.5, y: 0.82 };
          set({
            currentRoomIndex: targetIndex,
            playerPos: startPos,
            playerTarget: startPos,
          });
          var fadeIn = function(start2) {
            var elapsed2 = Date.now() - start2;
            var p2 = Math.min(elapsed2 / 400, 1);
            set({ mapFadeOpacity: 1 - p2 });
            if (p2 < 1) {
              requestAnimationFrame(function() { fadeIn(start2); });
            } else {
              set({ isMapTransitioning: false, mapFadeOpacity: 0 });
            }
          };
          requestAnimationFrame(function() { fadeIn(Date.now()); });
        }
      };
      requestAnimationFrame(function() { fadeOut(Date.now()); });
    },

    toggleEditor: function(mode) {
      set(function(s) {
        if (s.showEditor && s.editorMode === mode) return { showEditor: false };
        return { showEditor: true, editorMode: mode };
      });
    },

    updateRoom: function(roomIndex, updates) {
      set(function(s) {
        var rooms = s.rooms.slice();
        var r = {};
        for (var k in rooms[roomIndex]) r[k] = rooms[roomIndex][k];
        for (var k2 in updates) r[k2] = updates[k2];
        rooms[roomIndex] = r;
        saveData(rooms, s.sections);
        return { rooms: rooms };
      });
    },

    updateRoomElement: function(roomIndex, elementId, updates) {
      set(function(s) {
        var rooms = JSON.parse(JSON.stringify(s.rooms));
        var elements = rooms[roomIndex] ? rooms[roomIndex].elements : [];
        for (var i = 0; i < elements.length; i++) {
          if (elements[i].id === elementId) {
            for (var k in updates) elements[i][k] = updates[k];
            break;
          }
        }
        saveData(rooms, s.sections);
        return { rooms: rooms };
      });
    },

    addRoomElement: function(roomIndex, element) {
      set(function(s) {
        var rooms = JSON.parse(JSON.stringify(s.rooms));
        rooms[roomIndex].elements.push(element);
        saveData(rooms, s.sections);
        return { rooms: rooms };
      });
    },

    removeRoomElement: function(roomIndex, elementId) {
      set(function(s) {
        var rooms = JSON.parse(JSON.stringify(s.rooms));
        rooms[roomIndex].elements = rooms[roomIndex].elements.filter(function(e) {
          return e.id !== elementId;
        });
        saveData(rooms, s.sections);
        return { rooms: rooms };
      });
    },

    addRoom: function(afterIndex, sectionId) {
      set(function(s) {
        var exits = ['top', 'left', 'right'];
        var newRoom = {
          id: 'room_' + Date.now(),
          section: sectionId || (s.sections[0] ? s.sections[0].id : 'intro'),
          exitDirection: exits[Math.floor(Math.random() * 3)],
          elements: [{
            id: 'e_' + Date.now(),
            type: 'text', content: 'New Room',
            x: 0.5, y: 0.3, fontSize: 1.8,
            color: '#ffffff', fontWeight: 'bold',
          }],
        };
        var rooms = s.rooms.slice();
        rooms.splice(afterIndex + 1, 0, newRoom);
        saveData(rooms, s.sections);
        return { rooms: rooms };
      });
    },

    deleteRoom: function(roomIndex) {
      set(function(s) {
        if (s.rooms.length <= 1) return {};
        var rooms = s.rooms.filter(function(_, i) { return i !== roomIndex; });
        var current = s.currentRoomIndex;
        if (current >= rooms.length) current = rooms.length - 1;
        if (current === roomIndex && current > 0) current--;
        saveData(rooms, s.sections);
        return { rooms: rooms, currentRoomIndex: current };
      });
    },

    moveRoom: function(from, to) {
      set(function(s) {
        if (to < 0 || to >= s.rooms.length) return {};
        var rooms = s.rooms.slice();
        var item = rooms.splice(from, 1)[0];
        rooms.splice(to, 0, item);
        var current = s.currentRoomIndex;
        if (current === from) current = to;
        else if (from < current && to >= current) current--;
        else if (from > current && to <= current) current++;
        saveData(rooms, s.sections);
        return { rooms: rooms, currentRoomIndex: current };
      });
    },

    updateSection: function(sectionId, updates) {
      set(function(s) {
        var sections = s.sections.map(function(sec) {
          if (sec.id !== sectionId) return sec;
          var n = {};
          for (var k in sec) n[k] = sec[k];
          for (var k2 in updates) n[k2] = updates[k2];
          return n;
        });
        saveData(s.rooms, sections);
        return { sections: sections };
      });
    },

    addSection: function(section) {
      set(function(s) {
        var sections = s.sections.concat([section]);
        saveData(s.rooms, sections);
        return { sections: sections };
      });
    },

    deleteSection: function(sectionId) {
      set(function(s) {
        var sections = s.sections.filter(function(sec) { return sec.id !== sectionId; });
        var fallback = sections[0] ? sections[0].id : 'default';
        var rooms = s.rooms.map(function(r) {
          if (r.section !== sectionId) return r;
          var copy = {};
          for (var k in r) copy[k] = r[k];
          copy.section = fallback;
          return copy;
        });
        saveData(rooms, sections);
        return { sections: sections, rooms: rooms };
      });
    },

    exportJSON: function() {
      var s = get();
      var data = JSON.stringify({ rooms: s.rooms, sections: s.sections }, null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'portfolio-data.json'; a.click();
      URL.revokeObjectURL(url);
      get().setNotification('Exported portfolio-data.json');
    },

    importJSON: function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (data.rooms && data.sections) {
            set({ rooms: data.rooms, sections: data.sections, currentRoomIndex: 0 });
            saveData(data.rooms, data.sections);
            get().setNotification('Imported successfully');
          }
        } catch (err) {
          get().setNotification('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    },

    saveToGist: async function() {
      var s = get();
      if (!s.githubToken) { get().setNotification('Set GitHub token first'); return; }
      var data = JSON.stringify({ rooms: s.rooms, sections: s.sections }, null, 2);
      try {
        var headers = { 'Authorization': 'token ' + s.githubToken, 'Content-Type': 'application/json' };
        var body = { description: 'Room Portfolio Data', public: false, files: { 'portfolio-data.json': { content: data } } };
        var response;
        if (s.gistId) {
          response = await fetch('https://api.github.com/gists/' + s.gistId, { method: 'PATCH', headers: headers, body: JSON.stringify(body) });
        } else {
          response = await fetch('https://api.github.com/gists', { method: 'POST', headers: headers, body: JSON.stringify(body) });
        }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var result = await response.json();
        get().setGistId(result.id);
        get().setNotification('Saved to GitHub Gist');
      } catch (err) { get().setNotification('GitHub save failed: ' + err.message); }
    },

    loadFromGist: async function() {
      var s = get();
      if (!s.githubToken || !s.gistId) { get().setNotification('Set GitHub token and Gist ID'); return; }
      try {
        var response = await fetch('https://api.github.com/gists/' + s.gistId, { headers: { 'Authorization': 'token ' + s.githubToken } });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var result = await response.json();
        var content = result.files['portfolio-data.json'] ? result.files['portfolio-data.json'].content : null;
        if (content) {
          var data = JSON.parse(content);
          set({ rooms: data.rooms, sections: data.sections, currentRoomIndex: 0 });
          saveData(data.rooms, data.sections);
          get().setNotification('Loaded from GitHub');
        }
      } catch (err) { get().setNotification('Load failed: ' + err.message); }
    },

    resetToDefaults: function() {
      set({ rooms: defaultRooms, sections: defaultSections, currentRoomIndex: 0 });
      saveData(defaultRooms, defaultSections);
      get().setNotification('Reset to defaults');
    },
  };
});

export default useStore;