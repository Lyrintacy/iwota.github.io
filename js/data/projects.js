var PROJECTS = [
    {
        id: 'creature-rpg',
        num: 'I',
        title: 'Game Project 1',
        short: 'A creature breeding RPG with procedural genetics.',
        tagline: 'the stuff about game project 1',
        role: 'Lead Designer',
        team: 'Solo + 1 Artist',
        engine: 'Unity',
        timeframe: '2 weeks',
        tags: ['Procedural', 'Genetics', 'Roguelike'],
        // Thumbnail - supports PNG, JPG, GIF
        thumbnail: 'assets/project1-thumb.gif',
        // Links
        links: [
            { label: 'Play on itch.io', url: 'https://lyrintacy.itch.io/', icon: 'itch' },
            { label: 'Source Code', url: '#', icon: 'github' }
        ],
        // Content blocks - fully customizable order and layout
        // Types: 'text', 'image', 'gallery', 'video', 'quote', 'heading', 'columns'
        content: [
            {
                type: 'heading',
                text: 'About This Project'
            },
            {
                type: 'text',
                text: 'Your first paragraph of description here. Explain the core concept.'
            },
            {
                type: 'image',
                src: 'assets/project1-screenshot1.png',
                caption: 'The main gameplay loop',
                size: 'full' // 'full', 'medium', 'small'
            },
            {
                type: 'text',
                text: 'Another paragraph explaining mechanics or design decisions.'
            },
            {
                type: 'gallery',
                images: [
                    { src: 'assets/project1-screenshot2.png', caption: 'Character creation' },
                    { src: 'assets/project1-screenshot3.png', caption: 'Battle system' }
                ]
            },
            {
                type: 'columns',
                left: {
                    type: 'image',
                    src: 'assets/project1-detail1.png',
                    caption: 'UI mockup'
                },
                right: {
                    type: 'text',
                    text: 'This is text next to an image. You can explain specific design decisions here while showing the visual.'
                }
            },
            {
                type: 'quote',
                text: 'The best systems are the ones that surprise their creators.',
                author: 'Design philosophy'
            },
            {
                type: 'heading',
                text: 'Technical Details'
            },
            {
                type: 'text',
                text: 'Final paragraph about technical implementation.'
            }
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="38" r="22" stroke="currentColor" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="48" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="32" cy="32" r="2.5" fill="#1a0e35"/><circle cx="48" cy="32" r="2.5" fill="#1a0e35"/><path d="M34 46Q40 52 46 46" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/></svg>'
    },
    {
        id: 'nana-banana',
        num: 'II',
        title: 'Nana into the Banana',
        short: 'Dodge, Dive, Bomb, Boomerang, and leave a trail of destruction.',
        tagline: 'The banana is the key to everything.',
        role: 'Game Designer',
        team: '10 people',
        engine: 'Unity',
        timeframe: '4 weeks',
        tags: ['absurd', 'banana', 'action'],
        thumbnail: 'assets/nana-thumb.gif',
        links: [
            { label: 'Play on itch.io', url: 'https://lyrintacy.itch.io/', icon: 'itch' }
        ],
        content: [
            {
                type: 'text',
                text: 'Defeat enemies to gain XP. Once you collect enough XP, you\'re ready to evolve — but it won\'t happen automatically.'
            },
            {
                type: 'image',
                src: 'assets/nana-screenshot1.png',
                caption: 'The evolution radio mechanic',
                size: 'full'
            },
            {
                type: 'columns',
                left: {
                    type: 'text',
                    text: 'Listen carefully. Somewhere on the map, a strange radio begins playing odd music. Find it. Step into the Radio Area and survive for 15 seconds while enemies swarm you.'
                },
                right: {
                    type: 'image',
                    src: 'assets/nana-screenshot2.png',
                    caption: 'Radio area gameplay'
                }
            },
            {
                type: 'text',
                text: 'Complete the ritual to evolve. Repeat the process. Grow stronger. Fight harder. Survive longer. Evolve again and again until you reach your final form, the Full Banana State. Ascend. Become a BANANA!'
            },
            {
                type: 'quote',
                text: 'You will die. A lot. And you\'ll love it.',
                author: 'Game tagline'
            }
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><ellipse cx="40" cy="42" rx="18" ry="20" stroke="currentColor" stroke-width="2" opacity="0.5"/><path d="M24 28L28 12L34 24" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/><path d="M56 28L52 12L46 24" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/><circle cx="34" cy="36" r="4" fill="currentColor" opacity="0.4"/><circle cx="46" cy="36" r="4" fill="currentColor" opacity="0.4"/><path d="M37 48Q40 51 43 48" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.3"/></svg>'
    },
    {
        id: 'spectral-decay',
        num: 'III',
        title: 'Game Project 3',
        short: 'You ARE the game project 3.',
        tagline: 'project 3 comes third',
        role: 'Systems Designer',
        team: 'Solo',
        engine: 'Godot',
        timeframe: '2023 – 2033',
        tags: ['Systems', 'Narrative', 'Horror', 'Simulation'],
        thumbnail: 'assets/project3-thumb.png',
        links: [],
        content: [
            {
                type: 'text',
                text: 'Description of project 3 here.'
            },
            {
                type: 'image',
                src: 'assets/project3-screenshot1.png',
                caption: 'Main screen',
                size: 'full'
            }
        ],
        icon: '<svg viewBox="0 0 80 80" fill="none"><path d="M20 40Q20 14 40 14Q60 14 60 40L60 58Q56 52 52 58Q48 52 44 58Q40 52 36 58Q32 52 28 58Q24 52 20 58Z" stroke="currentColor" stroke-width="2" fill="none" opacity="0.5"/><circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4"/><circle cx="48" cy="32" r="5" fill="currentColor" opacity="0.4"/><ellipse cx="40" cy="44" rx="4" ry="5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/></svg>'
    }
];