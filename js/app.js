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
        var container=document.getElementById('basementProjects');if(!container)return;
        for(var idx=0;idx<PROJECTS.length;idx++){
            var p=PROJECTS[idx],block=document.createElement('div');
            block.className='bproject';block.id='bp-'+p.id;
            var thumbHTML=p.thumbnail?'<img src="'+p.thumbnail+'" alt="'+p.title+'" class="bproject-thumb-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="width:100%;height:100%;display:none;align-items:center;justify-content:center;color:var(--pri);opacity:.4">'+p.icon+'</div>':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--pri);opacity:.4">'+p.icon+'</div>';
            var tagsHTML='';if(p.tags)for(var t=0;t<p.tags.length;t++)tagsHTML+='<span>'+p.tags[t]+'</span>';
            var engineHTML='<span class="engine-icon">'+this.getEngineIcon(p.engine||'')+' '+(p.engine||'')+'</span>';
            var linksHTML='';if(p.links&&p.links.length){linksHTML='<div class="bp-links">';for(var l=0;l<p.links.length;l++){var lnk=p.links[l];linksHTML+='<a href="'+lnk.url+'" target="_blank" rel="noopener" class="bp-link">'+this.getLinkIcon(lnk.icon||'link')+' '+lnk.label+'</a>';}linksHTML+='</div>';}
            var contentHTML='';if(p.content&&p.content.length)for(var c=0;c<p.content.length;c++)contentHTML+=this.renderContentBlock(p.content[c]);else if(p.paragraphs)for(var c=0;c<p.paragraphs.length;c++)contentHTML+='<p class="bp-text">'+p.paragraphs[c]+'</p>';
            block.innerHTML='<div class="bproject-header" data-target="bp-'+p.id+'"><div class="bproject-header-inner"><div class="bproject-thumb">'+thumbHTML+'</div><div class="bproject-header-text"><h3>'+p.title+'</h3><p class="bproject-tagline">'+(p.tagline||'')+'</p></div></div></div><div class="bproject-meta"><div><span class="bm-label">Role</span><span class="bm-value">'+(p.role||'')+'</span></div><div><span class="bm-label">Team</span><span class="bm-value">'+(p.team||'')+'</span></div><div><span class="bm-label">Engine</span><span class="bm-value">'+engineHTML+'</span></div><div><span class="bm-label">Timeline</span><span class="bm-value">'+(p.timeframe||'')+'</span></div></div><div class="bproject-tags">'+tagsHTML+'</div>'+linksHTML+'<div class="bproject-content">'+contentHTML+'</div><button class="bproject-toggle"><span>'+TEXTS.basement.expandLabel+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>';
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

/* ═══════ DARK CLOUDS (Behind content, puffy shapes, black→grey) ═══════ */
class DarkClouds{
    constructor(){
        this.container=document.getElementById('darkClouds');
        if(!this.container){
            this.container=document.createElement('div');
            this.container.id='darkClouds';
            this.container.className='dark-clouds';
            var sky=document.getElementById('sky');
            if(sky)sky.parentNode.insertBefore(this.container,sky.nextSibling);
            else document.body.insertBefore(this.container,document.body.firstChild);
        }
        this.container.innerHTML='';
        this.clouds=[];
        
        // 6 layers: front (black, top) → back (pale grey, lower)
        this.layers=[
            {count:3,yBase:-10,size:[250,400],grey:8,zIndex:6,hSpeed:[0.12,0.25],hDrift:[50,90],vSpeed:[0.06,0.12],vDrift:[10,25]},
            {count:4,yBase:-5,size:[200,320],grey:25,zIndex:5,hSpeed:[0.1,0.2],hDrift:[40,70],vSpeed:[0.05,0.1],vDrift:[8,18]},
            {count:5,yBase:0,size:[160,260],grey:50,zIndex:4,hSpeed:[0.08,0.16],hDrift:[30,55],vSpeed:[0.04,0.08],vDrift:[6,14]},
            {count:6,yBase:6,size:[120,200],grey:80,zIndex:3,hSpeed:[0.06,0.12],hDrift:[22,40],vSpeed:[0.03,0.06],vDrift:[5,10]},
            {count:7,yBase:12,size:[90,160],grey:120,zIndex:2,hSpeed:[0.04,0.09],hDrift:[15,30],vSpeed:[0.02,0.05],vDrift:[4,8]},
            {count:8,yBase:20,size:[60,120],grey:170,zIndex:1,hSpeed:[0.03,0.06],hDrift:[10,20],vSpeed:[0.015,0.03],vDrift:[3,6]}
        ];
        
        this.generateClouds();
    }
    
    generateClouds(){
        var NS='http://www.w3.org/2000/svg';
        
        for(var li=0;li<this.layers.length;li++){
            var layer=this.layers[li];
            
            for(var i=0;i<layer.count;i++){
                var w=rand(layer.size[0],layer.size[1]);
                var h=w*rand(0.35,0.5);
                var x=rand(-15,100);
                var y=layer.yBase+rand(-5,5);
                
                // Create SVG with extra padding for puffy shape
                var svg=document.createElementNS(NS,'svg');
                var padding=40;
                svg.setAttribute('viewBox',(-padding)+' '+(-padding)+' '+(w+padding*2)+' '+(h+padding*2));
                svg.style.cssText='position:absolute;width:'+(w+padding*2)+'px;height:'+(h+padding*2)+'px;left:'+x+'%;top:'+y+'%;z-index:'+layer.zIndex+';pointer-events:none;overflow:visible;';
                
                // Color: grey value (0=black, 255=white)
                var g=layer.grey;
                var fillColor='rgb('+g+','+g+','+Math.min(g+10,255)+')';
                
                // Create puffy cloud with many overlapping circles
                var blobCount=randI(8,14);
                var centerX=w/2;
                var centerY=h/2;
                
                for(var b=0;b<blobCount;b++){
                    var angle=rand(0,Math.PI*2);
                    var dist=rand(0,w*0.35);
                    var bx=centerX+Math.cos(angle)*dist;
                    var by=centerY+Math.sin(angle)*dist*0.6;
                    var br=rand(w*0.15,w*0.35);
                    
                    var circle=document.createElementNS(NS,'circle');
                    circle.setAttribute('cx',bx);
                    circle.setAttribute('cy',by);
                    circle.setAttribute('r',br);
                    circle.setAttribute('fill',fillColor);
                    svg.appendChild(circle);
                }
                
                // Add extra puffs on edges for organic shape
                var edgePuffs=randI(4,8);
                for(var e=0;e<edgePuffs;e++){
                    var angle=rand(0,Math.PI*2);
                    var bx=centerX+Math.cos(angle)*w*0.4;
                    var by=centerY+Math.sin(angle)*h*0.4;
                    var br=rand(w*0.1,w*0.2);
                    
                    var circle=document.createElementNS(NS,'circle');
                    circle.setAttribute('cx',bx);
                    circle.setAttribute('cy',by);
                    circle.setAttribute('r',br);
                    circle.setAttribute('fill',fillColor);
                    svg.appendChild(circle);
                }
                
                this.container.appendChild(svg);
                
                this.clouds.push({
                    el:svg,
                    layer:li,
                    hPhase:rand(0,Math.PI*2),
                    hSpeed:rand(layer.hSpeed[0],layer.hSpeed[1]),
                    hDrift:rand(layer.hDrift[0],layer.hDrift[1]),
                    vPhase:rand(0,Math.PI*2),
                    vSpeed:rand(layer.vSpeed[0],layer.vSpeed[1]),
                    vDrift:rand(layer.vDrift[0],layer.vDrift[1])
                });
            }
        }
    }
    
    update(scrollPct,time){
        var fadeOut=1-smoothstep(clamp(scrollPct*2.5,0,1));
        
        for(var i=0;i<this.clouds.length;i++){
            var c=this.clouds[i];
            var hOffset=Math.sin(time*c.hSpeed+c.hPhase)*c.hDrift;
            var vOffset=Math.sin(time*c.vSpeed+c.vPhase)*c.vDrift;
            // Back layers move down more on scroll
            var scrollOffset=scrollPct*100*(6-c.layer)*0.3;
            
            c.el.style.transform='translate('+hOffset+'px,'+(vOffset+scrollOffset)+'px)';
            c.el.style.opacity=fadeOut;
        }
    }
}
/* ═══════ MULTI-LAYER DUST (No Scroll Reaction) ═══════ */
class DustParticles{
    constructor(){
        this.layers=[
            {canvas:document.getElementById('dustCanvasBack'),count:100,size:[0.5,2],speed:[0.01,0.05],op:[0.01,0.03],blur:[8,18],color:'rgba(100,80,140,1)'},
            {canvas:document.getElementById('dustCanvasMid'),count:60,size:[1.5,4],speed:[0.03,0.12],op:[0.02,0.06],blur:[5,12],color:'rgba(140,120,180,1)'},
            {canvas:document.getElementById('dustCanvasFront'),count:35,size:[3,8],speed:[0.08,0.3],op:[0.04,0.12],blur:[2,6],color:'rgba(180,160,220,1)'}
        ];
        
        // Extreme front layer
        this.frontCanvas=document.createElement('canvas');
        this.frontCanvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;opacity:0;';
        document.body.appendChild(this.frontCanvas);
        this.layers.push({canvas:this.frontCanvas,count:15,size:[8,20],speed:[0.15,0.5],op:[0.06,0.18],blur:[1,4],color:'rgba(220,200,255,1)',avoidCenter:true});
        
        this.contexts=[];
        this.particles=[];
        
        for(var i=0;i<this.layers.length;i++){
            var l=this.layers[i];
            if(!l.canvas)continue;
            this.contexts.push(l.canvas.getContext('2d'));
            var ps=[];
            for(var j=0;j<l.count;j++)ps.push(this._create(l));
            this.particles.push(ps);
        }
        this.resize();
        window.addEventListener('resize',this.resize.bind(this));
    }
    
    _create(l){
        var x,y;
        if(l.avoidCenter){
            x=Math.random()>0.5?rand(0,innerWidth*0.25):rand(innerWidth*0.75,innerWidth);
            y=Math.random()>0.5?rand(0,innerHeight*0.3):rand(innerHeight*0.7,innerHeight);
        }else{
            x=rand(0,innerWidth);
            y=rand(0,innerHeight);
        }
        return{x:x,y:y,r:rand(l.size[0],l.size[1]),speed:rand(l.speed[0],l.speed[1]),driftX:rand(-0.3,0.3),driftAmp:rand(10,25),phase:rand(0,Math.PI*2),op:rand(l.op[0],l.op[1]),blur:rand(l.blur[0],l.blur[1]),pulseSpeed:rand(0.2,0.6),pulsePhase:rand(0,Math.PI*2)};
    }
    
    resize(){
        var dpr=Math.min(devicePixelRatio||1,2);
        for(var i=0;i<this.layers.length;i++){
            var c=this.layers[i].canvas;
            if(!c)continue;
            c.width=innerWidth*dpr;c.height=innerHeight*dpr;
            if(this.contexts[i])this.contexts[i].setTransform(dpr,0,0,dpr,0,0);
        }
    }
    
    update(time,scrollPct){
        var fadeIn=smoothstep(clamp((scrollPct-0.35)/0.15,0,1));
        var layerOps=[fadeIn*0.5,fadeIn*0.7,fadeIn*0.9,fadeIn*1.0];
        
        for(var li=0;li<this.layers.length;li++){
            var l=this.layers[li],c=l.canvas,ctx=this.contexts[li],ps=this.particles[li];
            if(!c||!ctx||!ps)continue;
            c.style.opacity=layerOps[li];
            if(layerOps[li]<0.01)continue;
            ctx.clearRect(0,0,innerWidth,innerHeight);
            
            for(var pi=0;pi<ps.length;pi++){
                var p=ps[pi];
                // Just float up - NO scroll reaction
                p.y-=p.speed;
                p.x+=Math.sin(time*0.3+p.phase)*p.driftX;
                
                // Wrap
                if(p.y<-30){p.y=innerHeight+30;p.x=l.avoidCenter?(Math.random()>0.5?rand(0,innerWidth*0.25):rand(innerWidth*0.75,innerWidth)):rand(0,innerWidth)}
                if(p.x<-30)p.x=innerWidth+30;
                if(p.x>innerWidth+30)p.x=-30;
                
                var pulse=Math.sin(time*p.pulseSpeed+p.pulsePhase)*0.3+0.7;
                ctx.save();
                ctx.globalAlpha=p.op*pulse;
                ctx.filter='blur('+p.blur+'px)';
                ctx.beginPath();
                ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
                ctx.fillStyle=l.color;
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

/* ═══════ INIT ═══════ */
document.addEventListener('DOMContentLoaded',function(){new App()});