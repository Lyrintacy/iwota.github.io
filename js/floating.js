/**
 * Floating Code Strings Manager
 * Reacts to both cursor AND canvas string nodes
 */
class FloatingManager {
    constructor(container, isMobile) {
        this.container = container;
        this.isMobile = isMobile;
        this.items = [];

        if (!container) return;
        this.init();
    }

    init() {
        const count = this.isMobile
            ? Math.floor(CONFIG.floating.count * 0.5)
            : CONFIG.floating.count;

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'floating-code';
            el.textContent = CONFIG.floating.strings[i % CONFIG.floating.strings.length];

            const item = {
                el,
                x: rand(0, innerWidth),
                y: rand(0, document.documentElement.scrollHeight),
                baseX: 0,
                baseY: 0,
                speed: rand(0.3, 1.2),
                phase: rand(0, Math.PI * 2),
                driftX: rand(15, 40),
                driftY: rand(10, 25),
                active: false,
                ribbonPushed: false,
                // smooth offsets for ribbon push
                ribbonOffX: 0,
                ribbonOffY: 0,
                targetRibbonOffX: 0,
                targetRibbonOffY: 0
            };
            item.baseX = item.x;
            item.baseY = item.y;

            this.items.push(item);
            this.container.appendChild(el);
        }
    }

    update(px, py, scrollY) {
        if (!this.container) return;

        const radius = CONFIG.floating.radius;
        const repel = CONFIG.floating.repel;
        const time = performance.now() * 0.001;

        // get string node positions from the canvas
        const stringNodes = window.__stringNodes || [];
        const stringRadius = 90;
        const stringRepel = 45;

        for (const item of this.items) {
            // gentle floating
            item.x = item.baseX + Math.sin(time * item.speed + item.phase) * item.driftX;
            item.y = item.baseY + Math.cos(time * item.speed * 0.7 + item.phase) * item.driftY;

            const screenY = item.y - scrollY;

            // skip if off screen
            if (screenY < -100 || screenY > innerHeight + 100) {
                item.el.style.transform = `translate(${item.x}px, ${screenY}px)`;
                if (item.active) {
                    item.active = false;
                    item.el.classList.remove('active');
                }
                if (item.ribbonPushed) {
                    item.ribbonPushed = false;
                    item.el.classList.remove('ribbon-pushed');
                }
                item.ribbonOffX *= 0.9;
                item.ribbonOffY *= 0.9;
                continue;
            }

            // cursor interaction
            let offsetX = 0;
            let offsetY = 0;
            let isNear = false;

            if (px > 0) {
                const dx = item.x - px;
                const dy = screenY - py;
                const d = Math.hypot(dx, dy);

                if (d < radius) {
                    isNear = true;
                    const force = Math.pow(1 - d / radius, 2);
                    const angle = Math.atan2(dy, dx);
                    offsetX = Math.cos(angle) * force * repel;
                    offsetY = Math.sin(angle) * force * repel;
                }
            }

            // string node interaction — strings push floating text
            item.targetRibbonOffX = 0;
            item.targetRibbonOffY = 0;
            let nearRibbon = false;

            for (let n = 0; n < stringNodes.length; n++) {
                const node = stringNodes[n];
                const dx = item.x - node.x;
                const dy = screenY - node.y;
                const d = Math.hypot(dx, dy);

                if (d < stringRadius && d > 1) {
                    nearRibbon = true;
                    const force = Math.pow(1 - d / stringRadius, 2);
                    const intensity = 0.5 + (node.intensity || 0) * 0.5;
                    const angle = Math.atan2(dy, dx);
                    item.targetRibbonOffX += Math.cos(angle) * force * stringRepel * intensity;
                    item.targetRibbonOffY += Math.sin(angle) * force * stringRepel * intensity;
                }
            }

            // smooth ribbon push
            item.ribbonOffX = lerp(item.ribbonOffX, item.targetRibbonOffX, 0.12);
            item.ribbonOffY = lerp(item.ribbonOffY, item.targetRibbonOffY, 0.12);

            // ribbon-pushed visual state
            const ribbonPushMag = Math.hypot(item.ribbonOffX, item.ribbonOffY);
            if (ribbonPushMag > 3 !== item.ribbonPushed) {
                item.ribbonPushed = ribbonPushMag > 3;
                item.el.classList.toggle('ribbon-pushed', item.ribbonPushed);
            }

            // cursor active state
            if (isNear !== item.active) {
                item.active = isNear;
                item.el.classList.toggle('active', isNear);
            }

            const finalX = item.x + offsetX + item.ribbonOffX;
            const finalY = screenY + offsetY + item.ribbonOffY;
            item.el.style.transform = `translate(${finalX}px, ${finalY}px)`;
        }
    }

    touchNear(tx, ty) {
        for (const item of this.items) {
            const dx = item.x - tx;
            const dy = (item.y - scrollY) - ty;
            const d = Math.hypot(dx, dy);

            if (d < CONFIG.floating.radius * 1.5) {
                item.el.classList.add('active');
                item.el.classList.add('touched');
                setTimeout(() => {
                    item.el.classList.remove('active');
                    item.el.classList.remove('touched');
                }, 600);
            }
        }
    }
}