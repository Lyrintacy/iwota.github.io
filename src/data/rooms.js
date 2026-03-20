const rooms = [
  {
    id: "room_001",
    section: "intro",
    exitDirection: "top",
    elements: [
      {
        id: "e1",
        type: "text",
        content: "Welcome to My Portfolio",
        x: 0.5,
        y: 0.3,
        fontSize: 2.2,
        color: "#ffffff",
        fontWeight: "bold"
      },
      {
        id: "e2",
        type: "text",
        content: "Navigate with WASD or Arrow Keys",
        x: 0.5,
        y: 0.5,
        fontSize: 1.0,
        color: "#a0a0c0"
      },
      {
        id: "e3",
        type: "text",
        content: "Walk into doors to explore rooms",
        x: 0.5,
        y: 0.6,
        fontSize: 0.9,
        color: "#8080a0"
      },
      {
        id: "e4",
        type: "image",
        src: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
        x: 0.5,
        y: 0.78,
        width: 140,
        height: 100
      }
    ]
  },
  {
    id: "room_002",
    section: "intro",
    exitDirection: "right",
    elements: [
      {
        id: "e5",
        type: "text",
        content: "I'm a Creative Developer",
        x: 0.5,
        y: 0.25,
        fontSize: 1.8,
        color: "#ffffff",
        fontWeight: "bold"
      },
      {
        id: "e6",
        type: "text",
        content: "Building immersive web experiences with code and design. I love blending technology with art to create things that feel alive.",
        x: 0.5,
        y: 0.45,
        fontSize: 0.85,
        color: "#b0b0d0",
        maxWidth: 400
      },
      {
        id: "e7",
        type: "link",
        content: "View My GitHub →",
        url: "https://github.com",
        x: 0.5,
        y: 0.7,
        fontSize: 1.1,
        color: "#6366f1"
      }
    ]
  },
  {
    id: "room_003",
    section: "projects",
    exitDirection: "left",
    elements: [
      {
        id: "e8",
        type: "text",
        content: "Project: Nebula Engine",
        x: 0.5,
        y: 0.2,
        fontSize: 1.6,
        color: "#ec4899",
        fontWeight: "bold"
      },
      {
        id: "e9",
        type: "text",
        content: "A real-time particle system built with WebGL and custom shaders. Supports millions of particles with GPU-accelerated physics.",
        x: 0.5,
        y: 0.4,
        fontSize: 0.8,
        color: "#c0a0c0",
        maxWidth: 380
      },
      {
        id: "e10",
        type: "image",
        src: "https://media.giphy.com/media/3oKIPnAiaMCJ8dO8Hu/giphy.gif",
        x: 0.3,
        y: 0.65,
        width: 150,
        height: 110
      },
      {
        id: "e11",
        type: "link",
        content: "Live Demo →",
        url: "https://example.com/nebula",
        x: 0.7,
        y: 0.65,
        fontSize: 1.0,
        color: "#ec4899"
      }
    ]
  },
  {
    id: "room_004",
    section: "projects",
    exitDirection: "top",
    elements: [
      {
        id: "e12",
        type: "text",
        content: "Project: SoundScape",
        x: 0.5,
        y: 0.2,
        fontSize: 1.6,
        color: "#ec4899",
        fontWeight: "bold"
      },
      {
        id: "e13",
        type: "text",
        content: "An audio visualization tool that transforms music into 3D landscapes. Built with Web Audio API and Three.js.",
        x: 0.5,
        y: 0.42,
        fontSize: 0.8,
        color: "#c0a0c0",
        maxWidth: 380
      },
      {
        id: "e14",
        type: "image",
        src: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
        x: 0.5,
        y: 0.68,
        width: 180,
        height: 120
      },
      {
        id: "e15",
        type: "link",
        content: "Listen & Watch →",
        url: "https://example.com/soundscape",
        x: 0.5,
        y: 0.88,
        fontSize: 1.0,
        color: "#ec4899"
      }
    ]
  },
  {
    id: "room_005",
    section: "projects",
    exitDirection: "right",
    elements: [
      {
        id: "e16",
        type: "text",
        content: "Project: DataWeave",
        x: 0.5,
        y: 0.2,
        fontSize: 1.6,
        color: "#ec4899",
        fontWeight: "bold"
      },
      {
        id: "e17",
        type: "text",
        content: "Interactive data visualization platform. Transform complex datasets into beautiful, explorable visual stories.",
        x: 0.5,
        y: 0.42,
        fontSize: 0.8,
        color: "#c0a0c0",
        maxWidth: 380
      },
      {
        id: "e18",
        type: "link",
        content: "Explore Data →",
        url: "https://example.com/dataweave",
        x: 0.5,
        y: 0.65,
        fontSize: 1.0,
        color: "#ec4899"
      }
    ]
  },
  {
    id: "room_006",
    section: "skills",
    exitDirection: "top",
    elements: [
      {
        id: "e19",
        type: "text",
        content: "Technical Skills",
        x: 0.5,
        y: 0.18,
        fontSize: 1.6,
        color: "#14b8a6",
        fontWeight: "bold"
      },
      {
        id: "e20",
        type: "text",
        content: "React • Three.js • WebGL • TypeScript",
        x: 0.5,
        y: 0.35,
        fontSize: 0.9,
        color: "#80d0c0"
      },
      {
        id: "e21",
        type: "text",
        content: "Node.js • Python • Rust • GLSL",
        x: 0.5,
        y: 0.45,
        fontSize: 0.9,
        color: "#80d0c0"
      },
      {
        id: "e22",
        type: "text",
        content: "Figma • Blender • After Effects",
        x: 0.5,
        y: 0.55,
        fontSize: 0.9,
        color: "#80d0c0"
      },
      {
        id: "e23",
        type: "image",
        src: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif",
        x: 0.5,
        y: 0.76,
        width: 140,
        height: 100
      }
    ]
  },
  {
    id: "room_007",
    section: "skills",
    exitDirection: "left",
    elements: [
      {
        id: "e24",
        type: "text",
        content: "Design Philosophy",
        x: 0.5,
        y: 0.2,
        fontSize: 1.6,
        color: "#14b8a6",
        fontWeight: "bold"
      },
      {
        id: "e25",
        type: "text",
        content: "I believe in creating experiences that feel tactile and responsive. Every interaction should have weight and meaning. The web is a canvas — not a document.",
        x: 0.5,
        y: 0.45,
        fontSize: 0.85,
        color: "#a0c0b8",
        maxWidth: 400
      },
      {
        id: "e26",
        type: "text",
        content: "\"Make it feel like something.\"",
        x: 0.5,
        y: 0.72,
        fontSize: 1.1,
        color: "#14b8a6",
        fontStyle: "italic"
      }
    ]
  },
  {
    id: "room_008",
    section: "contact",
    exitDirection: "top",
    elements: [
      {
        id: "e27",
        type: "text",
        content: "Let's Connect",
        x: 0.5,
        y: 0.2,
        fontSize: 2.0,
        color: "#f59e0b",
        fontWeight: "bold"
      },
      {
        id: "e28",
        type: "text",
        content: "I'm always open to new projects and collaborations. Whether you have an idea or just want to chat — reach out!",
        x: 0.5,
        y: 0.4,
        fontSize: 0.85,
        color: "#c0b080",
        maxWidth: 380
      },
      {
        id: "e29",
        type: "link",
        content: "Email Me →",
        url: "mailto:hello@example.com",
        x: 0.35,
        y: 0.62,
        fontSize: 1.1,
        color: "#f59e0b"
      },
      {
        id: "e30",
        type: "link",
        content: "Twitter →",
        url: "https://twitter.com",
        x: 0.65,
        y: 0.62,
        fontSize: 1.1,
        color: "#f59e0b"
      },
      {
        id: "e31",
        type: "link",
        content: "LinkedIn →",
        url: "https://linkedin.com",
        x: 0.5,
        y: 0.75,
        fontSize: 1.1,
        color: "#f59e0b"
      },
      {
        id: "e32",
        type: "image",
        src: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
        x: 0.5,
        y: 0.9,
        width: 120,
        height: 80
      }
    ]
  }
];

export default rooms;