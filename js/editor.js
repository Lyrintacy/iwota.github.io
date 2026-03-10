class LiveEditor{
    constructor(){
        this.active=false;this.selectedEl=null;this.undoStack=[];this.stickerDragging=null;this.stickerOffset={x:0,y:0};
        this.projectOrder=null;

        this.shortcodes=[
            {pattern:/^##\s*(.+)$/,type:'heading'},
            {pattern:/^#(.+)#$/,type:'heading'},
            {pattern:/^>>>\s*(.+)$/,type:'quote'},
            {pattern:/^---$/,type:'divider'},
            {pattern:/^~~~\s*(.+)$/,type:'fancy'},
            {pattern:/^\*\*\*\s*(.+)$/,type:'fancy'},
            {pattern:/^\[(.+)\]\((.+)\)$/,type:'link'}
        ];

        var s=document.createElement('style');
        s.textContent=
            '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}'+
            '.ed-sticker{pointer-events:none!important}'+
            '.ed-sticker *{pointer-events:none!important}'+
            '.ed-sticker-delete{display:none}'+
            '.editor-active .ed-sticker{pointer-events:auto!important;cursor:move}'+
            '.editor-active .ed-sticker *{pointer-events:none!important}'+
            '.editor-active .ed-sticker-delete{display:block!important;pointer-events:auto!important;cursor:pointer}'+
            '.editor-active .ed-editable{position:relative;z-index:60}'+
            '.ed-move-controls{display:flex;gap:4px;margin-bottom:8px}'+
            '.ed-move-controls .ed-btn{flex:1}'+
            '.ed-shortcode-hint{font-size:10px;color:#888;margin-top:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px}'+
            '.ed-shortcode-hint code{background:rgba(192,132,252,0.2);padding:1px 4px;border-radius:2px;color:#c084fc}'+
            '.ed-fancy-active{background:linear-gradient(90deg,#c084fc,#f472b6)!important;color:#000!important}'+
            '.ed-type-select{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}'+
            '.ed-type-btn{padding:6px 4px;font-size:11px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;cursor:pointer;transition:all 0.2s}'+
            '.ed-type-btn:hover{border-color:#c084fc;background:#2a2a4e}'+
            '.ed-type-btn.active{background:#c084fc;color:#000;border-color:#c084fc}'+
            '.editor-active .bproject{cursor:pointer}'+
            '.editor-active .bproject.ed-project-selected{outline:3px solid #c084fc;outline-offset:4px}'+
            '.editor-active .bproject:not(.expanded):hover{outline:2px dashed #c084fc66;outline-offset:2px}'+
            '.ed-project-list{max-height:300px;overflow-y:auto;margin:8px 0}'+
            '.ed-project-item{display:flex;align-items:center;gap:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;margin-bottom:4px;cursor:grab}'+
            '.ed-project-item:active{cursor:grabbing}'+
            '.ed-project-item.dragging{opacity:0.5;background:rgba(192,132,252,0.2)}'+
            '.ed-project-item .ed-proj-num{width:20px;height:20px;background:#c084fc;color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold}'+
            '.ed-project-item .ed-proj-name{flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
            '.ed-project-item .ed-proj-btns{display:flex;gap:2px}'+
            '.ed-project-item .ed-proj-btns button{padding:2px 6px;font-size:10px}'+
            '.ed-new-element{outline:2px dashed #4ade80;outline-offset:2px}';
        document.head.appendChild(s);

        this.buildUI();
        this.bindShortcut();
    }

    buildUI(){
        var toolbar=document.createElement('div');toolbar.id='editorToolbar';
        toolbar.innerHTML='<div class="ed-header"><span class="ed-title">☠ Live Editor</span><div class="ed-controls">'+
            '<button class="ed-btn" id="edAddImage" title="Add Image">🖼️</button>'+
            '<button class="ed-btn" id="edAddText" title="Add Text">📝</button>'+
            '<button class="ed-btn" id="edAddHeading" title="Add Heading">📌</button>'+
            '<button class="ed-btn" id="edAddQuote" title="Add Quote">💬</button>'+
            '<button class="ed-btn" id="edAddDivider" title="Add Divider">➖</button>'+
            '<button class="ed-btn" id="edAddLink" title="Add Link">🔗</button>'+
            '<button class="ed-btn" id="edAddSticker" title="Add Sticker">⭐</button>'+
            '<span class="ed-sep"></span>'+
            '<button class="ed-btn" id="edReorderProjects" title="Reorder Projects">📋</button>'+
            '<button class="ed-btn" id="edUndo" title="Undo">↩️</button>'+
            '<button class="ed-btn ed-amendment" id="edExportAmendment" title="Export">📄 Export</button>'+
            '<button class="ed-btn ed-close" id="edClose" title="Close">✕</button>'+
            '</div></div><div class="ed-status" id="edStatus">F2 to toggle • Click to edit</div>';
        document.body.appendChild(toolbar);

        var formatBar=document.createElement('div');formatBar.id='edFormatBar';
        formatBar.innerHTML=
            '<button class="ed-fmt" data-cmd="bold"><strong>B</strong></button>'+
            '<button class="ed-fmt" data-cmd="italic"><em>I</em></button>'+
            '<button class="ed-fmt" data-cmd="underline"><u>U</u></button>'+
            '<span class="ed-fmt-sep">|</span>'+
            '<input type="color" class="ed-fmt-color" id="edFmtColor" value="#c084fc">'+
            '<select class="ed-fmt-select" id="edFmtSize"><option value="">Size</option><option value="1">XS</option><option value="3">M</option><option value="5">L</option><option value="7">XL</option></select>'+
            '<button class="ed-fmt" data-cmd="createLink">🔗</button>'+
            '<button class="ed-fmt" id="edFmtFancy">✨</button>'+
            '<button class="ed-fmt" data-cmd="removeFormat">⌧</button>';
        document.body.appendChild(formatBar);

        var panel=document.createElement('div');panel.id='editorPanel';
        panel.innerHTML='<div class="ed-panel-header">Properties</div><div class="ed-panel-body" id="edPanelBody"><p class="ed-panel-hint">Select element to edit</p></div>';
        document.body.appendChild(panel);

        var highlight=document.createElement('div');highlight.id='editorHighlight';document.body.appendChild(highlight);
        var ctx=document.createElement('div');ctx.id='editorContext';document.body.appendChild(ctx);
        var fileInput=document.createElement('input');fileInput.type='file';fileInput.id='edFileInput';fileInput.accept='image/*,.gif';fileInput.style.display='none';document.body.appendChild(fileInput);

        this.toolbar=toolbar;this.formatBar=formatBar;this.panel=panel;this.highlight=highlight;this.ctx=ctx;this.fileInput=fileInput;
    }

    bindShortcut(){
        var self=this;
        document.addEventListener('keydown',function(e){
            if(e.key==='F2'){e.preventDefault();self.toggle();return;}
            if(!self.active) return;
            if(e.ctrlKey&&e.key==='z'){e.preventDefault();self.undo();}
            if(e.key==='Delete'&&self.selectedEl&&!self.selectedEl.isContentEditable) self.deleteSelected();
            if(e.key==='Escape'){self.deselectAll();self.hideContext();}
            if(e.altKey&&self.selectedEl){
                if(e.key==='ArrowUp'){e.preventDefault();self.moveElement(self.selectedEl,'up');}
                if(e.key==='ArrowDown'){e.preventDefault();self.moveElement(self.selectedEl,'down');}
            }
            if(e.key==='Enter'&&self.selectedEl&&self.selectedEl.isContentEditable){
                if(self.processShortcodes(self.selectedEl)) e.preventDefault();
            }
        });
    }

    toggle(){
        this.active=!this.active;
        document.body.classList.toggle('editor-active',this.active);
        this.toolbar.classList.toggle('ed-visible',this.active);
        this.panel.classList.toggle('ed-visible',this.active);
        if(this.active){this.enableEditing();this.setStatus('Editor active • F2 to close');}
        else{this.disableEditing();this.deselectAll();this.hideContext();this.hideFormatBar();}
    }

    enableEditing(){
        var self=this;
        this.markEditables();

        document.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img,.pcard-thumb-img,.hero-photo,.rcard img')
            .forEach(function(el){el.classList.add('ed-interactive');});
        document.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.bp-text,.bp-heading,.ed-divider,.ed-link-block')
            .forEach(function(el){el.classList.add('ed-block');});

        this._projectExpandObserver=new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                if(m.attributeName==='class'){
                    var t=m.target;
                    if(t.classList.contains('bproject')&&t.classList.contains('expanded')){
                        setTimeout(function(){self.markEditables(t);},100);
                    }
                }
            });
        });
        document.querySelectorAll('.bproject').forEach(function(p){
            self._projectExpandObserver.observe(p,{attributes:true,attributeFilter:['class']});
        });

        this._clickHandler=function(e){
            if(!self.active) return;
            var t=e.target;
            var proj=t.closest('.bproject');
            if(proj&&!proj.classList.contains('expanded')&&!t.closest('.ed-editable,.ed-interactive,.ed-sticker')){
                e.stopPropagation();self.selectProject(proj);return;
            }
            if(t.closest('.ed-sticker')){e.stopPropagation();self.selectElement(t.closest('.ed-sticker'));return;}
            if(t.closest('.ed-divider')){e.stopPropagation();self.selectElement(t.closest('.ed-divider'));return;}
            if(t.closest('.ed-link-block')){e.stopPropagation();e.preventDefault();self.selectElement(t.closest('.ed-link-block'));return;}
            if(t.closest('.ed-editable')){e.stopPropagation();self.selectElement(t.closest('.ed-editable'));return;}
            if(t.closest('.ed-interactive')){e.stopPropagation();self.selectElement(t.closest('.ed-interactive'));return;}
            if(t.closest('.ed-block')){e.stopPropagation();self.selectElement(t.closest('.ed-block'));return;}
            if(!t.closest('#editorPanel,#editorToolbar,#editorContext,#edFormatBar')){self.deselectAll();self.hideContext();}
        };
        document.addEventListener('click',this._clickHandler);

        this._contextHandler=function(e){
            if(!self.active) return;
            var proj=e.target.closest('.bproject');
            if(proj&&!proj.classList.contains('expanded')){e.preventDefault();self.showProjectContext(e,proj);return;}
            var t=e.target.closest('.ed-block,.ed-interactive,.ed-editable,.ed-sticker,.ed-divider,.ed-link-block');
            if(t){e.preventDefault();self.showContext(e,t);}
        };
        document.addEventListener('contextmenu',this._contextHandler);

        this._mousedownHandler=function(e){
            if(!self.active) return;
            var s=e.target.closest('.ed-sticker');
            if(s&&!e.target.closest('.ed-sticker-delete')){
                self.stickerDragging=s;
                var r=s.getBoundingClientRect();
                self.stickerOffset.x=e.clientX-r.left;
                self.stickerOffset.y=e.clientY-r.top;
                s.classList.add('ed-sticker-dragging');
                e.preventDefault();
            }
        };
        this._mousemoveHandler=function(e){
            if(!self.stickerDragging) return;
            var p=self.stickerDragging.parentElement;
            var pr=p.getBoundingClientRect();
            self.stickerDragging.style.left=(e.clientX-pr.left-self.stickerOffset.x)+'px';
            self.stickerDragging.style.top=(e.clientY-pr.top-self.stickerOffset.y)+'px';
        };
        this._mouseupHandler=function(){
            if(self.stickerDragging){self.stickerDragging.classList.remove('ed-sticker-dragging');self.stickerDragging=null;}
        };
        document.addEventListener('mousedown',this._mousedownHandler);
        document.addEventListener('mousemove',this._mousemoveHandler);
        document.addEventListener('mouseup',this._mouseupHandler);

        document.getElementById('edAddImage').onclick=function(){self.addImage();};
        document.getElementById('edAddText').onclick=function(){self.addTextBlock();};
        document.getElementById('edAddHeading').onclick=function(){self.addHeading();};
        document.getElementById('edAddQuote').onclick=function(){self.addQuoteBlock();};
        document.getElementById('edAddDivider').onclick=function(){self.addDivider();};
        document.getElementById('edAddLink').onclick=function(){self.addLinkBlock();};
        document.getElementById('edAddSticker').onclick=function(){self.addSticker();};
        document.getElementById('edReorderProjects').onclick=function(){self.showProjectReorderPanel();};
        document.getElementById('edUndo').onclick=function(){self.undo();};
        document.getElementById('edExportAmendment').onclick=function(){self.exportAmendment();};
        document.getElementById('edClose').onclick=function(){self.toggle();};

        this.formatBar.querySelectorAll('.ed-fmt[data-cmd]').forEach(function(btn){
            btn.addEventListener('mousedown',function(e){
                e.preventDefault();
                var cmd=btn.getAttribute('data-cmd');
                if(cmd==='createLink'){var u=prompt('URL:','https://');if(u)document.execCommand(cmd,false,u);}
                else document.execCommand(cmd,false,null);
            });
        });
        document.getElementById('edFmtFancy').addEventListener('mousedown',function(e){e.preventDefault();self.toggleFancyFont();});
        document.getElementById('edFmtColor').addEventListener('input',function(){document.execCommand('foreColor',false,this.value);});
        document.getElementById('edFmtSize').addEventListener('change',function(){if(this.value)document.execCommand('fontSize',false,this.value);this.value='';});
    }

    markEditables(container){
        var scope=container||document;
        var sel=[
            '.hero-right h1','.hero-right h2','.hero-right p','.hero-desc','.whisper',
            '.section-title','.section-sub',
            '.pcard h3','.pcard-short',
            '.bproject-header-text h3','.bproject-tagline',
            '.bm-value',
            '.bp-text','.bp-heading','.bp-caption',
            '.bproject-tags span',
            '.rcard h3','.rcard-role','.rcard p',
            '.about-text p','.mantras li'
        ].join(',');
        scope.querySelectorAll(sel).forEach(function(el){
            if(!el.hasAttribute('data-ed-original')){
                el.setAttribute('data-ed-original',el.innerHTML);
                el.classList.add('ed-editable');
            }
        });
        if(container){
            container.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img').forEach(function(el){el.classList.add('ed-interactive');});
            container.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-quote,.bp-text,.bp-heading').forEach(function(el){el.classList.add('ed-block');});
        }
    }

    disableEditing(){
        document.querySelectorAll('.ed-editable').forEach(function(el){el.contentEditable='false';el.classList.remove('ed-editable','ed-selected');});
        document.querySelectorAll('.ed-interactive').forEach(function(el){el.classList.remove('ed-interactive','ed-selected');});
        document.querySelectorAll('.ed-block').forEach(function(el){el.classList.remove('ed-block','ed-selected');});
        document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
        if(this._clickHandler) document.removeEventListener('click',this._clickHandler);
        if(this._contextHandler) document.removeEventListener('contextmenu',this._contextHandler);
        if(this._mousedownHandler) document.removeEventListener('mousedown',this._mousedownHandler);
        if(this._mousemoveHandler) document.removeEventListener('mousemove',this._mousemoveHandler);
        if(this._mouseupHandler) document.removeEventListener('mouseup',this._mouseupHandler);
        if(this._projectExpandObserver){this._projectExpandObserver.disconnect();this._projectExpandObserver=null;}
    }

    // ══════════════════════════════════════════════════════════════
    // PROJECT MANAGEMENT
    // ══════════════════════════════════════════════════════════════

    selectProject(projectEl){
        this.deselectAll();
        document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
        projectEl.classList.add('ed-project-selected');
        this.selectedEl=projectEl;
        this.showProjectProps(projectEl);
        this.updateHighlight(projectEl);
    }

    showProjectProps(projectEl){
        var panel=document.getElementById('edPanelBody');
        var projectId=projectEl.dataset.projectId||'unknown';
        var nameEl=projectEl.querySelector('.bproject-header-text h3');
        var projectName=nameEl?nameEl.textContent:'Project';
        var projects=document.querySelectorAll('.bproject');
        var idx=-1;
        for(var i=0;i<projects.length;i++){if(projects[i]===projectEl){idx=i;break;}}
        panel.innerHTML=
            '<div class="ed-prop"><label>Project</label><p style="margin:0;color:#c084fc;font-size:14px">'+projectName+'</p><small style="color:#666">ID: '+projectId+'</small></div>'+
            '<div class="ed-prop"><label>Position ('+(idx+1)+' of '+projects.length+')</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edProjMoveUp" '+(idx===0?'disabled':'')+'>⬆️ Up</button>'+
            '<button class="ed-btn" id="edProjMoveDown" '+(idx===projects.length-1?'disabled':'')+'>⬇️ Down</button>'+
            '</div></div>'+
            '<div class="ed-prop"><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edProjMoveTop" '+(idx===0?'disabled':'')+'>⏫ First</button>'+
            '<button class="ed-btn" id="edProjMoveLast" '+(idx===projects.length-1?'disabled':'')+'>⏬ Last</button>'+
            '</div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full" id="edOpenReorder">📋 Reorder All</button></div>';
        var self=this;
        document.getElementById('edProjMoveUp').onclick=function(){self.moveProject(projectEl,'up');};
        document.getElementById('edProjMoveDown').onclick=function(){self.moveProject(projectEl,'down');};
        document.getElementById('edProjMoveTop').onclick=function(){self.moveProject(projectEl,'first');};
        document.getElementById('edProjMoveLast').onclick=function(){self.moveProject(projectEl,'last');};
        document.getElementById('edOpenReorder').onclick=function(){self.showProjectReorderPanel();};
    }

    moveProject(projectEl,direction){
        var container=projectEl.parentElement;
        var projects=Array.from(container.querySelectorAll('.bproject'));
        var i=projects.indexOf(projectEl);
        switch(direction){
            case'up':if(i>0)container.insertBefore(projectEl,projects[i-1]);break;
            case'down':if(i<projects.length-1)container.insertBefore(projects[i+1],projectEl);break;
            case'first':container.insertBefore(projectEl,projects[0]);break;
            case'last':container.appendChild(projectEl);break;
        }
        this.syncThumbnailOrder();
        this.showProjectProps(projectEl);
        this.updateHighlight(projectEl);
        this.setStatus('Project moved '+direction);
        this.projectOrder=this.getCurrentProjectOrder();
    }

    showProjectReorderPanel(){
        var panel=document.getElementById('edPanelBody');
        var projects=document.querySelectorAll('.bproject');
        var self=this;
        var html='<div class="ed-prop"><label>Drag to Reorder</label></div><div class="ed-project-list" id="edProjectList">';
        for(var i=0;i<projects.length;i++){
            var id=projects[i].dataset.projectId||'proj-'+i;
            var nameEl=projects[i].querySelector('.bproject-header-text h3');
            var name=nameEl?nameEl.textContent:'Project '+(i+1);
            html+='<div class="ed-project-item" data-project-id="'+id+'" draggable="true">'+
                '<span class="ed-proj-num">'+(i+1)+'</span>'+
                '<span class="ed-proj-name">'+name+'</span>'+
                '<span class="ed-proj-btns">'+
                '<button class="ed-btn" data-action="up" '+(i===0?'disabled':'')+'>↑</button>'+
                '<button class="ed-btn" data-action="down" '+(i===projects.length-1?'disabled':'')+'>↓</button>'+
                '</span></div>';
        }
        html+='</div><div class="ed-prop"><button class="ed-btn ed-full" id="edApplyOrder">✓ Apply Order</button></div>';
        panel.innerHTML=html;
        this.setupProjectListDragDrop();
        panel.querySelectorAll('.ed-proj-btns button').forEach(function(btn){
            btn.onclick=function(e){e.stopPropagation();self.moveProjectInList(btn.closest('.ed-project-item'),btn.dataset.action);};
        });
        document.getElementById('edApplyOrder').onclick=function(){self.applyProjectListOrder();};
    }

    setupProjectListDragDrop(){
        var list=document.getElementById('edProjectList');if(!list)return;
        var self=this;var dragged=null;
        list.querySelectorAll('.ed-project-item').forEach(function(item){
            item.addEventListener('dragstart',function(e){dragged=item;item.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
            item.addEventListener('dragend',function(){item.classList.remove('dragging');dragged=null;self.updateProjectListNumbers();});
            item.addEventListener('dragover',function(e){
                e.preventDefault();
                if(dragged&&dragged!==item){
                    var mid=item.getBoundingClientRect().top+item.getBoundingClientRect().height/2;
                    if(e.clientY<mid)list.insertBefore(dragged,item);
                    else list.insertBefore(dragged,item.nextSibling);
                }
            });
        });
    }

    moveProjectInList(item,dir){
        var list=item.parentElement;
        var items=Array.from(list.querySelectorAll('.ed-project-item'));
        var i=items.indexOf(item);
        if(dir==='up'&&i>0)list.insertBefore(item,items[i-1]);
        else if(dir==='down'&&i<items.length-1)list.insertBefore(items[i+1],item);
        this.updateProjectListNumbers();
    }

    updateProjectListNumbers(){
        var items=document.querySelectorAll('#edProjectList .ed-project-item');
        items.forEach(function(item,i){
            var n=item.querySelector('.ed-proj-num');if(n)n.textContent=i+1;
            var u=item.querySelector('[data-action="up"]');if(u)u.disabled=i===0;
            var d=item.querySelector('[data-action="down"]');if(d)d.disabled=i===items.length-1;
        });
    }

    applyProjectListOrder(){
        var items=document.querySelectorAll('#edProjectList .ed-project-item');
        var container=document.querySelector('.bproject').parentElement;
        var order=[];
        items.forEach(function(item){order.push(item.dataset.projectId);});
        order.forEach(function(id){
            var el=document.querySelector('.bproject[data-project-id="'+id+'"]');
            if(el)container.appendChild(el);
        });
        this.syncThumbnailOrder();
        this.projectOrder=order;
        this.setStatus('Order applied!');
        this.deselectAll();
    }

    getCurrentProjectOrder(){
        var order=[];
        document.querySelectorAll('.bproject').forEach(function(p){if(p.dataset.projectId)order.push(p.dataset.projectId);});
        return order;
    }

    syncThumbnailOrder(){
        var grid=document.querySelector('.pgrid,#projectGrid');if(!grid)return;
        document.querySelectorAll('.bproject').forEach(function(p){
            var id=p.dataset.projectId;if(!id)return;
            var thumb=grid.querySelector('[data-project-id="'+id+'"]');
            if(thumb)grid.appendChild(thumb);
        });
    }

    showProjectContext(e,projectEl){
        var projects=document.querySelectorAll('.bproject');
        var idx=-1;for(var i=0;i<projects.length;i++){if(projects[i]===projectEl){idx=i;break;}}
        this.ctx.innerHTML=
            '<button data-action="select">✏️ Edit Project</button><hr class="ed-ctx-sep">'+
            '<button data-action="moveup" '+(idx===0?'disabled':'')+'>⬆️ Move Up</button>'+
            '<button data-action="movedown" '+(idx===projects.length-1?'disabled':'')+'>⬇️ Move Down</button>'+
            '<button data-action="movefirst" '+(idx===0?'disabled':'')+'>⏫ Move First</button>'+
            '<button data-action="movelast" '+(idx===projects.length-1?'disabled':'')+'>⏬ Move Last</button>'+
            '<hr class="ed-ctx-sep"><button data-action="reorder">📋 Reorder All</button>';
        this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,innerWidth-200)+'px';
        this.ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';
        var self=this;
        this.ctx.querySelectorAll('button').forEach(function(btn){
            btn.onclick=function(){
                switch(btn.getAttribute('data-action')){
                    case'select':self.selectProject(projectEl);break;
                    case'moveup':self.moveProject(projectEl,'up');break;
                    case'movedown':self.moveProject(projectEl,'down');break;
                    case'movefirst':self.moveProject(projectEl,'first');break;
                    case'movelast':self.moveProject(projectEl,'last');break;
                    case'reorder':self.showProjectReorderPanel();break;
                }
                self.hideContext();
            };
        });
    }

    // ══════════════════════════════════════════════════════════════
    // ELEMENT SELECTION
    // ══════════════════════════════════════════════════════════════

    selectElement(el){
        this.deselectAll();
        document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
        this.selectedEl=el;
        el.classList.add('ed-selected');
        if(el.classList.contains('ed-editable')){el.contentEditable='true';el.focus();this.showFormatBar(el);this.showTextProps(el);}
        else if(el.tagName==='IMG'){this.hideFormatBar();this.showImageProps(el);}
        else if(el.classList.contains('ed-sticker')){this.hideFormatBar();this.showStickerProps(el);}
        else if(el.classList.contains('ed-divider')){this.hideFormatBar();this.showDividerProps(el);}
        else if(el.classList.contains('ed-link-block')){this.hideFormatBar();this.showLinkProps(el);}
        else{this.hideFormatBar();this.showBlockProps(el);}
        this.updateHighlight(el);
    }

    deselectAll(){
        if(this.selectedEl&&this.selectedEl.classList&&this.selectedEl.classList.contains('ed-editable')){
            this.selectedEl.contentEditable='false';
            var original=this.selectedEl.getAttribute('data-ed-original');
            if(original!==null&&original!==this.selectedEl.innerHTML){
                this.pushUndo({el:this.selectedEl,type:'html',value:original});
                this.syncElementToThumbnail(this.selectedEl);
            }
        }
        document.querySelectorAll('.ed-selected').forEach(function(el){el.classList.remove('ed-selected');});
        document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
        this.selectedEl=null;
        this.highlight.style.display='none';
        this.hideFormatBar();
        document.getElementById('edPanelBody').innerHTML='<p class="ed-panel-hint">Select element to edit</p>';
    }

    updateHighlight(el){
        var r=el.getBoundingClientRect();
        this.highlight.style.display='block';
        this.highlight.style.top=(r.top+window.scrollY-3)+'px';
        this.highlight.style.left=(r.left-3)+'px';
        this.highlight.style.width=(r.width+6)+'px';
        this.highlight.style.height=(r.height+6)+'px';
    }

    showFormatBar(el){
        var r=el.getBoundingClientRect();
        this.formatBar.classList.add('ed-visible');
        this.formatBar.style.top=Math.max(70,r.top+window.scrollY-50)+'px';
        this.formatBar.style.left=Math.max(10,r.left)+'px';
        var fb=document.getElementById('edFmtFancy');
        fb.classList.toggle('ed-fancy-active',el.classList.contains('fancy')||el.classList.contains('alt-font'));
    }

    hideFormatBar(){this.formatBar.classList.remove('ed-visible');}
    hideContext(){this.ctx.style.display='none';}

    // ══════════════════════════════════════════════════════════════
    // THUMBNAIL SYNC
    // ══════════════════════════════════════════════════════════════

    syncElementToThumbnail(el){
        var projectEl=el.closest('.bproject');if(!projectEl)return;
        var projectId=projectEl.dataset.projectId;if(!projectId)return;
        var text=(el.textContent||el.innerText||'').trim();
        var thumb=document.querySelector('#projectGrid [data-project-id="'+projectId+'"],.pgrid [data-project-id="'+projectId+'"]');
        if(!thumb)return;

        if(el.closest('.bproject-header-text')&&/^H[1-6]$/.test(el.tagName)){
            var h3=thumb.querySelector('h3');if(h3)h3.textContent=text;
            var img=thumb.querySelector('.pcard-thumb-img');if(img)img.alt=text;
            this.updateProjectsArray(projectId,'title',text);
            this.setStatus('✓ Title synced');return;
        }
        if(el.classList.contains('bproject-tagline')){
            var s=thumb.querySelector('.pcard-short');if(s)s.textContent=text;
            this.updateProjectsArray(projectId,'tagline',text);
            this.updateProjectsArray(projectId,'short',text);
            this.setStatus('✓ Tagline synced');return;
        }
        if(el.classList.contains('bm-value')){
            var allVals=Array.from(projectEl.querySelectorAll('.bm-value'));
            var allLabels=Array.from(projectEl.querySelectorAll('.bm-label'));
            var vi=allVals.indexOf(el);if(vi===-1)return;
            var label=allLabels[vi]?allLabels[vi].textContent.toLowerCase().trim():'';
            var pmv=Array.from(thumb.querySelectorAll('.pm-value'));
            if(label.includes('role')){if(pmv[0])pmv[0].textContent=text;this.updateProjectsArray(projectId,'role',text);this.setStatus('✓ Role synced');}
            else if(label.includes('team')){if(pmv[1])pmv[1].textContent=text;this.updateProjectsArray(projectId,'team',text);this.setStatus('✓ Team synced');}
            else if(label.includes('engine')){
                if(pmv[2]){var ei=pmv[2].querySelector('.engine-icon');if(ei)ei.textContent=text;else pmv[2].textContent=text;}
                this.updateProjectsArray(projectId,'engine',text);this.setStatus('✓ Engine synced');
            }
            else if(label.includes('time')){if(pmv[3])pmv[3].textContent=text;this.updateProjectsArray(projectId,'timeframe',text);this.setStatus('✓ Timeline synced');}
        }
    }

    updateProjectsArray(projectId,field,value){
        if(typeof PROJECTS==='undefined')return;
        for(var i=0;i<PROJECTS.length;i++){if(PROJECTS[i].id===projectId){PROJECTS[i][field]=value;break;}}
    }

    // ══════════════════════════════════════════════════════════════
    // TEXT PROPS UI
    // ══════════════════════════════════════════════════════════════

    showTextProps(el){
        var panel=document.getElementById('edPanelBody');
        var cs=getComputedStyle(el);
        var ct=this.getElementType(el);
        var isFancy=el.classList.contains('fancy')||el.classList.contains('alt-font');
        panel.innerHTML=
            '<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><label>Convert To</label><div class="ed-type-select">'+
            ['text','heading','subheading','caption','quote','whisper'].map(function(t){
                return '<button class="ed-type-btn'+(ct===t?' active':'')+'" data-type="'+t+'">'+t.charAt(0).toUpperCase()+t.slice(1)+'</button>';
            }).join('')+
            '</div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full'+(isFancy?' ed-fancy-active':'')+'" id="edToggleFancy">✨ '+(isFancy?'Remove':'Apply')+' Fancy</button></div>'+
            '<div class="ed-prop"><label>Font Size</label><input type="number" class="ed-prop-input" id="edPropFS" value="'+parseInt(cs.fontSize)+'" min="8" max="120"></div>'+
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edPropOp" min="0" max="1" step="0.05" value="'+(cs.opacity||1)+'"></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteText">🗑️ Delete</button></div>'+
            '<div class="ed-shortcode-hint"><strong>Quick codes (+ Enter):</strong><br>'+
            '<code>## text</code> Heading &nbsp; <code>>>> text</code> Quote<br>'+
            '<code>~~~ text</code> Fancy &nbsp; <code>---</code> Divider</div>';
        var self=this;
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        panel.querySelectorAll('.ed-type-btn').forEach(function(btn){btn.onclick=function(){self.convertElementType(el,btn.dataset.type);};});
        document.getElementById('edToggleFancy').onclick=function(){self.toggleFancyFontOnElement(el);self.showTextProps(el);};
        document.getElementById('edPropFS').oninput=function(){el.style.fontSize=this.value+'px';self.updateHighlight(el);};
        document.getElementById('edPropOp').oninput=function(){el.style.opacity=this.value;};
        document.getElementById('edDeleteText').onclick=function(){self.deleteSelected();};
    }

    getElementType(el){
        var tag=el.tagName.toLowerCase();var cls=el.className||'';
        if(/^h[1-6]$/.test(tag)||cls.includes('heading')||cls.includes('section-title'))return'heading';
        if(cls.includes('sub')||cls.includes('tagline'))return'subheading';
        if(cls.includes('caption'))return'caption';
        if(tag==='blockquote'||cls.includes('quote'))return'quote';
        if(cls.includes('whisper'))return'whisper';
        return'text';
    }

    convertElementType(el,newType){
        var self=this;var content=el.innerHTML;var parent=el.parentElement;var next=el.nextElementSibling;var newEl;
        this.pushUndo({el:parent,type:'child',value:el.outerHTML,ref:next});
        switch(newType){
            case'heading':newEl=document.createElement('h4');newEl.className='bp-heading ed-editable ed-block';newEl.innerHTML=content;break;
            case'subheading':newEl=document.createElement('p');newEl.className='bp-caption ed-editable ed-block';newEl.style.cssText='font-size:1.1em;opacity:0.8;';newEl.innerHTML=content;break;
            case'caption':newEl=document.createElement('p');newEl.className='bp-caption ed-editable ed-block';newEl.style.cssText='font-size:0.85em;opacity:0.6;';newEl.innerHTML=content;break;
            case'quote':newEl=document.createElement('blockquote');newEl.className='bp-quote ed-block';newEl.innerHTML='<p class="ed-editable" data-ed-original="">'+content+'</p>';break;
            case'whisper':newEl=document.createElement('p');newEl.className='whisper ed-editable ed-block';newEl.innerHTML=content;break;
            default:newEl=document.createElement('p');newEl.className='bp-text ed-editable ed-block';newEl.innerHTML=content;
        }
        newEl.setAttribute('data-ed-original','');
        newEl.dataset.isNew='true'; // mark as new element
        if(next)parent.insertBefore(newEl,next);else parent.appendChild(newEl);
        el.remove();
        setTimeout(function(){self.selectElement(newEl);},10);
        this.setStatus('Converted to '+newType);
    }

    processShortcodes(el){
        var text=el.textContent.trim();
        for(var i=0;i<this.shortcodes.length;i++){
            var sc=this.shortcodes[i];var m=text.match(sc.pattern);
            if(m){
                switch(sc.type){
                    case'heading':el.innerHTML=m[1];this.convertElementType(el,'heading');return true;
                    case'quote':el.innerHTML=m[1];this.convertElementType(el,'quote');return true;
                    case'divider':this.addDividerAfter(el);el.innerHTML='';el.remove();return true;
                    case'fancy':el.innerHTML=m[1];this.toggleFancyFontOnElement(el);return true;
                    case'link':el.innerHTML='<a href="'+m[2]+'" target="_blank" rel="noopener">'+m[1]+'</a>';return true;
                }
            }
        }
        return false;
    }

    toggleFancyFont(){
        var sel=window.getSelection();if(!sel.rangeCount)return;
        var range=sel.getRangeAt(0);
        if(range.collapsed){if(this.selectedEl)this.toggleFancyFontOnElement(this.selectedEl);return;}
        var span=document.createElement('span');span.className='fancy';span.style.fontFamily='var(--font-display),cursive';
        try{range.surroundContents(span);}catch(e){if(this.selectedEl)this.toggleFancyFontOnElement(this.selectedEl);}
    }

    toggleFancyFontOnElement(el){
        var had=el.classList.contains('fancy')||el.classList.contains('alt-font');
        el.classList.remove('fancy','alt-font','font-display');
        if(!had){el.classList.add('fancy');el.style.fontFamily='var(--font-display),cursive';}
        else el.style.fontFamily='';
        var fb=document.getElementById('edFmtFancy');if(fb)fb.classList.toggle('ed-fancy-active',!had);
        this.setStatus(had?'Fancy removed':'Fancy applied');
    }

    moveElement(el,dir){
        var movable=el.closest('.bp-figure,.bp-gallery-item,.bp-quote,.ed-divider,.ed-link-block')||el;
        if(dir==='up'&&movable.previousElementSibling){movable.parentElement.insertBefore(movable,movable.previousElementSibling);this.setStatus('Moved up');}
        else if(dir==='down'&&movable.nextElementSibling){movable.parentElement.insertBefore(movable.nextElementSibling,movable);this.setStatus('Moved down');}
        else this.setStatus('Cannot move '+dir);
        this.updateHighlight(el);
    }

    addDividerAfter(el){
        var d=document.createElement('div');d.className='ed-divider ed-block';
        d.style.cssText='width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;';
        el.parentElement.insertBefore(d,el.nextElementSibling);
    }

    // ══════════════════════════════════════════════════════════════
    // PROPS PANELS
    // ══════════════════════════════════════════════════════════════

    showImageProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML=
            '<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full" id="edReplaceImg">📁 Replace</button></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteImg">🗑️ Delete</button></div>';
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edReplaceImg').onclick=function(){
            self.fileInput.onchange=function(){
                if(this.files&&this.files[0]){
                    var r=new FileReader();
                    r.onload=function(e){self.pushUndo({el:el,type:'attr',attr:'src',value:el.src});el.src=e.target.result;self.setStatus('Image replaced');};
                    r.readAsDataURL(this.files[0]);
                }
            };self.fileInput.click();
        };
        document.getElementById('edDeleteImg').onclick=function(){self.deleteSelected();};
    }

    showBlockProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML=
            '<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edBlockUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edBlockDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edBlockDelete">🗑️ Delete</button></div>';
        document.getElementById('edBlockUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edBlockDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edBlockDelete').onclick=function(){self.deleteSelected();};
    }

    showStickerProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;var cz=el.dataset.z||'normal';
        panel.innerHTML=
            '<div class="ed-prop"><label>Size</label><input type="number" class="ed-prop-input" id="edStickerSize" value="'+(parseInt(el.style.width)||80)+'" min="20" max="500"></div>'+
            '<div class="ed-prop"><label>Rotation</label><input type="range" class="ed-prop-range" id="edStickerRot" min="-180" max="180" value="'+(parseInt(el.dataset.rotation)||0)+'"></div>'+
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edStickerOp" min="0" max="1" step="0.05" value="'+(el.style.opacity||1)+'"></div>'+
            '<div class="ed-prop"><label>Layer</label><select class="ed-prop-select" id="edStickerZ">'+
            ['behind','back','normal','above','top'].map(function(v){return'<option value="'+v+'" '+(cz===v?'selected':'')+'>'+v+'</option>';}).join('')+
            '</select></div>'+
            '<div class="ed-prop ed-layer-controls"><button class="ed-btn" id="edStickerFront">⬆️ Front</button><button class="ed-btn" id="edStickerBack">⬇️ Back</button></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edStickerDelete">🗑️ Delete</button></div>';
        document.getElementById('edStickerSize').oninput=function(){el.style.width=this.value+'px';el.style.height=this.value+'px';self.updateHighlight(el);};
        document.getElementById('edStickerRot').oninput=function(){el.dataset.rotation=this.value;el.style.transform='rotate('+this.value+'deg)';};
        document.getElementById('edStickerOp').oninput=function(){el.style.opacity=this.value;};
        document.getElementById('edStickerZ').onchange=function(){el.dataset.z=this.value;self.applyStickerZ(el,this.value);};
        document.getElementById('edStickerFront').onclick=function(){self.bringToFront(el);};
        document.getElementById('edStickerBack').onclick=function(){self.sendToBack(el);};
        document.getElementById('edStickerDelete').onclick=function(){self.deleteSelected();};
    }

    showDividerProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML=
            '<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><label>Width %</label><input type="range" class="ed-prop-range" id="edDivWidth" min="10" max="100" value="'+(parseInt(el.style.width)||100)+'"></div>'+
            '<div class="ed-prop"><label>Height px</label><input type="number" class="ed-prop-input" id="edDivHeight" min="1" max="20" value="'+(parseInt(el.style.height)||2)+'"></div>'+
            '<div class="ed-prop"><label>Margin px</label><input type="number" class="ed-prop-input" id="edDivMargin" min="0" max="100" value="'+(parseInt(el.style.marginTop)||20)+'"></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDivDelete">🗑️ Delete</button></div>';
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edDivWidth').oninput=function(){el.style.width=this.value+'%';};
        document.getElementById('edDivHeight').oninput=function(){el.style.height=this.value+'px';};
        document.getElementById('edDivMargin').oninput=function(){el.style.marginTop=this.value+'px';el.style.marginBottom=this.value+'px';};
        document.getElementById('edDivDelete').onclick=function(){self.deleteSelected();};
    }

    showLinkProps(el){
        var panel=document.getElementById('edPanelBody');var a=el.querySelector('a');var self=this;
        panel.innerHTML=
            '<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><label>Text</label><input type="text" class="ed-prop-input" id="edLinkText" value="'+(a?a.textContent:'')+'"></div>'+
            '<div class="ed-prop"><label>URL</label><input type="text" class="ed-prop-input" id="edLinkUrl" value="'+(a?a.href:'')+'"></div>'+
            '<div class="ed-prop"><label>Style</label><select class="ed-prop-select" id="edLinkStyle">'+
            '<option value="btn">Button</option><option value="btn-outline">Outline</option><option value="text">Text</option>'+
            '</select></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edLinkDelete">🗑️ Delete</button></div>';
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edLinkText').oninput=function(){if(a)a.textContent=this.value;};
        document.getElementById('edLinkUrl').oninput=function(){if(a)a.href=this.value;};
        document.getElementById('edLinkStyle').onchange=function(){if(a)a.className=this.value;};
        document.getElementById('edLinkDelete').onclick=function(){self.deleteSelected();};
    }

    applyStickerZ(el,level){var z={behind:-1,back:1,normal:10,above:100,top:1000};el.style.zIndex=z[level]||10;}

    bringToFront(el){
        var stickers=el.parentElement.querySelectorAll('.ed-sticker');var max=0;
        stickers.forEach(function(s){var z=parseInt(s.style.zIndex)||0;if(z>max)max=z;});
        el.style.zIndex=max+1;this.setStatus('Brought to front');
    }

    sendToBack(el){
        var stickers=el.parentElement.querySelectorAll('.ed-sticker');var min=9999;
        stickers.forEach(function(s){var z=parseInt(s.style.zIndex)||0;if(z<min)min=z;});
        el.style.zIndex=min-1;this.setStatus('Sent to back');
    }

    showContext(e,el){
        var isSt=el.classList.contains('ed-sticker');
        var isEd=el.classList.contains('ed-editable');
        var html='<button data-action="select">✏️ Edit</button><hr class="ed-ctx-sep">'+
            '<button data-action="moveup">⬆️ Up</button><button data-action="movedown">⬇️ Down</button>';
        if(isEd)html+='<hr class="ed-ctx-sep"><button data-action="fancy">✨ Fancy</button><button data-action="heading">📌 → Heading</button><button data-action="quote">💬 → Quote</button>';
        if(isSt)html+='<hr class="ed-ctx-sep"><button data-action="bringfront">⬆️ Front</button><button data-action="sendback">⬇️ Back</button>';
        html+='<hr class="ed-ctx-sep"><button data-action="delete" class="ed-ctx-danger">🗑️ Delete</button>';
        this.ctx.innerHTML=html;this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,innerWidth-200)+'px';
        this.ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';
        var self=this;
        this.ctx.querySelectorAll('button').forEach(function(btn){
            btn.onclick=function(){
                switch(btn.getAttribute('data-action')){
                    case'select':self.selectElement(el);break;
                    case'delete':self.selectedEl=el;self.deleteSelected();break;
                    case'moveup':self.moveElement(el,'up');break;
                    case'movedown':self.moveElement(el,'down');break;
                    case'bringfront':self.bringToFront(el);break;
                    case'sendback':self.sendToBack(el);break;
                    case'fancy':self.toggleFancyFontOnElement(el);break;
                    case'heading':self.convertElementType(el,'heading');break;
                    case'quote':self.convertElementType(el,'quote');break;
                }
                self.hideContext();
            };
        });
    }

    deleteSelected(){
        if(!this.selectedEl)return;
        var block=this.selectedEl.closest('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.ed-sticker,.ed-divider,.ed-link-block')||this.selectedEl;
        this.pushUndo({el:block.parentElement,type:'child',value:block.outerHTML,ref:block.nextElementSibling});
        block.remove();this.selectedEl=null;this.highlight.style.display='none';this.hideFormatBar();this.setStatus('Deleted');
    }

    // ══════════════════════════════════════════════════════════════
    // ADD ELEMENTS
    // ══════════════════════════════════════════════════════════════

    findInsertTarget(){
        var t=document.querySelector('.bproject.expanded .bproject-content');
        if(!t)this.setStatus('⚠️ Expand a project first');
        return t||null;
    }

    addImage(){
        var self=this,target=this.findInsertTarget();if(!target)return;
        this.fileInput.onchange=function(){
            if(!this.files||!this.files.length)return;
            var r=new FileReader();
            r.onload=function(e){
                var fig=document.createElement('figure');fig.className='bp-figure bp-img-full ed-block';
                fig.innerHTML='<img src="'+e.target.result+'" alt="" class="bp-img ed-interactive">';
                fig.dataset.isNew='true';
                target.appendChild(fig);self.setStatus('Image added');
            };r.readAsDataURL(this.files[0]);
        };this.fileInput.click();
    }

    addTextBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var p=document.createElement('p');p.className='bp-text ed-editable ed-block';p.textContent='Click to edit...';
        p.setAttribute('data-ed-original','');p.dataset.isNew='true';
        target.appendChild(p);this.selectElement(p);this.setStatus('Text added');
    }

    addHeading(){
        var target=this.findInsertTarget();if(!target)return;
        var h=document.createElement('h4');h.className='bp-heading ed-editable ed-block';h.textContent='New Heading';
        h.setAttribute('data-ed-original','');h.dataset.isNew='true';
        target.appendChild(h);this.selectElement(h);this.setStatus('Heading added');
    }

    addQuoteBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var q=document.createElement('blockquote');q.className='bp-quote ed-block';q.dataset.isNew='true';
        q.innerHTML='<p class="ed-editable" data-ed-original="">Quote...</p><cite class="ed-editable" data-ed-original="">— Author</cite>';
        target.appendChild(q);this.setStatus('Quote added');
    }

    addDivider(){
        var target=this.findInsertTarget();if(!target)return;
        var d=document.createElement('div');d.className='ed-divider ed-block';d.dataset.isNew='true';
        d.style.cssText='width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;';
        target.appendChild(d);this.selectElement(d);this.setStatus('Divider added');
    }

    addLinkBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var url=prompt('Enter URL:','https://');if(!url)return;
        var text=prompt('Button text:','Click Here');if(!text)return;
        var w=document.createElement('div');w.className='ed-link-block ed-block';w.style.cssText='margin:16px 0;';w.dataset.isNew='true';
        w.innerHTML='<a href="'+url+'" target="_blank" rel="noopener" class="btn">'+text+'</a>';
        target.appendChild(w);this.selectElement(w);this.setStatus('Link added');
    }

    addSticker(){
        var self=this;
        var expanded=document.querySelector('.bproject.expanded');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return;}
        var layer=expanded.querySelector('.bproject-stickers');
        if(!layer){layer=document.createElement('div');layer.className='bproject-stickers';expanded.appendChild(layer);}
        expanded.style.position='relative';
        this.fileInput.onchange=function(){
            if(this.files&&this.files[0]){
                var r=new FileReader();
                r.onload=function(e){
                    var s=document.createElement('div');
                    s.className='ed-sticker';s.dataset.rotation='0';s.dataset.z='normal';
                    s.dataset.projectId=expanded.dataset.projectId||'';
                    s.style.cssText='position:absolute;left:50px;top:150px;width:80px;height:80px;z-index:10;';
                    s.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:contain;"><button class="ed-sticker-delete">✕</button>';
                    layer.appendChild(s);
                    s.querySelector('.ed-sticker-delete').onclick=function(ev){ev.stopPropagation();s.remove();self.setStatus('Sticker removed');};
                    self.selectElement(s);self.setStatus('Sticker added');
                };r.readAsDataURL(this.files[0]);
            }
        };this.fileInput.click();
    }

    // ══════════════════════════════════════════════════════════════
    // UNDO
    // ══════════════════════════════════════════════════════════════

    pushUndo(item){this.undoStack.push(item);if(this.undoStack.length>50)this.undoStack.shift();}

    undo(){
        if(!this.undoStack.length){this.setStatus('Nothing to undo');return;}
        var item=this.undoStack.pop();
        if(item.type==='html')item.el.innerHTML=item.value;
        else if(item.type==='attr')item.el.setAttribute(item.attr,item.value);
        else if(item.type==='child'){
            var tmp=document.createElement('div');tmp.innerHTML=item.value;
            var r=tmp.firstChild;
            if(item.ref)item.el.insertBefore(r,item.ref);else item.el.appendChild(r);
        }
        this.setStatus('Undone');
    }

    // ══════════════════════════════════════════════════════════════
    // SELECTOR GENERATION
    // ══════════════════════════════════════════════════════════════

    stampContainer(container){
        var groups={};
        Array.from(container.children).forEach(function(child){
            var tag=child.tagName.toLowerCase();
            var mc='';
            for(var i=0;i<child.classList.length;i++){
                var c=child.classList[i];
                if(!c.startsWith('ed-')&&c!=='expanded'&&c!=='ed-selected'){mc=c;break;}
            }
            var key=mc?tag+'.'+mc:tag;
            if(!groups[key])groups[key]=[];
            groups[key].push(child);
        });
        Object.keys(groups).forEach(function(key){
            groups[key].forEach(function(el,idx){el.setAttribute('data-ed-idx',idx);});
        });
    }

    stampAllProjects(){
        var self=this;
        document.querySelectorAll('.bproject').forEach(function(project){
            project.querySelectorAll('.bproject-content,.bproject-header-text,.bproject-meta')
            .forEach(function(container){self.stampContainer(container);});
        });
    }

    getUniqueSelector(el){
        if(!el||el===document.body) return'body';
        if(el.id) return'#'+el.id;

        var project=el.closest('.bproject');
        if(project&&project.dataset.projectId){
            var pid=project.dataset.projectId;
            var base='[data-project-id="'+pid+'"]';
            var tag=el.tagName.toLowerCase();
            var mc='';
            for(var i=0;i<el.classList.length;i++){
                var c=el.classList[i];
                if(!c.startsWith('ed-')&&c!=='expanded'&&c!=='ed-selected'){mc=c;break;}
            }
            var elSel=mc?tag+'.'+mc:tag;
            var container=el.closest('.bproject-content,.bproject-header-text,.bproject-meta');
            if(container){
                var cc=container.className.split(' ')[0];
                var idx=el.getAttribute('data-ed-idx');
                if(idx!==null){
                    var siblings=container.querySelectorAll(elSel);
                    if(siblings.length>1) return base+' .'+cc+' '+elSel+'[data-ed-idx="'+idx+'"]';
                }
                return base+' .'+cc+' '+elSel;
            }
            return base+' '+elSel;
        }

        var path=[];var cur=el;
        while(cur&&cur!==document.body&&cur.nodeType===1){
            var s=cur.tagName.toLowerCase();
            if(cur.id){path.unshift('#'+cur.id);break;}
            for(var i=0;i<cur.classList.length;i++){
                var c=cur.classList[i];
                if(!c.startsWith('ed-')&&c!=='expanded'){s+='.'+c;break;}
            }
            path.unshift(s);cur=cur.parentElement;
            if(cur&&(cur.id||cur.classList.contains('zone-inner'))){if(cur.id)path.unshift('#'+cur.id);break;}
        }
        return path.join(' ');
    }

    // ══════════════════════════════════════════════════════════════
    // EXPORT — handles textChanges AND newElements correctly
    // ══════════════════════════════════════════════════════════════

    exportAmendment(){
        var self=this;
        var loaded=window.LOADED_AMENDMENTS||{stickers:{},textChanges:{},dividers:{},links:{},images:{},newElements:{}};

        // Stamp all projects first
        this.stampAllProjects();

        var amendment={
            _version:'3.2',
            _exported:new Date().toISOString(),
            projectOrder:null,
            textChanges:[],
            newElements:[],
            images:[],
            stickers:[],
            dividers:[],
            links:[]
        };

        // Project order
        var order=[];
        document.querySelectorAll('.basement-projects .bproject,.basement-projects [id^="bp-"]')
        .forEach(function(p){if(p.dataset.projectId)order.push(p.dataset.projectId);});
        if(loaded.projectOrder){
            if(JSON.stringify(order)!==JSON.stringify(loaded.projectOrder)) amendment.projectOrder=order;
        } else if(order.length){
            amendment.projectOrder=order;
        }

        // Separate new elements from text changes
        document.querySelectorAll('[data-ed-original]').forEach(function(el){
            var original=el.getAttribute('data-ed-original');
            var current=el.innerHTML;
            var isNew=el.dataset.isNew==='true'||el.closest('[data-is-new="true"]');

            if(isNew){
                // Export as newElement
                var projectEl=el.closest('.bproject');if(!projectEl)return;
                var container=el.closest('.bproject-content,.bproject-header-text,.bproject-meta');if(!container)return;
                var containerSel='.'+container.className.split(' ')[0];
                var children=Array.from(container.children);
                var insertIndex=children.indexOf(el);

                // Clean html — remove editor classes
                var tmp=document.createElement('div');tmp.innerHTML=el.outerHTML;
                var clone=tmp.firstChild;
                clone.removeAttribute('data-ed-original');
                clone.removeAttribute('data-is-new');
                clone.removeAttribute('data-ed-idx');
                ['ed-editable','ed-block','ed-selected','ed-interactive'].forEach(function(c){clone.classList.remove(c);});

                amendment.newElements.push({
                    projectId:projectEl.dataset.projectId,
                    container:containerSel,
                    insertIndex:insertIndex,
                    html:clone.outerHTML
                });
                return;
            }

            // Regular text change — only if different from original
            if(original===current)return;
            var selector=self.getUniqueSelector(el);
            var projectEl=el.closest('.bproject');
            amendment.textChanges.push({
                selector:selector,
                content:current,
                styles:el.getAttribute('style')||'',
                classes:el.className,
                projectId:projectEl?projectEl.dataset.projectId:null
            });
        });

        // Images (base64)
        document.querySelectorAll('img[src^="data:"]').forEach(function(img){
            var selector=self.getUniqueSelector(img);
            amendment.images.push({selector:selector,src:img.src,alt:img.alt||''});
        });

        // Stickers — new only
        document.querySelectorAll('.ed-sticker').forEach(function(s){
            if(s.dataset.amendmentLoaded==='true')return;
            var si=s.querySelector('img');
            var pc=s.closest('.bproject');
            var pid=pc?pc.dataset.projectId:'';
            amendment.stickers.push({
                projectId:pid,
                src:si?si.src:'',
                position:{left:s.style.left,top:s.style.top},
                size:{width:s.style.width,height:s.style.height},
                rotation:s.dataset.rotation||'0',
                zIndex:s.style.zIndex||'10',
                opacity:s.style.opacity||'1',
                layer:s.dataset.z||'normal'
            });
        });

        // Dividers — new only
        document.querySelectorAll('.ed-divider').forEach(function(d){
            if(d.dataset.amendmentLoaded==='true')return;
            amendment.dividers.push({
                parentSelector:self.getUniqueSelector(d.parentElement),
                styles:d.getAttribute('style')||''
            });
        });

        // Links — new only
        document.querySelectorAll('.ed-link-block').forEach(function(l){
            if(l.dataset.amendmentLoaded==='true')return;
            var a=l.querySelector('a');
            amendment.links.push({
                parentSelector:self.getUniqueSelector(l.parentElement),
                text:a?a.textContent:'',
                href:a?a.href:'#',
                className:a?a.className:'btn',
                target:a?a.target:'_blank'
            });
        });

        var total=amendment.textChanges.length+amendment.newElements.length+
            amendment.stickers.length+amendment.dividers.length+
            amendment.links.length+amendment.images.length+
            (amendment.projectOrder?1:0);

        if(total===0){this.setStatus('📭 No changes to export');return;}

        var now=new Date();
        var ts=now.toISOString().slice(0,10).replace(/-/g,'')+'-'+now.toISOString().slice(11,16).replace(':','');
        var filename='amendments-'+ts+'.json';

        var blob=new Blob([JSON.stringify(amendment,null,2)],{type:'application/json'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');a.href=url;a.download=filename;a.click();
        URL.revokeObjectURL(url);

        this.downloadUpdatedManifest(filename);
        this.setStatus('📄 Exported '+total+' changes → '+filename);
    }

    downloadUpdatedManifest(newFilename){
        var currentList=[];
        try{
            var xhr=new XMLHttpRequest();
            xhr.open('GET','./js/amendments/manifest.json',false);
            xhr.send(null);
            if(xhr.status===200) currentList=JSON.parse(xhr.responseText);
        }catch(e){}
        if(currentList.indexOf(newFilename)===-1) currentList.push(newFilename);
        currentList.sort();
        var blob=new Blob([JSON.stringify(currentList,null,2)],{type:'application/json'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');a.href=url;a.download='manifest.json';
        setTimeout(function(){a.click();URL.revokeObjectURL(url);},300);
        console.log('📋 Manifest:',currentList);
    }

    setStatus(msg){
        var s=document.getElementById('edStatus');
        if(s){s.textContent=msg;s.classList.add('ed-flash');setTimeout(function(){s.classList.remove('ed-flash');},300);}
    }
}

document.addEventListener('DOMContentLoaded',function(){window.liveEditor=new LiveEditor();});