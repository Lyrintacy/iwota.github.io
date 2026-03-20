import { create } from 'zustand';
import roomsData from '../data/rooms';
import sectionsData from '../data/sections.json';

const useStore = create((set, get) => ({
  // Room data
  rooms: JSON.parse(JSON.stringify(roomsData)),
  sections: JSON.parse(JSON.stringify(sectionsData)),
  
  // Current state
  currentRoomIndex: 0,
  previousRoomIndex: -1,
  
  // Player
  playerPos: { x: 0.5, y: 0.85 },
  playerSpeed: 0.012,
  keysPressed: {},
  
  // Transition
  transitioning: false,
  transitionPhase: 'none',
  transitionOpacity: 0,
  
  // UI
  showEditor: false,
  editorMode: 'view',
  mapHovered: false,
  hoveredLink: null,
  entryFade: 1.0,
  hasEntered: false,
  
  elementDisplacements: {},

  // Actions
  setPlayerPos: (pos) => set({ playerPos: pos }),
  
  setKeyPressed: (key, pressed) => set(state => ({
    keysPressed: { ...state.keysPressed, [key]: pressed }
  })),
  
  setMapHovered: (hovered) => set({ mapHovered: hovered }),
  setHoveredLink: (link) => set({ hoveredLink: link }),
  setEntryFade: (val) => set({ entryFade: val }),
  setHasEntered: (val) => set({ hasEntered: val }),
  setElementDisplacements: (disps) => set({ elementDisplacements: disps }),
  
  getCurrentRoom: () => {
    const state = get();
    return state.rooms[state.currentRoomIndex];
  },
  
  getRoomSection: (room) => {
    const state = get();
    return state.sections.find(s => s.id === room.section);
  },
  
  isFirstRoomOfSection: (roomIndex) => {
    const state = get();
    if (roomIndex === 0) return true;
    const currentRoom = state.rooms[roomIndex];
    const prevRoom = state.rooms[roomIndex - 1];
    return currentRoom.section !== prevRoom.section;
  },
  
  navigateToRoom: (targetIndex) => {
    const state = get();
    if (state.transitioning) return;
    if (targetIndex < 0 || targetIndex >= state.rooms.length) return;
    if (targetIndex === state.currentRoomIndex) return;
    
    set({
      transitioning: true,
      transitionPhase: 'fadeOut',
      previousRoomIndex: state.currentRoomIndex,
    });
    
    const fadeOutDuration = 400;
    const fadeInDuration = 500;
    const startTime = Date.now();
    
    const animateFadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      set({ transitionOpacity: progress });
      
      if (progress < 1) {
        requestAnimationFrame(animateFadeOut);
      } else {
        set({
          currentRoomIndex: targetIndex,
          transitionPhase: 'fadeIn',
          elementDisplacements: {},
          playerPos: { x: 0.5, y: 0.85 },
        });
        
        const fadeInStart = Date.now();
        const animateFadeIn = () => {
          const elapsed2 = Date.now() - fadeInStart;
          const progress2 = Math.min(elapsed2 / fadeInDuration, 1);
          set({ transitionOpacity: 1 - progress2 });
          
          if (progress2 < 1) {
            requestAnimationFrame(animateFadeIn);
          } else {
            set({
              transitioning: false,
              transitionPhase: 'none',
              transitionOpacity: 0,
            });
          }
        };
        requestAnimationFrame(animateFadeIn);
      }
    };
    requestAnimationFrame(animateFadeOut);
  },
  
  navigateNext: () => {
    const state = get();
    get().navigateToRoom(state.currentRoomIndex + 1);
  },
  
  navigatePrev: () => {
    const state = get();
    get().navigateToRoom(state.currentRoomIndex - 1);
  },
  
  toggleEditor: (mode) => set(state => {
    if (state.showEditor && state.editorMode === mode) {
      return { showEditor: false };
    }
    return { showEditor: true, editorMode: mode };
  }),
  
  updateRoomElement: (roomIndex, elementId, updates) => set(state => {
    const newRooms = [...state.rooms];
    const room = { ...newRooms[roomIndex] };
    room.elements = room.elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    newRooms[roomIndex] = room;
    return { rooms: newRooms };
  }),
  
  addRoomElement: (roomIndex, element) => set(state => {
    const newRooms = [...state.rooms];
    const room = { ...newRooms[roomIndex] };
    room.elements = [...room.elements, element];
    newRooms[roomIndex] = room;
    return { rooms: newRooms };
  }),
  
  removeRoomElement: (roomIndex, elementId) => set(state => {
    const newRooms = [...state.rooms];
    const room = { ...newRooms[roomIndex] };
    room.elements = room.elements.filter(e => e.id !== elementId);
    newRooms[roomIndex] = room;
    return { rooms: newRooms };
  }),
  
  moveRoom: (fromIndex, toIndex) => set(state => {
    if (toIndex < 0 || toIndex >= state.rooms.length) return {};
    const newRooms = [...state.rooms];
    const [room] = newRooms.splice(fromIndex, 1);
    newRooms.splice(toIndex, 0, room);
    let newCurrentIndex = state.currentRoomIndex;
    if (state.currentRoomIndex === fromIndex) {
      newCurrentIndex = toIndex;
    }
    return { rooms: newRooms, currentRoomIndex: newCurrentIndex };
  }),
}));

export default useStore;