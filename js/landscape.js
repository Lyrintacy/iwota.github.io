/* ═══════ LANDSCAPE — Parallax layers with trees, houses, contours ═══════ */
class Landscape{
    constructor(container){
        this.container=container;
        this.layers=[];
        this.N=14;
        this.seed=rand(0,9999);
        this.build();
        window.addEventListener('resize',this.build.bind(this));
    }
    
    srand(a,b){var x=Math.sin(this.seed+a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)}
    
    build(){
        this.container.innerHTML='';
        this.layers=[];
        var w=Math.max(innerWidth*1.2,1500);
        for(var i=0;i<this.N;i++)this.addLayer(i,i/(this.N-1),w);
    }
    
    color(depth){
        var t=depth,t2=t*t;
        var r=Math.round(lerp(235,6,t2*0.75+t*0.25));
        var g=Math.round(lerp(230,3,t2*0.8+t*0.2));
        var b=Math.round(lerp(240,12,t2*0.5+t*0.5));
        return{r:r,g:g,b:b,str:'rgb('+r+','+g+','+b+')'};
    }
    
    darker(c,amt){return'rgb('+Math.max(c.r-amt,0)+','+Math.max(c.g-amt,0)+','+Math.max(c.b-Math.round(amt*0.5),0)+')'}
    bleach(c,amount){return'rgb('+Math.round(lerp(c.r,225,amount))+','+Math.round(lerp(c.g,222,amount))+','+Math.round(lerp(c.b,230,amount))+')'}
    
    addLayer(idx,depth,w){
        var NS='http://www.w3.org/2000/svg';
        var h=Math.round(lerp(220,550,depth));
        var svg=document.createElementNS(NS,'svg');
        svg.setAttribute('viewBox','0 0 '+w+' '+h);
        svg.setAttribute('preserveAspectRatio','none');
        var c=this.color(depth);
        var hill=this.hillPath(w,h,depth);
        var p=document.createElementNS(NS,'path');
        p.setAttribute('d',hill.d);p.setAttribute('fill',c.str);
        svg.appendChild(p);
        this.addContourCurves(svg,hill,w,h,depth,c,idx);
        this.addObjects(svg,hill,w,h,depth,c,idx);
        var div=document.createElement('div');
        div.className='land-layer';
        div.style.zIndex=idx+2;
        div.appendChild(svg);
        this.container.appendChild(div);
        this.layers.push({el:div,depth:depth,vis:true});
    }
    
    hillPath(w,h,depth){
        var segs=randI(8,14);
        var base=lerp(h*0.5,h*0.2,depth);
        var amp=lerp(12,75,depth);
        var s=this.seed+depth*77;
        var ys=[];
        for(var i=0;i<=segs;i++){
            ys.push(base+Math.sin(i*1.4+s)*amp+Math.sin(i*2.8+s*0.6)*amp*0.35+Math.sin(i*0.5+s*1.4)*amp*0.45);
        }
        var d='M0 '+h+' L0 '+ys[0];
        for(var i=0;i<segs;i++){
            var x0=(i/segs)*w,x1=((i+1)/segs)*w;
            var xm=(x0+x1)/2,ym=(ys[i]+ys[i+1])/2;
            d+=' Q'+(x0+(x1-x0)*0.5)+' '+ys[i]+' '+xm+' '+ym;
        }
        d+=' L'+w+' '+ys[segs]+' L'+w+' '+h+' Z';
        var _ys=ys,_segs=segs;
        var getY=function(x){var t=(x/w)*_segs;var i=Math.floor(clamp(t,0,_segs-1));return lerp(_ys[i],_ys[Math.min(i+1,_segs)],t-i)};
        return{d:d,getY:getY,ys:ys,segs:segs};
    }

    addContourCurves(svg,hill,w,h,depth,c,idx){
        var NS='http://www.w3.org/2000/svg';
        var lineCount=randI(4,8);
        var dk=Math.round(lerp(18,45,depth));
        var strokeColor='rgb('+Math.max(c.r-dk,0)+','+Math.max(c.g-dk,0)+','+Math.max(c.b-Math.round(dk*0.4),0)+')';
        var strokeWidth=lerp(0.8,2.5,depth);
        for(var line=0;line<lineCount;line++){
            var vertOffset=8+line*lerp(6,14,depth);
            var pts=[],step=w/60;
            for(var x=0;x<=w;x+=step){
                var y=hill.getY(x)+vertOffset;
                if(y<h-2)pts.push({x:x,y:y});
            }
            if(pts.length<4)continue;
            var d='M'+pts[0].x+' '+pts[0].y;
            for(var i=1;i<pts.length-1;i++){
                var prev=pts[i-1],curr=pts[i],next=pts[i+1];
                d+=' Q'+curr.x+' '+curr.y+' '+((curr.x+next.x)/2)+' '+((curr.y+next.y)/2);
            }
            d+=' L'+pts[pts.length-1].x+' '+pts[pts.length-1].y;
            var path=document.createElementNS(NS,'path');
            path.setAttribute('d',d);
            path.setAttribute('stroke',strokeColor);
            path.setAttribute('stroke-width',strokeWidth);
            path.setAttribute('fill','none');
            path.setAttribute('stroke-linecap','round');
            path.setAttribute('opacity',lerp(0.5,1,depth)-line*0.04);
            svg.appendChild(path);
        }
    }

    addObjects(svg,hill,w,h,depth,c,idx){
        var dk1=this.darker(c,Math.round(lerp(12,35,depth)));
        var dk2=this.darker(c,Math.round(lerp(22,55,depth)));
        var bl1=this.bleach(c,0.35);
        var sz=lerp(6,48,depth);

        if(depth>0.02){
            var bgCount=Math.round(lerp(1,4,depth));
            for(var i=0;i<bgCount;i++){
                var x=rand(20,w-20),y=hill.getY(x)+rand(3,12);
                this.pine(svg,x,y,sz*rand(0.35,0.7),bl1,this.bleach(c,0.55),lerp(0.12,0.3,depth));
            }
        }

        var treeCount=Math.max(1,Math.round(lerp(2,8,1-Math.abs(depth-0.45)*2)));
        for(var i=0;i<treeCount;i++){
            var x=rand(30,w-30),y=hill.getY(x),s=sz*rand(0.6,1.3);
            if(this.srand(idx,i*13)>0.45)this.pine(svg,x,y,s,dk1,dk2,1);
            else this.roundTree(svg,x,y,s,dk1,dk2,1);
        }

        if(depth>0.3){
            var fgCount=Math.max(0,Math.round(lerp(0,3,depth-0.3)));
            for(var i=0;i<fgCount;i++){
                var x=rand(10,w-10),y=hill.getY(x)-rand(1,6);
                this.pine(svg,x,y,sz*rand(1.0,1.5),dk2,this.darker(c,Math.round(lerp(35,65,depth))),0.45);
            }
        }

        if(depth>0.15&&depth<0.85&&this.srand(idx,77)>0.5){
            var x=rand(120,w-160),y=hill.getY(x);
            this.house(svg,x,y,sz*rand(0.7,1.1),dk1,dk2,depth);
        }

        if(depth>0.45){
            var n=randI(3,10);
            for(var i=0;i<n;i++){
                var x=rand(15,w-15),y=hill.getY(x)+rand(-2,3);
                this.grass(svg,x,y,sz*rand(0.5,1.3),dk2);
            }
        }

        if(depth>0.65&&this.srand(idx,42)>0.5){
            var x=rand(80,w-80);
            this.deadTree(svg,x,hill.getY(x),lerp(18,50,depth),dk2);
        }
    }

    pine(svg,x,y,s,c1,c2,opacity){
        var NS='http://www.w3.org/2000/svg';
        var g=document.createElementNS(NS,'g');
        if(opacity<1)g.setAttribute('opacity',String(opacity));
        var trunk=document.createElementNS(NS,'rect');
        trunk.setAttribute('x',x-s*0.055);trunk.setAttribute('y',y-s*0.02);
        trunk.setAttribute('width',s*0.11);trunk.setAttribute('height',s*0.38);
        trunk.setAttribute('fill',c2);trunk.setAttribute('rx',s*0.02);
        g.appendChild(trunk);
        var layers=randI(3,4);
        for(var i=0;i<layers;i++){
            var ly=y-s*(0.15+i*0.22);
            var lw=s*(0.45-i*0.08);
            var p=document.createElementNS(NS,'path');
            p.setAttribute('d','M'+x+' '+(ly-s*0.25)+' L'+(x-lw)+' '+(ly+s*0.04)+' Q'+x+' '+(ly+s*0.08)+' '+(x+lw)+' '+(ly+s*0.04)+' Z');
            p.setAttribute('fill',c1);g.appendChild(p);
        }
        svg.appendChild(g);
    }

    roundTree(svg,x,y,s,c1,c2,opacity){
        var NS='http://www.w3.org/2000/svg';
        var g=document.createElementNS(NS,'g');
        if(opacity<1)g.setAttribute('opacity',String(opacity));
        var trunk=document.createElementNS(NS,'path');
        trunk.setAttribute('d','M'+(x-s*0.05)+' '+(y+s*0.02)+' L'+(x-s*0.04)+' '+(y-s*0.28)+' L'+(x+s*0.04)+' '+(y-s*0.28)+' L'+(x+s*0.05)+' '+(y+s*0.02)+' Z');
        trunk.setAttribute('fill',c2);g.appendChild(trunk);
        var circles=[[0,-0.48,0.28],[-0.14,-0.42,0.22],[0.14,-0.42,0.22],[-0.06,-0.55,0.18],[0.08,-0.56,0.17]];
        for(var i=0;i<circles.length;i++){
            var ci=circles[i];
            var el=document.createElementNS(NS,'circle');
            el.setAttribute('cx',x+s*ci[0]);el.setAttribute('cy',y+s*ci[1]);
            el.setAttribute('r',s*ci[2]);el.setAttribute('fill',c1);g.appendChild(el);
        }
        svg.appendChild(g);
    }

    deadTree(svg,x,y,s,c){
        var NS='http://www.w3.org/2000/svg';
        var g=document.createElementNS(NS,'g');
        g.setAttribute('opacity','0.55');
        var trunk=document.createElementNS(NS,'path');
        trunk.setAttribute('d','M'+(x-s*0.04)+' '+y+' L'+(x-s*0.025)+' '+(y-s*0.75)+' L'+(x+s*0.025)+' '+(y-s*0.75)+' L'+(x+s*0.04)+' '+y+' Z');
        trunk.setAttribute('fill',c);g.appendChild(trunk);
        var branches=[{sy:0.55,ex:-0.25,ey:0.72,cx:-0.12,cy:0.58},{sy:0.4,ex:0.2,ey:0.52,cx:0.1,cy:0.42},{sy:0.65,ex:0.16,ey:0.82,cx:0.08,cy:0.7},{sy:0.5,ex:-0.18,ey:0.58,cx:-0.08,cy:0.5}];
        for(var i=0;i<branches.length;i++){
            var b=branches[i];
            var p=document.createElementNS(NS,'path');
            p.setAttribute('d','M'+x+' '+(y-s*b.sy)+' Q'+(x+s*b.cx)+' '+(y-s*b.cy)+' '+(x+s*b.ex)+' '+(y-s*b.ey));
            p.setAttribute('stroke',c);p.setAttribute('stroke-width',Math.max(0.5,s*0.02));
            p.setAttribute('fill','none');p.setAttribute('stroke-linecap','round');
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    house(svg,x,y,s,c1,c2,depth){
        var NS='http://www.w3.org/2000/svg';
        var g=document.createElementNS(NS,'g');
        var hw=s*1.0,hh=s*0.8;
        var walls=document.createElementNS(NS,'rect');
        walls.setAttribute('x',x-hw/2);walls.setAttribute('y',y-hh);
        walls.setAttribute('width',hw);walls.setAttribute('height',hh);
        walls.setAttribute('fill',c1);walls.setAttribute('rx',s*0.02);
        g.appendChild(walls);
        var overhang=s*0.08;
        var roof=document.createElementNS(NS,'path');
        roof.setAttribute('d','M'+(x-hw/2-overhang)+' '+(y-hh)+' L'+x+' '+(y-hh-s*0.55)+' L'+(x+hw/2+overhang)+' '+(y-hh)+' Z');
        roof.setAttribute('fill',c2);g.appendChild(roof);
        var doorW=s*0.16,doorH=s*0.32;
        var door=document.createElementNS(NS,'rect');
        door.setAttribute('x',x-doorW/2);door.setAttribute('y',y-doorH);
        door.setAttribute('width',doorW);door.setAttribute('height',doorH);
        door.setAttribute('fill',c2);door.setAttribute('rx',doorW*0.15);
        g.appendChild(door);
        if(depth>0.2){
            var winAlpha=lerp(0.08,0.5,(depth-0.2)/0.6),winS=s*0.11;
            var positions=[[-0.28,-0.6],[0.28,-0.6]];
            for(var i=0;i<positions.length;i++){
                var wp=positions[i];
                var win=document.createElementNS(NS,'rect');
                win.setAttribute('x',x+wp[0]*hw-winS/2);
                win.setAttribute('y',y+wp[1]*hh);
                win.setAttribute('width',winS);win.setAttribute('height',winS);
                win.setAttribute('fill','rgba(212,168,67,'+winAlpha+')');
                win.setAttribute('rx',winS*0.1);g.appendChild(win);
            }
        }
        if(depth>0.3&&this.srand(x*0.1,depth*100)>0.4){
            var chimW=s*0.08,chimH=s*0.35;
            var chim=document.createElementNS(NS,'rect');
            chim.setAttribute('x',x+hw*0.22);chim.setAttribute('y',y-hh-s*0.35);
            chim.setAttribute('width',chimW);chim.setAttribute('height',chimH);
            chim.setAttribute('fill',c2);g.appendChild(chim);
        }
        svg.appendChild(g);
    }

    grass(svg,x,y,s,c){
        var NS='http://www.w3.org/2000/svg';
        var g=document.createElementNS(NS,'g');
        g.setAttribute('opacity','0.3');
        for(var i=-1;i<=1;i++){
            var bx=x+i*s*0.16;
            var p=document.createElementNS(NS,'path');
            p.setAttribute('d','M'+bx+' '+y+' Q'+(bx+rand(-3,3))+' '+(y-s*0.8)+' '+(bx+rand(-5,5))+' '+(y-s*0.15));
            p.setAttribute('stroke',c);p.setAttribute('stroke-width',clamp(s*0.06,0.5,2));
            p.setAttribute('fill','none');p.setAttribute('stroke-linecap','round');
            g.appendChild(p);
        }
        svg.appendChild(g);
    }

    update(progress){
        var parallaxZone=0.45;
        var p=clamp(progress/parallaxZone,0,1);
        for(var li=0;li<this.layers.length;li++){
            var L=this.layers[li];
            var d=L.depth;
            var layerStart=d*0.15;
            var layerEnd=lerp(0.95,0.3,d);
            var fadeOutLen=lerp(0.15,0.08,d);
            var alpha;
            if(p<layerEnd)alpha=1;
            else if(p<layerEnd+fadeOutLen)alpha=1-smoothstep((p-layerEnd)/fadeOutLen);
            else alpha=0;
            if(d<0.12)alpha*=lerp(0.45,1,d/0.12);
            var zoom=1+p*lerp(0.02,2.8,d*d);
            var drop=p*lerp(0,innerHeight*1.0,d*d);
            L.el.style.transform='translateY('+drop+'px) scale('+zoom+')';
            L.el.style.opacity=clamp(alpha,0,1);
            var vis=alpha>0.005;
            if(vis!==L.vis){L.vis=vis;L.el.style.display=vis?'':'none'}
        }
    }
}