/* ═══════ FLOATING CODE MANAGER ═══════ */
class FloatingManager{
    constructor(container,isMobile){
        this.container=container;
        this.isMobile=isMobile;
        this.items=[];
        if(!container)return;
        this.init();
    }

    init(){
        var count=this.isMobile?Math.floor(CONFIG.floating.count*0.5):CONFIG.floating.count;
        var docH=Math.max(document.documentElement.scrollHeight,innerHeight*5);
        for(var i=0;i<count;i++){
            var el=document.createElement('div');
            el.className='floating-code';
            el.textContent=CONFIG.floating.strings[i%CONFIG.floating.strings.length];
            var item={el:el,x:rand(0,innerWidth),y:rand(0,docH),baseX:0,baseY:0,speed:rand(0.3,1.2),phase:rand(0,Math.PI*2),driftX:rand(15,40),driftY:rand(10,25),active:false,ribbonPushed:false,ribbonOffX:0,ribbonOffY:0,targetRibbonOffX:0,targetRibbonOffY:0};
            item.baseX=item.x;item.baseY=item.y;
            this.items.push(item);
            this.container.appendChild(el);
        }
    }

    update(px,py,scrollY){
        if(!this.container)return;
        var radius=CONFIG.floating.radius,repel=CONFIG.floating.repel;
        var time=performance.now()*0.001;
        var stringNodes=window.__stringNodes||[];
        var stringRadius=90,stringRepel=45;

        for(var idx=0;idx<this.items.length;idx++){
            var item=this.items[idx];
            item.x=item.baseX+Math.sin(time*item.speed+item.phase)*item.driftX;
            item.y=item.baseY+Math.cos(time*item.speed*0.7+item.phase)*item.driftY;
            var screenY=item.y-scrollY;
            if(screenY<-100||screenY>innerHeight+100){
                item.el.style.transform='translate('+item.x+'px,'+screenY+'px)';
                if(item.active){item.active=false;item.el.classList.remove('active')}
                if(item.ribbonPushed){item.ribbonPushed=false;item.el.classList.remove('ribbon-pushed')}
                item.ribbonOffX*=0.9;item.ribbonOffY*=0.9;
                continue;
            }
            var offsetX=0,offsetY=0,isNear=false;
            if(px>0){
                var dx=item.x-px,dy=screenY-py,d=Math.hypot(dx,dy);
                if(d<radius){
                    isNear=true;
                    var force=Math.pow(1-d/radius,2);
                    var angle=Math.atan2(dy,dx);
                    offsetX=Math.cos(angle)*force*repel;
                    offsetY=Math.sin(angle)*force*repel;
                }
            }
            item.targetRibbonOffX=0;item.targetRibbonOffY=0;
            for(var ni=0;ni<stringNodes.length;ni++){
                var node=stringNodes[ni];
                var dx=item.x-node.x,dy=screenY-node.y,d=Math.hypot(dx,dy);
                if(d<stringRadius&&d>1){
                    var force=Math.pow(1-d/stringRadius,2);
                    var intensity=0.5+(node.intensity||0)*0.5;
                    var angle=Math.atan2(dy,dx);
                    item.targetRibbonOffX+=Math.cos(angle)*force*stringRepel*intensity;
                    item.targetRibbonOffY+=Math.sin(angle)*force*stringRepel*intensity;
                }
            }
            item.ribbonOffX=lerp(item.ribbonOffX,item.targetRibbonOffX,0.12);
            item.ribbonOffY=lerp(item.ribbonOffY,item.targetRibbonOffY,0.12);
            var ribbonPushMag=Math.hypot(item.ribbonOffX,item.ribbonOffY);
            if((ribbonPushMag>3)!==item.ribbonPushed){
                item.ribbonPushed=ribbonPushMag>3;
                item.el.classList.toggle('ribbon-pushed',item.ribbonPushed);
            }
            if(isNear!==item.active){item.active=isNear;item.el.classList.toggle('active',isNear)}
            item.el.style.transform='translate('+(item.x+offsetX+item.ribbonOffX)+'px,'+(screenY+offsetY+item.ribbonOffY)+'px)';
        }
    }

    touchNear(tx,ty){
        for(var i=0;i<this.items.length;i++){
            var item=this.items[i];
            var d=Math.hypot(item.x-tx,(item.y-scrollY)-ty);
            if(d<CONFIG.floating.radius*1.5){
                item.el.classList.add('active');
                (function(el){setTimeout(function(){el.classList.remove('active')},600)})(item.el);
            }
        }
    }
}

/* ═══════ MASCOT CONTROLLER ═══════ */
class MascotController{
    constructor(){
        this.smiley=document.querySelector('.mascot-smiley');
        this.cat=document.querySelector('.mascot-cat');
        this.ghost=document.querySelector('.mascot-ghost');
        this.mascots=[this.smiley,this.cat,this.ghost];
        this.offsets=[];
        for(var i=0;i<this.mascots.length;i++){
            this.offsets.push({phase:rand(0,Math.PI*2),speed:rand(0.25,0.55),ampX:rand(18,45),ampY:rand(25,55)});
        }
    }
    
    update(scrollPct,time){
        var fadeIn=smoothstep(clamp((scrollPct-0.12)/0.08,0,1));
        var fadeOut=1-smoothstep(clamp((scrollPct-0.55)/0.1,0,1));
        var visibility=fadeIn*fadeOut;
        for(var i=0;i<this.mascots.length;i++){
            var m=this.mascots[i];if(!m)continue;
            var o=this.offsets[i];
            var floatX=Math.sin(time*o.speed+o.phase)*o.ampX;
            var floatY=Math.cos(time*o.speed*0.7+o.phase*1.3)*o.ampY;
            var rise=scrollPct*-120;
            m.style.opacity=clamp(visibility*1.2,0,0.85);
            m.style.transform='translate('+floatX+'px,'+(floatY+rise)+'px) scale('+(0.9+visibility*0.2)+')';
        }
    }
}

/* ═══════ CLOUDS (White) ═══════ */
class Clouds{
    constructor(){
        this.items=[];
        var clouds=document.querySelectorAll('.cloud');
        for(var i=0;i<clouds.length;i++){
            this.items.push({el:clouds[i],baseOp:parseFloat(getComputedStyle(clouds[i]).opacity)||0.5,pSpeed:rand(0.015,0.055),dPhase:rand(0,Math.PI*2),dSpeed:rand(0.0008,0.002),dAmp:rand(18,45),zoomRate:0.04+i*0.015});
        }
    }
    
    update(progress,time){
        for(var i=0;i<this.items.length;i++){
            var c=this.items[i];
            var sy=progress*-innerHeight*c.pSpeed*5;
            var dx=Math.sin(time*c.dSpeed+c.dPhase)*c.dAmp;
            var fade=clamp(1-progress*3.3,0,1);
            c.el.style.transform='translateY('+sy+'px) translateX('+dx+'px) scale('+(1+progress*c.zoomRate)+')';
            c.el.style.opacity=c.baseOp*fade;
        }
    }
}

/* ═══════ SKY CONTROLLER ═══════ */
class SkyController{
    constructor(){this.el=document.getElementById('sky')}
    update(progress){
        this.el.style.filter='brightness('+lerp(1,0.04,clamp(progress/0.5,0,1))+') saturate('+lerp(1,3,clamp(progress/0.5,0,1))+')';
    }
}