/* ═══════ UTILITIES ═══════ */
function lerp(a,b,t){return a+(b-a)*t}
function clamp(v,lo,hi){return Math.min(Math.max(v,lo),hi)}
function rand(lo,hi){return Math.random()*(hi-lo)+lo}
function randI(lo,hi){return Math.floor(rand(lo,hi+1))}
function smoothstep(t){return t*t*(3-2*t)}
function isTouch(){return 'ontouchstart' in window||navigator.maxTouchPoints>0}

/* ═══════ MAIN APP ═══════ */
class App{
    constructor(){
        this.floatBox=document.getElementById('floatingStrings');
        this.glow=document.getElementById('cursorGlow');
        this.progressBar=document.getElementById('scrollProgress');
        this.menuBtn=document.getElementById('mobileMenuBtn');
        this.mobileNav=document.getElementById('mobileNav');
        this.navbar=document.getElementById('navbar');
        this.landWrap=document.getElementById('landscapeWrap');
        this.stringWrap=document.getElementById('stringLayers');
        this.undergroundOverlay=document.getElementById('undergroundOverlay');
        this.px=-1000;this.py=-1000;
        this.scrollY=0;this.scrollPct=0;
        this.running=true;this.mobile=isTouch();
        this.time=0;this.lastTime=performance.now();
        this.init();
    }
    
    init(){
        this.basement=new BasementManager();
        this.ribbonCanvasEl=document.createElement('canvas');
        this.ribbonCanvasEl.style.cssText='position:fixed;inset:0;z-index:1;pointer-events:none;width:100%;height:100%';
        document.body.appendChild(this.ribbonCanvasEl);
        this.ribbons=new RibbonCanvas(this.ribbonCanvasEl,this.mobile);
        this.floats=new FloatingManager(this.floatBox,this.mobile);
        this.landscape=new Landscape(this.landWrap);
        this.woven=new WovenStrings(this.stringWrap,this.landscape.N);
        this.clouds=new Clouds();
        this.darkClouds=new DarkClouds();
        this.sky=new SkyController();
        this.mascots=new MascotController();
        this.dust=new DustParticles();
        this.events();
        this.onScroll();
        this.loop();
    }

    events(){
        var self=this;
        if(this.mobile){
            document.addEventListener('touchstart',function(e){self.onTouch(e)},{passive:true});
            document.addEventListener('touchmove',function(e){self.onTouch(e)},{passive:true});
            document.addEventListener('touchend',function(){self.offPointer()});
        }else{
            document.addEventListener('mousemove',function(e){self.setPointer(e.clientX,e.clientY)});
            document.addEventListener('mouseleave',function(){self.offPointer()});
        }
        window.addEventListener('scroll',function(){self.onScroll()},{passive:true});
        document.addEventListener('visibilitychange',function(){
            self.running=!document.hidden;
            if(self.running){self.lastTime=performance.now();self.loop()}
        });
        if(this.menuBtn){
            this.menuBtn.addEventListener('click',function(){
                self.menuBtn.classList.toggle('active');
                self.mobileNav.classList.toggle('active');
            });
        }
        var mnavLinks=document.querySelectorAll('.mnav a');
        for(var i=0;i<mnavLinks.length;i++){
            mnavLinks[i].addEventListener('click',function(){
                self.menuBtn.classList.remove('active');
                self.mobileNav.classList.remove('active');
            });
        }
        var hashLinks=document.querySelectorAll('a[href^="#"]');
        for(var i=0;i<hashLinks.length;i++){
            (function(a){
                a.addEventListener('click',function(e){
                    var href=a.getAttribute('href');
                    if(href==='#')return;
                    e.preventDefault();
                    var t=document.querySelector(href);
                    if(t)t.scrollIntoView({behavior:'smooth'});
                });
            })(hashLinks[i]);
        }
        this.formSetup();
    }

    setPointer(x,y){
        this.px=x;this.py=y;
        if(this.ribbons&&!this.mobile)this.ribbons.updatePointer(x,y);
        if(this.glow&&!this.mobile){
            this.glow.style.left=x+'px';
            this.glow.style.top=y+'px';
            this.glow.classList.add('visible');
        }
    }

    onTouch(e){
        var t=e.touches[0];
        if(t&&this.floats)this.floats.touchNear(t.clientX,t.clientY);
    }

    offPointer(){
        var self=this;
        setTimeout(function(){
            self.px=-1000;self.py=-1000;
            if(self.ribbons&&!self.mobile)self.ribbons.updatePointer(-1000,-1000);
            if(self.glow)self.glow.classList.remove('visible');
        },200);
    }

    onScroll(){
        this.scrollY=scrollY;
        var max=document.documentElement.scrollHeight-innerHeight;
        this.scrollPct=max>0?clamp(scrollY/max,0,1):0;
        if(this.progressBar)this.progressBar.style.width=(this.scrollPct*100)+'%';
        if(this.navbar)this.navbar.classList.toggle('at-top',scrollY<50);
        if(this.ribbons)this.ribbons.updateScroll(this.scrollPct);
        this.landscape.update(this.scrollPct);
        this.sky.update(this.scrollPct);
        var undergroundAlpha=smoothstep(clamp((this.scrollPct-0.42)/0.2,0,1));
        if(this.undergroundOverlay)this.undergroundOverlay.style.opacity=undergroundAlpha;
    }

    formSetup(){
        var form=document.getElementById('contactForm');
        if(!form)return;
        form.addEventListener('submit',function(){
            var btn=form.querySelector('.btn'),txt=btn.textContent;
            btn.textContent='Sending…';btn.disabled=true;
            setTimeout(function(){btn.textContent=txt;btn.disabled=false},5000);
        });
    }

    loop(){
        if(!this.running)return;
        var now=performance.now();
        var dt=Math.min((now-this.lastTime)/1000,0.1);
        this.lastTime=now;
        this.time+=dt;
        if(this.ribbons){
            var ribbonFade=1-smoothstep(clamp((this.scrollPct-0.5)/0.15,0,1));
            this.ribbonCanvasEl.style.opacity=ribbonFade;
            if(ribbonFade>0.01)this.ribbons.animate();
        }
        if(this.woven)this.woven.update(dt,this.scrollPct);
        if(this.clouds)this.clouds.update(this.scrollPct,this.time);
        if(this.darkClouds)this.darkClouds.update(this.scrollPct,this.time);
        if(this.mascots)this.mascots.update(this.scrollPct,this.time);
        if(this.dust)this.dust.update(this.time,this.scrollPct);
        if(this.floats)this.floats.update(this.px,this.py,this.scrollY);
        var self=this;
        requestAnimationFrame(function(){self.loop()});
    }
}

/* ═══════ BASEMENT MANAGER ═══════ */
class BasementManager{
    constructor(){
        this.buildCards();
        this.buildReferences();
        this.buildBasementProjects();
        this.bindEvents();
    }

    getEngineIcon(name){
        var icons={'Unity':'<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.4 0L1.6 5.2v10.4L4 17l4-2.3V9.5L12 7l4 2.5v5.2l4 2.3 2.4-1.4V5.2L13.6 0h-3.2zM12 9.5L8 12l4 2.5 4-2.5-4-2.5zM4 17l4-2.3 4 2.5 4-2.5 4 2.3-6.4 3.7h-3.2L4 17z"/></svg>','Godot':'<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm-3 6.5a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4zM8.5 15c0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5h-7z"/></svg>','Unreal Engine':'<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm-1 5v6l-3-1.5V14l4 2 4-2v-2.5L13 13V7h-2z"/></svg>'};
        return icons[name]||'';
    }

    getLinkIcon(type){
        var icons={'itch':'<svg width="14" height="14" viewBox="0 0 245 220" fill="currentColor"><path d="M31.99 1.365C21.287 7.72.2 31.945 0 38.298v10.516C0 62.144 12.46 73.86 23.773 73.86c13.584 0 24.902-11.258 24.903-24.62 0 13.362 10.93 24.62 24.515 24.62 13.586 0 24.165-11.258 24.165-24.62 0 13.362 11.622 24.62 25.207 24.62h.246c13.586 0 25.208-11.258 25.208-24.62 0 13.362 10.58 24.62 24.164 24.62 13.585 0 24.515-11.258 24.515-24.62 0 13.362 11.32 24.62 24.903 24.62 11.313 0 23.773-11.714 23.773-25.046V38.298c-.2-6.354-21.287-30.58-31.988-36.933C180.118.197 125.943 0 122.686 0c-3.256 0-57.43.197-90.696 1.365z"/></svg>','github':'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>','link':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>'};
        return icons[type]||icons['link'];
    }

    renderContentBlock(block){
        if(!block||!block.type)return'';
        switch(block.type){
            case 'text':return'<p class="bp-text">'+(block.text||'')+'</p>';
            case 'heading':return'<h4 class="bp-heading">'+(block.text||'')+'</h4>';
            case 'image':var sz=block.size==='small'?'bp-img-small':block.size==='medium'?'bp-img-medium':'bp-img-full';return'<figure class="bp-figure '+sz+'"><img src="'+(block.src||'')+'" alt="'+(block.caption||'')+'" class="bp-img" onerror="this.parentElement.style.display=\'none\'">'+(block.caption?'<figcaption class="bp-caption">'+block.caption+'</figcaption>':'')+'</figure>';
            case 'gallery':if(!block.images||!block.images.length)return'';var h='<div class="bp-gallery">';for(var i=0;i<block.images.length;i++){var img=block.images[i];h+='<figure class="bp-gallery-item"><img src="'+(img.src||'')+'" alt="'+(img.caption||'')+'" class="bp-gallery-img" onerror="this.parentElement.style.display=\'none\'">'+(img.caption?'<figcaption class="bp-caption">'+img.caption+'</figcaption>':'')+'</figure>';}return h+'</div>';
            case 'columns':return'<div class="bp-columns"><div class="bp-col">'+(block.left?this.renderContentBlock(block.left):'')+'</div><div class="bp-col">'+(block.right?this.renderContentBlock(block.right):'')+'</div></div>';
            case 'quote':return'<blockquote class="bp-quote"><p>"'+(block.text||'')+'"</p>'+(block.author?'<cite>— '+block.author+'</cite>':'')+'</blockquote>';
            case 'video':return'<div class="bp-video"><iframe src="'+(block.src||'')+'" frameborder="0" allowfullscreen></iframe></div>';
            // Add these cases to your existing renderContentBlock switch:
case 'divider':
    return '<div class="ed-divider" style="' + (block.styles||'width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;') + '"></div>';

case 'link':
    return '<div class="ed-link-block" style="margin:16px 0;">'+
        '<a href="' + (block.href||'#') + '" target="_blank" rel="noopener" class="' + (block.className||'btn') + '">' +
        (block.text||'Link') + '</a></div>';
            default:return'';
        }
    }

    buildCards(){
        var grid=document.getElementById('projectGrid');if(!grid)return;
        for(var idx=0;idx<PROJECTS.length;idx++){
            var p=PROJECTS[idx],card=document.createElement('article');
            card.className='pcard';card.setAttribute('data-project-id',p.id);
            var thumbHTML=p.thumbnail?'<img src="'+p.thumbnail+'" alt="'+p.title+'" class="pcard-thumb-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="width:100%;height:100%;display:none;align-items:center;justify-content:center;color:var(--pri);opacity:.3">'+p.icon+'</div>':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.3">'+p.icon+'</div>';
            var engineHTML='<span class="engine-icon">'+this.getEngineIcon(p.engine)+' '+p.engine+'</span>';
            card.innerHTML='<div class="pcard-thumb">'+thumbHTML+'</div><div class="pcard-body"><div class="pcard-num">'+p.num+'</div><h3>'+p.title+'</h3><p class="pcard-short">'+p.short+'</p></div><div class="pcard-meta-expand"><div class="pm-row"><span class="pm-label">Role</span><span class="pm-value">'+p.role+'</span></div><div class="pm-row"><span class="pm-label">Team</span><span class="pm-value">'+p.team+'</span></div><div class="pm-row"><span class="pm-label">Engine</span><span class="pm-value">'+engineHTML+'</span></div><div class="pm-row"><span class="pm-label">Timeline</span><span class="pm-value">'+p.timeframe+'</span></div><a href="#bp-'+p.id+'" class="pcard-go">'+TEXTS.games.cardGoLabel+'</a></div><div class="pcard-tooltip"><div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Engine</span>'+engineHTML+'</div><div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Role</span>'+p.role+'</div><div class="pcard-tooltip-row"><span class="pcard-tooltip-label">Team</span>'+p.team+'</div></div>';
            grid.appendChild(card);
        }
    }

    buildReferences(){
        var list=document.getElementById('refList');if(!list)return;
        for(var i=0;i<REFERENCES.length;i++){
            var r=REFERENCES[i],card=document.createElement('a');
            card.href=r.link;card.target='_blank';card.rel='noopener noreferrer';card.className='rcard';
            card.innerHTML='<img src="'+r.img+'" alt="'+r.name+'" onerror="this.src=\''+r.fallback+'\'"><div><h3>'+r.name+'</h3><p class="rcard-role">'+r.role+'</p><p>'+r.desc+'</p>'+(r.quote?'<p class="rcard-quote">'+r.quote+'</p>':'')+'<span class="rcard-link">'+r.linkLabel+'</span></div>';
            list.appendChild(card);
        }
    }

   buildBasementProjects(){
    var container=document.getElementById('basementProjects');
    if(!container)return;
    var self=this;
    
    for(var i=0;i<PROJECTS.length;i++){
        var p=PROJECTS[i];
        var block=document.createElement('div');
        block.className='bproject';
        block.id = 'bp-' + p.id;
    block.setAttribute('data-project-id', p.id);
        
        // Thumbnail
        var thumb=p.thumbnail
            ?'<img src="'+p.thumbnail+'" class="bproject-thumb-img" alt="'+p.title+'" onerror="this.style.display=\'none\'">'
            :'<div class="bproject-thumb-fallback">'+p.icon+'</div>';
        
        // Tags
        var tags='';
        if(p.tags)for(var t=0;t<p.tags.length;t++)tags+='<span>'+p.tags[t]+'</span>';
        
        // Content
        var content='';
        if(p.content&&p.content.length){
            for(var c=0;c<p.content.length;c++)content+=self.renderContentBlock(p.content[c]);
        }else if(p.paragraphs){
            for(var c=0;c<p.paragraphs.length;c++)content+='<p>'+p.paragraphs[c]+'</p>';
        }
        
        // Links inside content
        if(p.links&&p.links.length){
            content+='<div class="bp-links">';
            for(var l=0;l<p.links.length;l++){
                var lnk=p.links[l];
                content+='<a href="'+lnk.url+'" target="_blank" rel="noopener" class="bp-link">'+self.getLinkIcon(lnk.icon||'link')+' '+lnk.label+'</a>';
            }
            content+='</div>';
        }
        
        // Build HTML
        block.innerHTML=
            // Header
            '<div class="bproject-header">'+
                '<div class="bproject-header-inner">'+
                    '<div class="bproject-thumb">'+thumb+'</div>'+
                    '<div class="bproject-header-text">'+
                        '<h3>'+p.title+'</h3>'+
                        '<p class="bproject-tagline">'+(p.tagline||'')+'</p>'+
                    '</div>'+
                '</div>'+
            '</div>'+
            
            // Meta
            '<div class="bproject-meta">'+
                '<div><span class="bm-label">Role</span><span class="bm-value">'+(p.role||'—')+'</span></div>'+
                '<div><span class="bm-label">Team</span><span class="bm-value">'+(p.team||'—')+'</span></div>'+
                '<div><span class="bm-label">Engine</span><span class="bm-value">'+self.getEngineIcon(p.engine||'')+' '+(p.engine||'—')+'</span></div>'+
                '<div><span class="bm-label">Timeline</span><span class="bm-value">'+(p.timeframe||'—')+'</span></div>'+
            '</div>'+
            
            // Content
            '<div class="bproject-content">'+content+'</div>'+
            
            // Continue Reading
            '<div class="bproject-read-more">'+
                '<button class="btn-continue">'+
                    (TEXTS.basement.expandLabel||'Continue Reading')+' '+
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'+
                '</button>'+
            '</div>'+
            
            // Collapse
            '<div class="bproject-collapse">'+
                '<button class="btn-collapse">'+
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'+
                    ' '+(TEXTS.basement.collapseLabel||'Collapse')+
                '</button>'+
            '</div>'+
            
            // Tags
            '<div class="bproject-tags">'+tags+'</div>'+
            
            // Stickers
            '<div class="bproject-stickers"></div>';
        
        container.appendChild(block);
    }
}

    bindEvents(){
        var self=this;
        var cards=document.querySelectorAll('.pcard');
        for(var i=0;i<cards.length;i++){(function(card){card.addEventListener('click',function(e){if(e.target.closest('.pcard-go'))return;if(isTouch())card.classList.toggle('touch-open')})})(cards[i])}
        var headers=document.querySelectorAll('.bproject-header');
        for(var i=0;i<headers.length;i++){(function(header){header.addEventListener('click',function(e){e.preventDefault();var targetId=header.getAttribute('data-target');var target=document.getElementById(targetId);if(target){if(!target.classList.contains('expanded')){target.classList.add('expanded');var btn=target.querySelector('.bproject-toggle span');if(btn)btn.textContent=TEXTS.basement.collapseLabel}setTimeout(function(){target.scrollIntoView({behavior:'smooth',block:'start'})},100)}})})(headers[i])}
        var toggles=document.querySelectorAll('.bproject-toggle');
        for(var i=0;i<toggles.length;i++){(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();var project=btn.closest('.bproject');var isExpanded=project.classList.toggle('expanded');btn.querySelector('span').textContent=isExpanded?TEXTS.basement.collapseLabel:TEXTS.basement.expandLabel})})(toggles[i])}
        this.checkDeepLink();
        window.addEventListener('hashchange',this.checkDeepLink.bind(this));
    }

    checkDeepLink(){
        var hash=location.hash;if(!hash||hash.indexOf('#bp-')!==0)return;
        var target=document.getElementById(hash.substring(1));
        if(target&&target.classList.contains('bproject')){target.classList.add('expanded');var btn=target.querySelector('.bproject-toggle span');if(btn)btn.textContent=TEXTS.basement.collapseLabel;setTimeout(function(){target.scrollIntoView({behavior:'smooth',block:'start'})},300)}
    }
}

/* ═══════ DARK CLOUDS — NO BLUR, IMPROVED SHAPES ═══════ */
class DarkClouds{
    constructor(){
        this.container = document.getElementById('darkClouds') || (() => {
            const d = document.createElement('div');
            d.id = 'darkClouds'; d.className = 'dark-clouds';
            document.body.prepend(d);
            return d;
        })();
        this.container.innerHTML = '';
        this.clouds = [];

        this.layers = [
            {count:9,  size:[180,320], grey:0,   opacity:1.00, yOffset:-28, sizeMul:1.00, speed:0.68, drift:95,  scrollMul:4.2},
            {count:11, size:[140,240], grey:0,   opacity:0.82, yOffset:8,   sizeMul:0.78, speed:0.52, drift:78,  scrollMul:3.1},
            {count:13, size:[105,185], grey:12,  opacity:0.64, yOffset:18,  sizeMul:0.62, speed:0.40, drift:62,  scrollMul:2.2},
            {count:15, size:[78, 138], grey:28,  opacity:0.46, yOffset:28,  sizeMul:0.48, speed:0.29, drift:48,  scrollMul:1.4},
            {count:17, size:[55, 100], grey:45,  opacity:0.31, yOffset:36,  sizeMul:0.36, speed:0.20, drift:35,  scrollMul:0.8},
            {count:20, size:[38, 68],  grey:65,  opacity:0.18, yOffset:44,  sizeMul:0.25, speed:0.13, drift:25,  scrollMul:0.4}
        ];

        this.generateClouds();
    }

    generateClouds(){
        const NS = 'http://www.w3.org/2000/svg';

        for(let li = 0; li < this.layers.length; li++){
            const l = this.layers[li];

            for(let i = 0; i < l.count; i++){
                const baseW = rand(l.size[0], l.size[1]);
                const w = baseW * l.sizeMul;
                const h = w * rand(0.35, 0.46);
                const x = rand(-40, 120);
                const y = li === 0 ? -28 + rand(-15, 10) : l.yOffset + rand(-10, 12);

                const svg = document.createElementNS(NS, 'svg');
                const pad = 45;
                svg.setAttribute('viewBox', `${-pad} ${-pad} ${w+pad*2} ${h+pad*2}`);
                svg.style.cssText = `
                    position:absolute;
                    width:${w+pad*2}px;
                    height:${h+pad*2}px;
                    left:${x}%;
                    top:${y}%;
                    pointer-events:none;
                    overflow:visible;
                    opacity:${l.opacity};
                `;

                const fill = l.grey === 0 ? '#000000' : `rgb(${l.grey},${l.grey},${l.grey})`;

                const cx = w / 2;
                const cy = h / 2;

                // Main body — dense core
                const coreBlobs = li === 0 ? randI(16, 22) : randI(10, 16);
                for(let b = 0; b < coreBlobs; b++){
                    const angle = rand(0, Math.PI * 2);
                    const dist = rand(0, w * 0.32);
                    const bx = cx + Math.cos(angle) * dist;
                    const by = cy + Math.sin(angle) * dist * 0.6;
                    const br = rand(w * 0.18, w * 0.38);

                    const circle = document.createElementNS(NS, 'circle');
                    circle.setAttribute('cx', bx);
                    circle.setAttribute('cy', by);
                    circle.setAttribute('r', br);
                    circle.setAttribute('fill', fill);
                    svg.appendChild(circle);
                }

                // Top puffs — bumpy silhouette
                const topPuffs = randI(5, 9);
                for(let t = 0; t < topPuffs; t++){
                    const spread = (t / topPuffs - 0.5) * w * 0.85;
                    const bx = cx + spread + rand(-w * 0.08, w * 0.08);
                    const by = cy - h * rand(0.25, 0.5);
                    const br = rand(w * 0.1, w * 0.22);

                    const circle = document.createElementNS(NS, 'circle');
                    circle.setAttribute('cx', bx);
                    circle.setAttribute('cy', by);
                    circle.setAttribute('r', br);
                    circle.setAttribute('fill', fill);
                    svg.appendChild(circle);
                }

                // Flat bottom
                const bottomRect = document.createElementNS(NS, 'rect');
                bottomRect.setAttribute('x', cx - w * 0.4);
                bottomRect.setAttribute('y', cy);
                bottomRect.setAttribute('width', w * 0.8);
                bottomRect.setAttribute('height', h * 0.35);
                bottomRect.setAttribute('rx', h * 0.08);
                bottomRect.setAttribute('fill', fill);
                svg.appendChild(bottomRect);

                // Side wisps
                const wisps = randI(3, 6);
                for(let s = 0; s < wisps; s++){
                    const side = Math.random() < 0.5 ? -1 : 1;
                    const bx = cx + side * w * rand(0.35, 0.5);
                    const by = cy + rand(-h * 0.15, h * 0.2);
                    const br = rand(w * 0.06, w * 0.14);

                    const circle = document.createElementNS(NS, 'circle');
                    circle.setAttribute('cx', bx);
                    circle.setAttribute('cy', by);
                    circle.setAttribute('r', br);
                    circle.setAttribute('fill', fill);
                    svg.appendChild(circle);
                }

                this.container.appendChild(svg);

                this.clouds.push({
                    el: svg,
                    baseY: y,
                    speed: l.speed,
                    drift: l.drift,
                    phase: rand(0, Math.PI * 2),
                    scrollMul: l.scrollMul,
                    layerIndex: li
                });
            }
        }
    }

    update(scrollPct, time){
        const fadeOut = 1 - smoothstep(clamp(scrollPct * 3.6, 0, 1));
        const globalUp = Math.sin(time * 0.07) * 16;

        for(const c of this.clouds){
            const wind = Math.sin(time * c.speed + c.phase) * c.drift;
            const parallaxX = scrollPct * 210 * c.scrollMul;
            const bob = Math.sin(time * 0.85 + c.phase) * (6 - c.layerIndex);
            const yOffset = globalUp + bob;

            c.el.style.transform = `translate(${wind + parallaxX}px, ${yOffset}px)`;
            c.el.style.opacity = fadeOut * this.layers[c.layerIndex].opacity;
        }
    }
}

/* ═══════ DUST PARTICLES — PERFORMANCE OPTIMIZED WITH BLUR SPRITES ═══════ */
class DustParticles {
    constructor() {
        this.layerConfigs = [
            {
                z: 9999, baseCount: 6, size: [28, 55],
                driftX: [0.06, 0.18], driftY: [0.03, 0.10],
                blur: [42, 72], baseOpacity: 0.7,
                color: 'rgba(175,160,215,1)', edge: true, countMultiplier: 0.5
            },
            {
                z: 53, id: 'dustCanvasFront', baseCount: 22, size: [10, 24],
                driftX: [0.10, 0.28], driftY: [0.05, 0.14],
                blur: [24, 42], baseOpacity: 0.58,
                color: 'rgba(155,140,205,1)', edge: true, countMultiplier: 0.65
            },
            {
                z: 52, id: 'dustCanvasMid', baseCount: 70, size: [3, 9],
                driftX: [0.14, 0.45], driftY: [0.08, 0.24],
                blur: [8, 18], baseOpacity: 0.42,
                color: 'rgba(125,115,175,1)', countMultiplier: 0.9
            },
            {
                z: 51, id: 'dustCanvasBack', baseCount: 150, size: [0.5, 3],
                driftX: [0.20, 0.65], driftY: [0.12, 0.38],
                blur: [1, 5], baseOpacity: 0.24,
                color: 'rgba(100,90,150,1)', countMultiplier: 1.2
            }
        ];

        this.layers = [];
        this.ctxs = [];
        this.particles = [];
        this.lastWidth = 0;
        this.frameSkip = 0;
        this.spriteCache = new Map();

        this.buildLayers();
        this.resize();
        window.addEventListener('resize', () => this.onResize());
    }

    /* ── Sprite factory: blur once, reuse forever ── */
    createSprite(radius, blur, color) {
        // Quantize to maximise cache hits
        const rQ = Math.round(radius * 2) / 2;
        const bQ = Math.round(blur);
        const key = `${rQ}_${bQ}_${color}`;

        let sprite = this.spriteCache.get(key);
        if (sprite) return sprite;

        // Padding = 3σ captures 99.7 % of the Gaussian energy
        const pad = bQ * 3 + 2;
        const dim = Math.ceil((rQ + pad) * 2);

        const c = document.createElement('canvas');
        c.width = c.height = dim;
        const ctx = c.getContext('2d');
        ctx.filter = `blur(${bQ}px)`;          // ← applied ONCE
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dim / 2, dim / 2, rQ, 0, Math.PI * 2);
        ctx.fill();

        sprite = { canvas: c, offset: dim / 2 };
        this.spriteCache.set(key, sprite);
        return sprite;
    }

    /* ── helpers (unchanged) ── */
    getCount(config) {
        const scale = clamp(innerWidth / 1920, 0.2, 1.5);
        return Math.max(2, Math.round(config.baseCount * scale * config.countMultiplier));
    }

    getOrCreate(id, z) {
        let c = document.getElementById(id);
        if (!c) {
            c = document.createElement('canvas');
            c.id = id;
            c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:${z};pointer-events:none;`;
            document.body.appendChild(c);
        }
        return c;
    }

    createCanvas(z) {
        const c = document.createElement('canvas');
        c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:${z};pointer-events:none;`;
        document.body.appendChild(c);
        return c;
    }

    /* ── build / rebuild ── */
    buildLayers() {
        for (const l of this.layers) {
            if (l.c && !l.c.id) l.c.remove();
        }

        this.layers = [];
        this.ctxs = [];
        this.particles = [];
        this.spriteCache.clear();

        for (const config of this.layerConfigs) {
            const c = config.id
                ? this.getOrCreate(config.id, config.z)
                : this.createCanvas(config.z);

            const count = this.getCount(config);

            const layer = {
                c, count,
                size: config.size, driftX: config.driftX, driftY: config.driftY,
                blur: config.blur, baseOpacity: config.baseOpacity,
                color: config.color, edge: config.edge || false
            };

            this.layers.push(layer);
            this.ctxs.push(c.getContext('2d'));

            const ps = [];
            for (let i = 0; i < count; i++) ps.push(this.make(layer));
            this.particles.push(ps);
        }

        this.lastWidth = innerWidth;
    }

    make(l) {
        let x, y;

        if (l.edge) {
            const zone = Math.random();
            if (zone < 0.3)      { x = rand(0, 0.18); y = rand(0, 1); }
            else if (zone < 0.6) { x = rand(0.82, 1); y = rand(0, 1); }
            else if (zone < 0.8) { x = rand(0, 1); y = rand(0, 0.2); }
            else                 { x = rand(0, 1); y = rand(0.8, 1); }
        } else {
            x = rand(0, 1); y = rand(0, 1);
            if (Math.random() < 0.4) {
                x = x < 0.5 ? x * 0.5 : 1 - (1 - x) * 0.5;
            }
        }

        const r    = rand(l.size[0], l.size[1]);
        const blur = rand(l.blur[0], l.blur[1]);
        const pOp  = rand(0.45, 1.0);

        return {
            nx: x, ny: y,
            homeX: x, homeY: y, r,
            orbitSpeedX:  rand(l.driftX[0], l.driftX[1]) * (Math.random() < 0.5 ? 1 : -1),
            orbitSpeedY:  rand(l.driftY[0], l.driftY[1]) * (Math.random() < 0.5 ? 1 : -1),
            orbitRadiusX: rand(0.02, 0.08),
            orbitRadiusY: rand(0.015, 0.06),
            phaseX: rand(0, Math.PI * 2),
            phaseY: rand(0, Math.PI * 2),
            blur,
            particleOpacity: pOp,
            baseAlpha: pOp * l.baseOpacity,   // pre-multiply (constant part)
            pulseSpeed: rand(0.15, 0.5),
            pulsePhase: rand(0, Math.PI * 2),
            sprite: this.createSprite(r, blur, l.color)   // ← cached sprite
        };
    }

    resize() {
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        this.layers.forEach((l, i) => {
            if (!l.c) return;
            l.c.width  = innerWidth  * dpr;
            l.c.height = innerHeight * dpr;
            if (this.ctxs[i]) this.ctxs[i].setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    }

    onResize() {
        const widthChange = Math.abs(innerWidth - this.lastWidth) / this.lastWidth;
        if (widthChange > 0.25) this.buildLayers();
        this.resize();
    }

    /* ── render loop ── */
    update(time, scrollPct) {
        const show = smoothstep(clamp((scrollPct - 0.45) / 0.15, 0, 1));

        if (show < 0.3) {
            this.frameSkip++;
            if (this.frameSkip % 2 !== 0) return;
        }

        const W = innerWidth;
        const H = innerHeight;

        for (let li = 0; li < this.layers.length; li++) {
            const l   = this.layers[li];
            const ctx = this.ctxs[li];
            const ps  = this.particles[li];
            if (!ctx || !ps) continue;

            l.c.style.opacity = show;
            if (show < 0.02) continue;

            ctx.clearRect(0, 0, W, H);

            const skipRate    = li === 3 ? 3 : li === 2 ? 2 : 1;
            const shouldMove  = this.frameSkip % skipRate === 0;

            for (let i = 0; i < ps.length; i++) {
                const p = ps[i];

                if (shouldMove) {
                    p.nx = p.homeX + Math.sin(time * p.orbitSpeedX + p.phaseX) * p.orbitRadiusX;
                    p.ny = p.homeY + Math.sin(time * p.orbitSpeedY + p.phaseY) * p.orbitRadiusY;
                    if (p.nx < -0.05) p.nx += 1.1;
                    if (p.nx >  1.05) p.nx -= 1.1;
                    if (p.ny < -0.05) p.ny += 1.1;
                    if (p.ny >  1.05) p.ny -= 1.1;
                }

                const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.15 + 0.88;

                ctx.globalAlpha = p.baseAlpha * pulse;
                ctx.drawImage(
                    p.sprite.canvas,
                    p.nx * W - p.sprite.offset,
                    p.ny * H - p.sprite.offset
                );
            }
        }
    }
}
/* ═══════ INIT ═══════ */
document.addEventListener('DOMContentLoaded',function(){new App()});

// Continue Reading / Collapse functionality
document.addEventListener('click', function(e) {
    // Continue Reading button
    if (e.target.closest('.btn-continue')) {
        e.preventDefault();
        var card = e.target.closest('.bproject');
        if (card) {
            // Close any other expanded projects first (optional)
            var others = document.querySelectorAll('.bproject.expanded');
            for (var i = 0; i < others.length; i++) {
                if (others[i] !== card) others[i].classList.remove('expanded');
            }
            
            card.classList.add('expanded');
            
            // Smooth scroll to keep card header in view
            setTimeout(function() {
                var headerRect = card.getBoundingClientRect();
                if (headerRect.top < 80) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }
    
    // Collapse button
    if (e.target.closest('.btn-collapse')) {
        e.preventDefault();
        var card = e.target.closest('.bproject');
        if (card) {
            card.classList.remove('expanded');
            
            // Scroll back to card
            setTimeout(function() {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }
});