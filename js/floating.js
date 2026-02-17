class FloatingManager {
    constructor(container, isMobile) {
        this.container = container;
        this.isMobile = isMobile;
        this.items = [];
        if (!container) return;
        this.init();
    }

    init() {
        const count = this.isMobile ? Math.floor(CONFIG.floating.count * 0.5) : CONFIG.floating.count;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'floating-code';
            el.textContent = CONFIG.floating.strings[i % CONFIG.floating.strings.length];
            const item = {
                el,
                x: rand(0, innerWidth),
                y: rand(0, innerHeight),
                baseX: 0, baseY: 0,
                speed: rand(0.3, 1.2),
                phase: rand(0, Math.PI * 2),
                driftX: rand(15, 40),
                driftY: rand(10, 25),
                active: false,
                ribbonPushed: false,
                ribbonOffX: 0, ribbonOffY: 0,
                targetRibbonOffX: 0, targetRibbonOffY: 0
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
        const stringNodes = window.__stringNodes || [];
        const stringRadius = 90;
        const stringRepel = 45;

        for (const item of this.items) {
            item.x = item.baseX + Math.sin(time * item.speed + item.phase) * item.driftX;
            item.y = item.baseY + Math.cos(time * item.speed * 0.7 + item.phase) * item.driftY;
            const screenY = item.y - scrollY;

            if (screenY < -100 || screenY > innerHeight + 100) {
                item.el.style.transform = `translate(${item.x}px, ${screenY}px)`;
                if (item.active) { item.active = false; item.el.classList.remove('active'); }
                if (item.ribbonPushed) { item.ribbonPushed = false; item.el.classList.remove('ribbon-pushed'); }
                item.ribbonOffX *= 0.9; item.ribbonOffY *= 0.9;
                continue;
            }

            let offsetX = 0, offsetY = 0, isNear = false;
            if (px > 0) {
                const dx = item.x - px, dy = screenY - py, d = Math.hypot(dx, dy);
                if (d < radius) {
                    isNear = true;
                    const force = Math.pow(1 - d / radius, 2);
                    const angle = Math.atan2(dy, dx);
                    offsetX = Math.cos(angle) * force * repel;
                    offsetY = Math.sin(angle) * force * repel;
                }
            }

            item.targetRibbonOffX = 0; item.targetRibbonOffY = 0;
            for (const node of stringNodes) {
                const dx = item.x - node.x, dy = screenY - node.y, d = Math.hypot(dx, dy);
                if (d < stringRadius && d > 1) {
                    const force = Math.pow(1 - d / stringRadius, 2);
                    const intensity = 0.5 + (node.intensity || 0) * 0.5;
                    const angle = Math.atan2(dy, dx);
                    item.targetRibbonOffX += Math.cos(angle) * force * stringRepel * intensity;
                    item.targetRibbonOffY += Math.sin(angle) * force * stringRepel * intensity;
                }
            }

            item.ribbonOffX = lerp(item.ribbonOffX, item.targetRibbonOffX, 0.12);
            item.ribbonOffY = lerp(item.ribbonOffY, item.targetRibbonOffY, 0.12);

            const ribbonPushMag = Math.hypot(item.ribbonOffX, item.ribbonOffY);
            if ((ribbonPushMag > 3) !== item.ribbonPushed) {
                item.ribbonPushed = ribbonPushMag > 3;
                item.el.classList.toggle('ribbon-pushed', item.ribbonPushed);
            }
            if (isNear !== item.active) {
                item.active = isNear;
                item.el.classList.toggle('active', isNear);
            }

            item.el.style.transform = `translate(${item.x + offsetX + item.ribbonOffX}px, ${screenY + offsetY + item.ribbonOffY}px)`;
        }
    }

    touchNear(tx, ty) {
        for (const item of this.items) {
            const dx = item.x - tx, dy = (item.y - scrollY) - ty, d = Math.hypot(dx, dy);
            if (d < CONFIG.floating.radius * 1.5) {
                item.el.classList.add('active');
                item.el.classList.add('touched');
                setTimeout(() => { item.el.classList.remove('active'); item.el.classList.remove('touched'); }, 600);
            }
        }
    }
}