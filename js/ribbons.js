/* ═══════ ORGANIC BACKGROUND RIBBONS ═══════ */
var PRIDE=CONFIG.pride;

function prideColor(idx,offset){
    offset=offset||0;
    var len=PRIDE.length;
    var ci=((idx+offset)%len+len)%len;
    var a=PRIDE[Math.floor(ci)];
    var b=PRIDE[Math.ceil(ci)%len];
    var t=ci%1;
    return{r:Math.round(lerp(a.r,b.r,t)),g:Math.round(lerp(a.g,b.g,t)),b:Math.round(lerp(a.b,b.b,t))};
}

/* ═══════ ORGANIC CURVED RIBBON ═══════ */
class OrganicRibbon{
    constructor(index,total){
        this.index=index;
        this.total=total;
        this.baseY=(index+rand(-0.4,0.4))/total;
        this.homeY=this.baseY;
        this.depthLevel=index/total;
        this.colorIdx=rand(0,PRIDE.length);
        this.curveType=randI(0,3);
        this.curveAmp=rand(0.05,0.2);
        this.curvePhase=rand(0,Math.PI*2);
        this.curveSpeed=rand(0.01,0.03);
        this.angle=rand(-0.15,0.15);
        this.waves=[];
        var waveCount=randI(2,4);
        for(var w=0;w<waveCount;w++){
            this.waves.push({amp:w===0?rand(12,35):rand(4,15),freq:rand(0.001+w*0.0015,0.004+w*0.002),speed:rand(0.02,0.06),phase:rand(0,Math.PI*2)});
        }
        this.baseWidth=rand(0.5,2);
        this.baseOpacity=Math.max(lerp(0.08,0.3,this.depthLevel),rand(0.05,0.12));
        this.fadeState=rand(0.4,1);
        this.fadeTarget=1;
        this.fadeSpeed=rand(0.15,0.4);
        this.nextFadeChange=rand(4,12);
        this.fadeTimer=rand(0,this.nextFadeChange);
        this.breathPhase=rand(0,Math.PI*2);
        this.breathSpeed=rand(0.08,0.18);
        this.driftPhase=rand(0,Math.PI*2);
        this.driftSpeed=rand(0.015,0.04);
        this.driftAmp=rand(8,25);
        this.hDriftPhase=rand(0,Math.PI*2);
        this.hDriftSpeed=rand(0.008,0.02);
        this.hDriftAmp=rand(20,60);
    }
    
    update(dt,time,cursorY,scrollPct){
        this.fadeTimer+=dt;
        if(this.fadeTimer>=this.nextFadeChange){
            this.fadeTimer=0;
            this.nextFadeChange=rand(5,15);
            var stayChance=0.5+this.depthLevel*0.3;
            this.fadeTarget=Math.random()<stayChance?rand(0.6,1):rand(0.15,0.4);
        }
        this.fadeState=lerp(this.fadeState,this.fadeTarget,dt*this.fadeSpeed);
    }
    
    getCurveOffset(t,time){
        var h=innerHeight,off=0;
        switch(this.curveType){
            case 0:off=Math.sin(t*Math.PI+time*this.curveSpeed+this.curvePhase)*this.curveAmp*h;break;
            case 1:var centered=(t-0.5)*2;off=(1-centered*centered)*this.curveAmp*h*(Math.sin(time*this.curveSpeed+this.curvePhase)*0.3+0.7);break;
            case 2:off=Math.sin(t*Math.PI*2+time*this.curveSpeed+this.curvePhase)*this.curveAmp*h*0.7;break;
            case 3:off=Math.sin(t*Math.PI*1.5+this.curvePhase)*this.curveAmp*h*0.5+Math.cos(t*Math.PI*0.7+time*this.curveSpeed)*this.curveAmp*h*0.3;break;
        }
        return off;
    }
    
    draw(ctx,time,cursorX,cursorY,scrollPct){
        if(this.fadeState<0.02)return;
        var w=innerWidth,h=innerHeight,segments=60;
        var breath=Math.sin(time*this.breathSpeed+this.breathPhase)*0.5+0.5;
        var colorShift=scrollPct*PRIDE.length*0.5;
        var c=prideColor(this.colorIdx,colorShift);
        var scrollBoost=smoothstep(clamp(scrollPct*1.2,0,1));
        var vDrift=Math.sin(time*this.driftSpeed+this.driftPhase)*this.driftAmp;
        var hDrift=Math.sin(time*this.hDriftSpeed+this.hDriftPhase)*this.hDriftAmp;
        var baseY=this.homeY*h+vDrift;
        var points=[];
        
        for(var i=0;i<=segments;i++){
            var t=i/segments;
            var x=t*w+hDrift*(t-0.5)+Math.sin(this.angle)*(t-0.5)*h*0.3;
            var y=baseY+this.getCurveOffset(t,time);
            for(var wv=0;wv<this.waves.length;wv++){
                var wave=this.waves[wv];
                y+=Math.sin(t*w*wave.freq+time*wave.speed+wave.phase)*wave.amp;
            }
            if(cursorX>0&&cursorY>0){
                var dx=x-cursorX,dy=y-cursorY,d=Math.hypot(dx,dy);
                if(d<180&&d>1){
                    var force=Math.pow(1-d/180,2);
                    var angle=Math.atan2(dy,dx);
                    x+=Math.cos(angle)*force*20;
                    y+=Math.sin(angle)*force*30;
                }
            }
            points.push({x:x,y:y});
        }
        
        if(points.length<2)return;
        ctx.beginPath();
        ctx.moveTo(points[0].x,points[0].y);
        for(var i=1;i<points.length-1;i++){
            var xc=(points[i].x+points[i+1].x)/2;
            var yc=(points[i].y+points[i+1].y)/2;
            ctx.quadraticCurveTo(points[i].x,points[i].y,xc,yc);
        }
        ctx.lineTo(points[points.length-1].x,points[points.length-1].y);
        
        var op=this.baseOpacity*this.fadeState*(0.5+breath*0.5)*(0.6+scrollBoost*0.6);
        op=clamp(op,0,0.45);
        if(op<0.008)return;
        
        var lineWidth=this.baseWidth*(0.7+breath*0.3);
        ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+op+')';
        ctx.lineWidth=lineWidth;
        ctx.lineCap='round';
        ctx.lineJoin='round';
        ctx.stroke();
        
        if(op>0.06){
            ctx.globalCompositeOperation='lighter';
            ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+(op*0.2)+')';
            ctx.lineWidth=lineWidth+4;
            ctx.stroke();
            if(scrollBoost>0.4&&this.fadeState>0.6){
                ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+(op*0.1)+')';
                ctx.lineWidth=lineWidth+10;
                ctx.stroke();
            }
            ctx.globalCompositeOperation='source-over';
        }
    }
}

/* ═══════ RIBBON CANVAS ═══════ */
class RibbonCanvas{
    constructor(canvas,isMobile){
        this.canvas=canvas;
        this.ctx=canvas.getContext('2d');
        this.isMobile=isMobile;
        this.cursorX=-1000;this.cursorY=-1000;
        this.smoothCursorX=-1000;this.smoothCursorY=-1000;
        this.scrollPct=0;this.time=0;
        this.lastTime=performance.now();
        this.ribbons=[];
        this.resize();
        this.createRibbons();
        window.addEventListener('resize',this.resize.bind(this));
    }
    
    resize(){
        var dpr=Math.min(devicePixelRatio||1,2);
        this.canvas.width=innerWidth*dpr;
        this.canvas.height=innerHeight*dpr;
        this.canvas.style.width=innerWidth+'px';
        this.canvas.style.height=innerHeight+'px';
        this.ctx.setTransform(dpr,0,0,dpr,0,0);
        this.createRibbons();
    }
    
    createRibbons(){
        this.ribbons=[];
        var count=this.isMobile?15:24;
        for(var i=0;i<count;i++)this.ribbons.push(new OrganicRibbon(i,count));
    }
    
    updatePointer(x,y){if(!this.isMobile){this.cursorX=x;this.cursorY=y}}
    updateScroll(pct){this.scrollPct=pct}
    
    animate(){
        var now=performance.now();
        var dt=Math.min((now-this.lastTime)/1000,0.1);
        this.lastTime=now;
        this.time+=dt;
        
        if(!this.isMobile){
            if(this.cursorX>0){
                this.smoothCursorX=lerp(this.smoothCursorX,this.cursorX,0.08);
                this.smoothCursorY=lerp(this.smoothCursorY,this.cursorY,0.08);
            }else{
                this.smoothCursorX=lerp(this.smoothCursorX,-1000,0.03);
                this.smoothCursorY=lerp(this.smoothCursorY,-1000,0.03);
            }
        }
        
        this.ctx.clearRect(0,0,innerWidth,innerHeight);
        for(var i=0;i<this.ribbons.length;i++){
            this.ribbons[i].update(dt,this.time,this.smoothCursorY,this.scrollPct);
            this.ribbons[i].draw(this.ctx,this.time,this.smoothCursorX,this.smoothCursorY,this.scrollPct);
        }
    }
}

/* ═══════ WOVEN STRINGS ═══════ */
class WovenStrings{
    constructor(container,layerCount){
        this.container=container;
        this.canvases=[];this.contexts=[];this.strings=[];
        this.N=4;this.time=rand(0,1000);
        for(var i=0;i<this.N;i++){
            var canvas=document.createElement('canvas');
            canvas.className='string-canvas';
            canvas.style.zIndex=1;
            container.appendChild(canvas);
            this.canvases.push(canvas);
            this.contexts.push(canvas.getContext('2d'));
            var count=randI(10,16),group=[];
            for(var j=0;j<count;j++)group.push(this._createString(i,j));
            this.strings.push(group);
        }
        this.resize();
        window.addEventListener('resize',this.resize.bind(this));
    }
    
    _createString(layerIdx,idx){
        var depthLevel=layerIdx/this.N;
        return{colorIdx:rand(0,PRIDE.length),homeY:rand(0.02,0.98),curveType:randI(0,2),curveAmp:rand(0.03,0.12),curvePhase:rand(0,Math.PI*2),curveSpeed:rand(0.008,0.02),waves:[{amp:rand(8,22),freq:rand(0.001,0.003),speed:rand(0.015,0.04),phase:rand(0,Math.PI*2)},{amp:rand(3,10),freq:rand(0.003,0.007),speed:rand(0.04,0.1),phase:rand(0,Math.PI*2)}],width:rand(0.3,1),baseOpacity:lerp(0.04,0.15,depthLevel),breathPhase:rand(0,Math.PI*2),breathSpeed:rand(0.05,0.12),fadeState:rand(0.3,1),fadeTarget:1,fadeTimer:rand(0,8),fadeInterval:rand(6,20)};
    }
    
    resize(){
        var dpr=Math.min(devicePixelRatio||1,2);
        for(var i=0;i<this.canvases.length;i++){
            this.canvases[i].width=innerWidth*dpr;
            this.canvases[i].height=innerHeight*dpr;
            this.canvases[i].style.width=innerWidth+'px';
            this.canvases[i].style.height=innerHeight+'px';
        }
        this.dpr=dpr;
    }
    
    _getCurveOffset(s,t,time){
        var h=innerHeight;
        switch(s.curveType){
            case 0:return Math.sin(t*Math.PI+time*s.curveSpeed+s.curvePhase)*s.curveAmp*h;
            case 1:var centered=(t-0.5)*2;return(1-centered*centered)*s.curveAmp*h*(Math.sin(time*s.curveSpeed)*0.3+0.7);
            case 2:return Math.sin(t*Math.PI*2+time*s.curveSpeed+s.curvePhase)*s.curveAmp*h*0.6;
            default:return 0;
        }
    }
    
    update(dt,scrollPct){
        this.time+=dt;
        var colorShift=scrollPct*PRIDE.length*0.4;
        var scrollBoost=smoothstep(clamp(scrollPct*1.2,0,1));
        
        for(var i=0;i<this.N;i++){
            var ctx=this.contexts[i];
            ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
            ctx.clearRect(0,0,innerWidth,innerHeight);
            var layerDepth=i/this.N;
            var layerOpacity=lerp(0.4,0.9,layerDepth)*(0.5+scrollBoost*0.5);
            this.canvases[i].style.opacity=clamp(layerOpacity,0,1);
            for(var j=0;j<this.strings[i].length;j++)this._drawString(ctx,this.strings[i][j],dt,colorShift,scrollBoost);
        }
    }
    
    _drawString(ctx,s,dt,colorShift,scrollBoost){
        s.fadeTimer+=dt;
        if(s.fadeTimer>=s.fadeInterval){
            s.fadeTimer=0;
            s.fadeInterval=rand(8,25);
            s.fadeTarget=Math.random()>0.2?rand(0.5,1):rand(0.1,0.4);
        }
        s.fadeState=lerp(s.fadeState,s.fadeTarget,dt*0.2);
        if(s.fadeState<0.03)return;
        
        var w=innerWidth,h=innerHeight,segments=45,t=this.time;
        var breath=Math.sin(t*s.breathSpeed+s.breathPhase)*0.5+0.5;
        var c=prideColor(s.colorIdx,colorShift);
        var points=[];
        
        for(var i=0;i<=segments;i++){
            var pct=i/segments;
            var x=pct*w;
            var y=s.homeY*h+this._getCurveOffset(s,pct,t);
            for(var wv=0;wv<s.waves.length;wv++){
                var wave=s.waves[wv];
                y+=Math.sin(pct*w*wave.freq+t*wave.speed+wave.phase)*wave.amp;
            }
            points.push({x:x,y:y});
        }
        
        ctx.beginPath();
        ctx.moveTo(points[0].x,points[0].y);
        for(var i=1;i<points.length-1;i++){
            var xc=(points[i].x+points[i+1].x)/2;
            var yc=(points[i].y+points[i+1].y)/2;
            ctx.quadraticCurveTo(points[i].x,points[i].y,xc,yc);
        }
        ctx.lineTo(points[points.length-1].x,points[points.length-1].y);
        
        var op=s.baseOpacity*s.fadeState*(0.5+breath*0.5)*(0.5+scrollBoost*0.6);
        op=clamp(op,0,0.25);
        if(op<0.005)return;
        
        ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+op+')';
        ctx.lineWidth=s.width*(0.7+breath*0.3);
        ctx.lineCap='round';
        ctx.lineJoin='round';
        ctx.stroke();
        
        if(op>0.05){
            ctx.globalCompositeOperation='lighter';
            ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+(op*0.15)+')';
            ctx.lineWidth=s.width+3;
            ctx.stroke();
            ctx.globalCompositeOperation='source-over';
        }
    }
}

window.__stringNodes=[];