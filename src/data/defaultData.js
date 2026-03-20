export var defaultSections = [
  {
    "id": "intro",
    "name": "Introduction",
    "color": "#6366f1",
    "gif": ""
  },
  {
    "id": "projects",
    "name": "Projects",
    "color": "#ec4899",
    "gif": ""
  },
  {
    "id": "skills",
    "name": "Skills & Tools",
    "color": "#14b8a6",
    "gif": ""
  },
  {
    "id": "contact",
    "name": "Contact",
    "color": "#f59e0b",
    "gif": ""
  }
];

export var defaultRooms = [
  {
    "id": "room_001",
    "section": "intro",
    "exitDirection": "top",
    "elements": [
      {
        "id": "e1",
        "type": "text",
        "content": "Welcome to My World",
        "x": 0.5, "y": 0.22,
        "fontSize": 2.4,
        "color": "#ffffff",
        "fontWeight": "bold"
      },
      {
        "id": "e2",
        "type": "text",
        "content": "I build experiences that live between art and code.\nNavigate with WASD or Arrow keys, or just scroll.",
        "x": 0.5, "y": 0.42,
        "fontSize": 0.95,
        "color": "#9090b8",
        "maxWidth": 440
      },
      {
        "id": "e3",
        "type": "image",
        "src": "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd6MW02OWl4dXR2M2JlZjZhZXBiOWtqZnFlcjF4aTBuZ2d6YzRyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif",
        "x": 0.5, "y": 0.7,
        "width": 180, "height": 120
      }
    ]
  },
  {
    "id": "room_002",
    "section": "intro",
    "exitDirection": "right",
    "elements": [
      {
        "id": "e4",
        "type": "text",
        "content": "Creative Developer",
        "x": 0.5, "y": 0.2,
        "fontSize": 1.9,
        "color": "#ffffff",
        "fontWeight": "bold"
      },
      {
        "id": "e5",
        "type": "text",
        "content": "Specializing in immersive web experiences, interactive installations, and generative art. Every pixel has a purpose.",
        "x": 0.5, "y": 0.42,
        "fontSize": 0.85,
        "color": "#a0a0c8",
        "maxWidth": 400
      },
      {
        "id": "e6",
        "type": "link",
        "content": "View GitHub Profile",
        "url": "https://github.com",
        "x": 0.5, "y": 0.65,
        "fontSize": 1.1,
        "color": "#6366f1"
      }
    ]
  },
  {
    "id": "room_003",
    "section": "projects",
    "exitDirection": "left",
    "elements": [
      {
        "id": "e7",
        "type": "text",
        "content": "Nebula Engine",
        "x": 0.5, "y": 0.18,
        "fontSize": 1.8,
        "color": "#ec4899",
        "fontWeight": "bold"
      },
      {
        "id": "e8",
        "type": "text",
        "content": "Real-time particle system with WebGL. Millions of particles, GPU-accelerated physics, custom shaders for volumetric effects.",
        "x": 0.5, "y": 0.38,
        "fontSize": 0.82,
        "color": "#c0a0c8",
        "maxWidth": 400
      },
      {
        "id": "e10",
        "type": "link",
        "content": "Live Demo",
        "url": "https://example.com",
        "x": 0.5, "y": 0.65,
        "fontSize": 1.0,
        "color": "#ec4899"
      }
    ]
  },
  {
    "id": "room_004",
    "section": "projects",
    "exitDirection": "top",
    "elements": [
      {
        "id": "e11",
        "type": "text",
        "content": "SoundScape",
        "x": 0.5, "y": 0.18,
        "fontSize": 1.8,
        "color": "#ec4899",
        "fontWeight": "bold"
      },
      {
        "id": "e12",
        "type": "text",
        "content": "Audio visualization that transforms music into 3D terrain. Web Audio API meets procedural generation.",
        "x": 0.5, "y": 0.4,
        "fontSize": 0.82,
        "color": "#c0a0c8",
        "maxWidth": 400
      },
      {
        "id": "e13",
        "type": "link",
        "content": "Experience It",
        "url": "https://example.com",
        "x": 0.5, "y": 0.62,
        "fontSize": 1.0,
        "color": "#ec4899"
      }
    ]
  },
  {
    "id": "room_005",
    "section": "skills",
    "exitDirection": "right",
    "elements": [
      {
        "id": "e14",
        "type": "text",
        "content": "Technical Stack",
        "x": 0.5, "y": 0.15,
        "fontSize": 1.7,
        "color": "#14b8a6",
        "fontWeight": "bold"
      },
      {
        "id": "e15",
        "type": "text",
        "content": "React / Three.js / WebGL / GLSL\nTypeScript / Node.js / Python / Rust\nFigma / Blender / After Effects",
        "x": 0.5, "y": 0.4,
        "fontSize": 0.9,
        "color": "#80c8b8",
        "maxWidth": 400
      },
      {
        "id": "e16",
        "type": "text",
        "content": "The best interface is one you can walk through.",
        "x": 0.5, "y": 0.68,
        "fontSize": 1.0,
        "color": "#14b8a6",
        "fontStyle": "italic"
      }
    ]
  },
  {
    "id": "room_006",
    "section": "contact",
    "exitDirection": "top",
    "elements": [
      {
        "id": "e17",
        "type": "text",
        "content": "Lets Build Something",
        "x": 0.5, "y": 0.18,
        "fontSize": 2.0,
        "color": "#f59e0b",
        "fontWeight": "bold"
      },
      {
        "id": "e18",
        "type": "text",
        "content": "Open to collaborations, commissions, and interesting conversations about the future of the web.",
        "x": 0.5, "y": 0.38,
        "fontSize": 0.85,
        "color": "#c8b080",
        "maxWidth": 400
      },
      {
        "id": "e19",
        "type": "link",
        "content": "Email",
        "url": "mailto:oskar@iwota.com",
        "x": 0.3, "y": 0.58,
        "fontSize": 1.1,
        "color": "#f59e0b"
      },
      {
        "id": "e20",
        "type": "link",
        "content": "Twitter",
        "url": "https://twitter.com",
        "x": 0.7, "y": 0.58,
        "fontSize": 1.1,
        "color": "#f59e0b"
      },
      {
        "id": "e21",
        "type": "link",
        "content": "LinkedIn",
        "url": "https://linkedin.com",
        "x": 0.5, "y": 0.72,
        "fontSize": 1.1,
        "color": "#f59e0b"
      }
    ]
  }
];