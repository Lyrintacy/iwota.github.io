class LiveEditor{
    constructor(){
        this.active=false;this.selectedEl=null;this.undoStack=[];this.stickerDragging=null;this.stickerOffset={x:0,y:0};
        this.projectOrder=null;

        this.shortcodes=[
            {pattern:/^##\s*(.+)$/,type:'heading',desc:'## text → Heading'},
            {pattern:/^#(.+)#$/,type:'heading',desc:'#text# → Heading'},
            {pattern:/^>>>\s*(.+)$/,type:'quote',desc:'>>> text → Quote'},
            {pattern:/^---$/,type:'divider',desc:'--- → Divider'},
            {pattern:/^~~~\s*(.+)$/,type:'fancy',desc:'~~~ text → Fancy Font'},
            {pattern:/^\*\*\*\s*(.+)$/,type:'fancy',desc:'*** text → Fancy Font'},
            {pattern:/^\[(.+)\]\((.+)\)$/,type:'link',desc:'[text](url) → Link'}
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
            '.ed-project-item .ed-proj-btns button{padding:2px 6px;font-size:10px}';
        document.head.appendChild(s);

        this.buildUI();this.bindShortcut();
    }

    buildUI(){
        var toolbar=document.createElement('div');toolbar.id='editorToolbar';
        toolbar.innerHTML='<div class="ed-header"><span class="ed-title">☠ Live Editor</span><div class="ed-controls"><button class="ed-btn" id="edAddImage" title="Add Image">🖼️</button><button class="ed-btn" id="edAddText" title="Add Text">📝</button><button class="ed-btn" id="edAddHeading" title="Add Heading">📌</button><button class="ed-btn" id="edAddQuote" title="Add Quote">💬</button><button class="ed-btn" id="edAddDivider" title="Add Divider">➖</button><button class="ed-btn" id="edAddLink" title="Add Link/Button">🔗</button><button class="ed-btn" id="edAddSticker" title="Add Sticker">⭐</button><span class="ed-sep"></span><button class="ed-btn" id="edReorderProjects" title="Reorder Projects">📋</button><button class="ed-btn" id="edUndo" title="Undo">↩️</button><button class="ed-btn ed-amendment" id="edExportAmendment" title="Export Amendment">📄 Export</button><button class="ed-btn ed-close" id="edClose" title="Close">✕</button></div></div><div class="ed-status" id="edStatus">F2 to toggle • Click to edit • Right-click for menu</div>';
        document.body.appendChild(toolbar);

        var formatBar=document.createElement('div');formatBar.id='edFormatBar';
        formatBar.innerHTML='<button class="ed-fmt" data-cmd="bold" title="Bold"><strong>B</strong></button><button class="ed-fmt" data-cmd="italic" title="Italic"><em>I</em></button><button class="ed-fmt" data-cmd="underline" title="Underline"><u>U</u></button><span class="ed-fmt-sep">|</span><input type="color" class="ed-fmt-color" id="edFmtColor" value="#c084fc" title="Text Color"><select class="ed-fmt-select" id="edFmtSize" title="Font Size"><option value="">Size</option><option value="1">XS</option><option value="3">M</option><option value="5">L</option><option value="7">XL</option></select><button class="ed-fmt" data-cmd="createLink" title="Add Link">🔗</button><button class="ed-fmt" id="edFmtFancy" title="Fancy Font">✨</button><button class="ed-fmt" data-cmd="removeFormat" title="Clear">⌧</button>';
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
            if(e.key==='F2'){e.preventDefault();self.toggle();return false;}
            if(self.active){
                if(e.ctrlKey&&e.key==='z'){e.preventDefault();self.undo();}
                if(e.key==='Delete'&&self.selectedEl&&!self.selectedEl.isContentEditable)self.deleteSelected();
                if(e.key==='Escape'){self.deselectAll();self.hideContext();}
                if(e.altKey&&self.selectedEl){
                    if(e.key==='ArrowUp'){e.preventDefault();self.moveElement(self.selectedEl,'up');}
                    if(e.key==='ArrowDown'){e.preventDefault();self.moveElement(self.selectedEl,'down');}
                }
                if(e.key==='Enter'&&self.selectedEl&&self.selectedEl.isContentEditable){
                    var processed=self.processShortcodes(self.selectedEl);
                    if(processed){e.preventDefault();}
                }
            }
        });
    }

    toggle(){
        this.active=!this.active;document.body.classList.toggle('editor-active',this.active);
        this.toolbar.classList.toggle('ed-visible',this.active);this.panel.classList.toggle('ed-visible',this.active);
        if(this.active){this.enableEditing();this.setStatus('Editor active • F2 to close');}
        else{this.disableEditing();this.deselectAll();this.hideContext();this.hideFormatBar();}
    }

    enableEditing(){
        var self=this;
        this.markEditables();

        var images=document.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img,.pcard-thumb-img,.hero-photo,.rcard img');
        for(var i=0;i<images.length;i++)images[i].classList.add('ed-interactive');

        var blocks=document.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.bp-text,.bp-heading,.ed-divider,.ed-link-block');
        for(var i=0;i<blocks.length;i++)blocks[i].classList.add('ed-block');

        this._projectExpandObserver=new MutationObserver(function(mutations){
            mutations.forEach(function(mutation){
                if(mutation.type==='attributes'&&mutation.attributeName==='class'){
                    var target=mutation.target;
                    if(target.classList.contains('bproject')&&target.classList.contains('expanded')){
                        setTimeout(function(){
                            self.markEditables(target);
                        },100);
                    }
                }
            });
        });

        document.querySelectorAll('.bproject').forEach(function(project){
            self._projectExpandObserver.observe(project,{attributes:true,attributeFilter:['class']});
        });

        this._clickHandler=function(e){
            if(!self.active)return;
            var target=e.target;
            var projectCard=target.closest('.bproject');
            if(projectCard&&!projectCard.classList.contains('expanded')&&!target.closest('.ed-editable,.ed-interactive,.ed-sticker')){
                e.stopPropagation();self.selectProject(projectCard);return;
            }
            if(target.closest('.ed-sticker')){e.stopPropagation();self.selectElement(target.closest('.ed-sticker'));return;}
            if(target.closest('.ed-divider')){e.stopPropagation();self.selectElement(target.closest('.ed-divider'));return;}
            if(target.closest('.ed-link-block')){e.stopPropagation();e.preventDefault();self.selectElement(target.closest('.ed-link-block'));return;}
            if(target.closest('.ed-editable')){e.stopPropagation();self.selectElement(target.closest('.ed-editable'));return;}
            if(target.closest('.ed-interactive')){e.stopPropagation();self.selectElement(target.closest('.ed-interactive'));return;}
            if(target.closest('.ed-block')){e.stopPropagation();self.selectElement(target.closest('.ed-block'));return;}
            if(!target.closest('#editorPanel,#editorToolbar,#editorContext,#edFormatBar')){self.deselectAll();self.hideContext();}
        };
        document.addEventListener('click',this._clickHandler);

        this._contextHandler=function(e){
            if(!self.active)return;
            var projectCard=e.target.closest('.bproject');
            if(projectCard&&!projectCard.classList.contains('expanded')){e.preventDefault();self.showProjectContext(e,projectCard);return;}
            var target=e.target.closest('.ed-block,.ed-interactive,.ed-editable,.ed-sticker,.ed-divider,.ed-link-block');
            if(target){e.preventDefault();self.showContext(e,target);}
        };
        document.addEventListener('contextmenu',this._contextHandler);

        this._mousedownHandler=function(e){
            if(!self.active)return;
            var sticker=e.target.closest('.ed-sticker');
            if(sticker&&!e.target.closest('.ed-sticker-delete')){
                self.stickerDragging=sticker;var rect=sticker.getBoundingClientRect();
                self.stickerOffset.x=e.clientX-rect.left;self.stickerOffset.y=e.clientY-rect.top;
                sticker.classList.add('ed-sticker-dragging');e.preventDefault();
            }
        };
        this._mousemoveHandler=function(e){
            if(self.stickerDragging){
                var parent=self.stickerDragging.parentElement;var parentRect=parent.getBoundingClientRect();
                self.stickerDragging.style.left=(e.clientX-parentRect.left-self.stickerOffset.x)+'px';
                self.stickerDragging.style.top=(e.clientY-parentRect.top-self.stickerOffset.y)+'px';
            }
        };
        this._mouseupHandler=function(){if(self.stickerDragging){self.stickerDragging.classList.remove('ed-sticker-dragging');self.stickerDragging=null;}};
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

        var fmtBtns=this.formatBar.querySelectorAll('.ed-fmt[data-cmd]');
        for(var i=0;i<fmtBtns.length;i++){
            (function(btn){
                btn.addEventListener('mousedown',function(e){
                    e.preventDefault();
                    var cmd=btn.getAttribute('data-cmd');
                    if(cmd==='createLink'){var url=prompt('Enter URL:','https://');if(url)document.execCommand(cmd,false,url);}
                    else if(cmd){document.execCommand(cmd,false,null);}
                });
            })(fmtBtns[i]);
        }

        document.getElementById('edFmtFancy').addEventListener('mousedown',function(e){e.preventDefault();self.toggleFancyFont();});
        document.getElementById('edFmtColor').addEventListener('input',function(){document.execCommand('foreColor',false,this.value);});
        document.getElementById('edFmtSize').addEventListener('change',function(){if(this.value)document.execCommand('fontSize',false,this.value);this.value='';});
    }

    markEditables(container){
        var scope=container||document;
        var selector=[
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

        var editables=scope.querySelectorAll(selector);
        for(var i=0;i<editables.length;i++){
            var el=editables[i];
            if(!el.hasAttribute('data-ed-original')){
                el.setAttribute('data-ed-original',el.innerHTML);
                el.classList.add('ed-editable');
            }
        }

        if(container){
            var images=container.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img');
            for(var i=0;i<images.length;i++)images[i].classList.add('ed-interactive');
            var blocks=container.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-quote,.bp-text,.bp-heading');
            for(var i=0;i<blocks.length;i++)blocks[i].classList.add('ed-block');
        }
    }

    disableEditing(){
        var editables=document.querySelectorAll('.ed-editable');
        for(var i=0;i<editables.length;i++){editables[i].contentEditable='false';editables[i].classList.remove('ed-editable','ed-selected');}
        var interactives=document.querySelectorAll('.ed-interactive');
        for(var i=0;i<interactives.length;i++)interactives[i].classList.remove('ed-interactive','ed-selected');
        var blocks=document.querySelectorAll('.ed-block');
        for(var i=0;i<blocks.length;i++)blocks[i].classList.remove('ed-block','ed-selected');
        var selectedProjects=document.querySelectorAll('.ed-project-selected');
        for(var i=0;i<selectedProjects.length;i++)selectedProjects[i].classList.remove('ed-project-selected');
        if(this._clickHandler)document.removeEventListener('click',this._clickHandler);
        if(this._contextHandler)document.removeEventListener('contextmenu',this._contextHandler);
        if(this._mousedownHandler)document.removeEventListener('mousedown',this._mousedownHandler);
        if(this._mousemoveHandler)document.removeEventListener('mousemove',this._mousemoveHandler);
        if(this._mouseupHandler)document.removeEventListener('mouseup',this._mouseupHandler);
        if(this._projectExpandObserver){this._projectExpandObserver.disconnect();this._projectExpandObserver=null;}
    }

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
        var nameEl=projectEl.querySelector('.bproject-header-text h3, .pcard h3');
        var projectName=nameEl?nameEl.textContent:'Project';
        var projects=document.querySelectorAll('.bproject');
        var currentIndex=-1;
        for(var i=0;i<projects.length;i++){if(projects[i]===projectEl){currentIndex=i;break;}}
        var html='<div class="ed-prop"><label>Project</label><p style="margin:0;color:#c084fc;font-size:14px">'+projectName+'</p><small style="color:#666">ID: '+projectId+'</small></div>';
        html+='<div class="ed-prop"><label>Position ('+(currentIndex+1)+' of '+projects.length+')</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edProjMoveUp" '+(currentIndex===0?'disabled':'')+'>⬆️ Up</button>'+
            '<button class="ed-btn" id="edProjMoveDown" '+(currentIndex===projects.length-1?'disabled':'')+'>⬇️ Down</button>'+
            '</div></div>';
        html+='<div class="ed-prop"><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edProjMoveTop" '+(currentIndex===0?'disabled':'')+'>⏫ First</button>'+
            '<button class="ed-btn" id="edProjMoveLast" '+(currentIndex===projects.length-1?'disabled':'')+'>⏬ Last</button>'+
            '</div></div>';
        html+='<div class="ed-prop"><button class="ed-btn ed-full" id="edOpenReorder">📋 Reorder All Projects</button></div>';
        panel.innerHTML=html;
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
        var currentIndex=projects.indexOf(projectEl);
        switch(direction){
            case 'up':if(currentIndex>0)container.insertBefore(projectEl,projects[currentIndex-1]);break;
            case 'down':if(currentIndex<projects.length-1)container.insertBefore(projects[currentIndex+1],projectEl);break;
            case 'first':container.insertBefore(projectEl,projects[0]);break;
            case 'last':container.appendChild(projectEl);break;
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
        var html='<div class="ed-prop"><label>Drag to Reorder Projects</label></div><div class="ed-project-list" id="edProjectList">';
        for(var i=0;i<projects.length;i++){
            var proj=projects[i];
            var id=proj.dataset.projectId||'proj-'+i;
            var nameEl=proj.querySelector('.bproject-header-text h3, .pcard h3');
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
        var btns=panel.querySelectorAll('.ed-proj-btns button');
        for(var i=0;i<btns.length;i++){
            (function(btn){
                btn.onclick=function(e){e.stopPropagation();self.moveProjectInList(btn.closest('.ed-project-item'),btn.dataset.action);};
            })(btns[i]);
        }
        document.getElementById('edApplyOrder').onclick=function(){self.applyProjectListOrder();};
    }

    setupProjectListDragDrop(){
        var list=document.getElementById('edProjectList');if(!list)return;
        var self=this;var draggedItem=null;
        var items=list.querySelectorAll('.ed-project-item');
        for(var i=0;i<items.length;i++){
            (function(item){
                item.addEventListener('dragstart',function(e){draggedItem=item;item.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
                item.addEventListener('dragend',function(){item.classList.remove('dragging');draggedItem=null;self.updateProjectListNumbers();});
                item.addEventListener('dragover',function(e){
                    e.preventDefault();e.dataTransfer.dropEffect='move';
                    if(draggedItem&&draggedItem!==item){
                        var rect=item.getBoundingClientRect();
                        if(e.clientY<rect.top+rect.height/2)list.insertBefore(draggedItem,item);
                        else list.insertBefore(draggedItem,item.nextSibling);
                    }
                });
            })(items[i]);
        }
    }

    moveProjectInList(item,direction){
        var list=item.parentElement;
        var items=Array.from(list.querySelectorAll('.ed-project-item'));
        var index=items.indexOf(item);
        if(direction==='up'&&index>0)list.insertBefore(item,items[index-1]);
        else if(direction==='down'&&index<items.length-1)list.insertBefore(items[index+1],item);
        this.updateProjectListNumbers();
    }

    updateProjectListNumbers(){
        var items=document.querySelectorAll('#edProjectList .ed-project-item');
        for(var i=0;i<items.length;i++){
            var num=items[i].querySelector('.ed-proj-num');
            if(num)num.textContent=i+1;
            var upBtn=items[i].querySelector('[data-action="up"]');
            var downBtn=items[i].querySelector('[data-action="down"]');
            if(upBtn)upBtn.disabled=i===0;
            if(downBtn)downBtn.disabled=i===items.length-1;
        }
    }

    applyProjectListOrder(){
        var listItems=document.querySelectorAll('#edProjectList .ed-project-item');
        var projectContainer=document.querySelector('.bproject').parentElement;
        var newOrder=[];
        for(var i=0;i<listItems.length;i++)newOrder.push(listItems[i].dataset.projectId);
        for(var i=0;i<newOrder.length;i++){
            var projectEl=document.querySelector('.bproject[data-project-id="'+newOrder[i]+'"]');
            if(projectEl)projectContainer.appendChild(projectEl);
        }
        this.syncThumbnailOrder();
        this.projectOrder=newOrder;
        this.setStatus('Project order applied!');
        this.deselectAll();
    }

    getCurrentProjectOrder(){
        var projects=document.querySelectorAll('.bproject');
        var order=[];
        for(var i=0;i<projects.length;i++){var id=projects[i].dataset.projectId;if(id)order.push(id);}
        return order;
    }

    syncThumbnailOrder(){
        var thumbContainer=document.querySelector('.games-grid,.project-thumbs,.pcard-container,.basement-thumbs,.pgrid,#projectGrid');
        if(!thumbContainer)return;
        var projects=document.querySelectorAll('.bproject');
        for(var i=0;i<projects.length;i++){
            var projectId=projects[i].dataset.projectId;if(!projectId)continue;
            var thumb=thumbContainer.querySelector('[data-project-id="'+projectId+'"],[data-target="'+projectId+'"]');
            if(thumb)thumbContainer.appendChild(thumb);
        }
        this.setStatus('Thumbnails synced');
    }

    showProjectContext(e,projectEl){
        var projects=document.querySelectorAll('.bproject');
        var currentIndex=-1;
        for(var i=0;i<projects.length;i++){if(projects[i]===projectEl){currentIndex=i;break;}}
        var html='<button data-action="select">✏️ Edit Project</button><hr class="ed-ctx-sep">'+
            '<button data-action="moveup" '+(currentIndex===0?'disabled':'')+'>⬆️ Move Up</button>'+
            '<button data-action="movedown" '+(currentIndex===projects.length-1?'disabled':'')+'>⬇️ Move Down</button>'+
            '<button data-action="movefirst" '+(currentIndex===0?'disabled':'')+'>⏫ Move First</button>'+
            '<button data-action="movelast" '+(currentIndex===projects.length-1?'disabled':'')+'>⏬ Move Last</button>'+
            '<hr class="ed-ctx-sep"><button data-action="reorder">📋 Reorder All</button>';
        this.ctx.innerHTML=html;this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,innerWidth-200)+'px';
        this.ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';
        var self=this;
        this.ctx.querySelectorAll('button').forEach(function(btn){
            btn.onclick=function(){
                var action=btn.getAttribute('data-action');
                switch(action){
                    case 'select':self.selectProject(projectEl);break;
                    case 'moveup':self.moveProject(projectEl,'up');break;
                    case 'movedown':self.moveProject(projectEl,'down');break;
                    case 'movefirst':self.moveProject(projectEl,'first');break;
                    case 'movelast':self.moveProject(projectEl,'last');break;
                    case 'reorder':self.showProjectReorderPanel();break;
                }
                self.hideContext();
            };
        });
    }

    selectElement(el){
        this.deselectAll();
        document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
        this.selectedEl=el;el.classList.add('ed-selected');
        if(el.classList.contains('ed-editable')){el.contentEditable='true';el.focus();this.showFormatBar(el);this.showTextProps(el);}
        else if(el.tagName==='IMG'){this.hideFormatBar();this.showImageProps(el);}
        else if(el.classList.contains('ed-sticker')){this.hideFormatBar();this.showStickerProps(el);}
        else if(el.classList.contains('ed-divider')){this.hideFormatBar();this.showDividerProps(el);}
        else if(el.classList.contains('ed-link-block')){this.hideFormatBar();this.showLinkProps(el);}
        else{this.hideFormatBar();this.showBlockProps(el);}
        this.updateHighlight(el);
    }

   deselectAll(){
    if(this.selectedEl && this.selectedEl.classList && this.selectedEl.classList.contains('ed-editable')){
        this.selectedEl.contentEditable = 'false';
        var original = this.selectedEl.getAttribute('data-ed-original');
        if(original !== null && original !== this.selectedEl.innerHTML){
            this.pushUndo({el:this.selectedEl, type:'html', value:original});
            this.syncElementToThumbnail(this.selectedEl); // ← sync on deselect
        }
    }
    document.querySelectorAll('.ed-selected').forEach(function(el){el.classList.remove('ed-selected');});
    document.querySelectorAll('.ed-project-selected').forEach(function(el){el.classList.remove('ed-project-selected');});
    this.selectedEl = null;
    this.highlight.style.display = 'none';
    this.hideFormatBar();
    document.getElementById('edPanelBody').innerHTML = '<p class="ed-panel-hint">Select element to edit</p>';
}

syncElementToThumbnail(el){
    var projectEl = el.closest('.bproject');
    if(!projectEl) return;
    var projectId = projectEl.dataset.projectId;
    if(!projectId) return;

    var text = el.textContent || el.innerText || '';
    text = text.trim();

    // Find matching thumbnail card
    var thumb = document.querySelector(
        '#projectGrid [data-project-id="' + projectId + '"],' +
        '.pgrid [data-project-id="' + projectId + '"]'
    );
    if(!thumb) return;

    // Title — h3 inside .bproject-header-text
    if(el.closest('.bproject-header-text') && /^H[1-6]$/.test(el.tagName)){
        var h3 = thumb.querySelector('h3');
        if(h3){ h3.textContent = text; }
        var img = thumb.querySelector('.pcard-thumb-img');
        if(img) img.alt = text;
        this.updateProjectsArray(projectId, 'title', text);
        this.setStatus('✓ Title synced to thumbnail');
        return;
    }

    // Tagline → pcard-short
    if(el.classList.contains('bproject-tagline')){
        var shortEl = thumb.querySelector('.pcard-short');
        if(shortEl){ shortEl.textContent = text; }
        this.updateProjectsArray(projectId, 'tagline', text);
        this.updateProjectsArray(projectId, 'short', text);
        this.setStatus('✓ Tagline synced to thumbnail');
        return;
    }

    // Meta .bm-value → .pm-value (by index position)
    if(el.classList.contains('bm-value')){
        var allBmValues = Array.from(projectEl.querySelectorAll('.bm-value'));
        var allBmLabels = Array.from(projectEl.querySelectorAll('.bm-label'));
        var valueIndex = allBmValues.indexOf(el);
        if(valueIndex === -1) return;

        var labelText = allBmLabels[valueIndex]
            ? allBmLabels[valueIndex].textContent.toLowerCase().trim()
            : '';

        var pmValues = Array.from(thumb.querySelectorAll('.pm-value'));

        // pcard order: Role(0) Team(1) Engine(2) Timeline(3)
        if(labelText.includes('role')){
            if(pmValues[0]) pmValues[0].textContent = text;
            // fix tooltip
            var tRows = thumb.querySelectorAll('.pcard-tooltip-row');
            if(tRows[1]) tRows[1].lastChild.textContent = ' ' + text;
            this.updateProjectsArray(projectId, 'role', text);
            this.setStatus('✓ Role synced to thumbnail');
        }
        else if(labelText.includes('team')){
            if(pmValues[1]) pmValues[1].textContent = text;
            var tRows = thumb.querySelectorAll('.pcard-tooltip-row');
            if(tRows[2]) tRows[2].lastChild.textContent = ' ' + text;
            this.updateProjectsArray(projectId, 'team', text);
            this.setStatus('✓ Team synced to thumbnail');
        }
        else if(labelText.includes('engine')){
            if(pmValues[2]){
                var eIcon = pmValues[2].querySelector('.engine-icon');
                if(eIcon) eIcon.textContent = text;
                else pmValues[2].textContent = text;
            }
            this.updateProjectsArray(projectId, 'engine', text);
            this.setStatus('✓ Engine synced to thumbnail');
        }
        else if(labelText.includes('time')){
            if(pmValues[3]) pmValues[3].textContent = text;
            this.updateProjectsArray(projectId, 'timeframe', text);
            this.setStatus('✓ Timeline synced to thumbnail');
        }
    }
}

updateProjectsArray(projectId, field, value){
    if(typeof PROJECTS === 'undefined') return;
    for(var i = 0; i < PROJECTS.length; i++){
        if(PROJECTS[i].id === projectId){
            PROJECTS[i][field] = value;
            break;
        }
    }
}

    updateHighlight(el){
        var rect=el.getBoundingClientRect();
        this.highlight.style.display='block';
        this.highlight.style.top=(rect.top+window.scrollY-3)+'px';
        this.highlight.style.left=(rect.left-3)+'px';
        this.highlight.style.width=(rect.width+6)+'px';
        this.highlight.style.height=(rect.height+6)+'px';
    }

    showFormatBar(el){
        var rect=el.getBoundingClientRect();this.formatBar.classList.add('ed-visible');
        this.formatBar.style.top=Math.max(70,rect.top+window.scrollY-50)+'px';
        this.formatBar.style.left=Math.max(10,rect.left)+'px';
        var fancyBtn=document.getElementById('edFmtFancy');
        var isFancy=el.classList.contains('fancy')||el.classList.contains('alt-font')||el.classList.contains('font-display');
        fancyBtn.classList.toggle('ed-fancy-active',isFancy);
    }

    hideFormatBar(){this.formatBar.classList.remove('ed-visible');}
    hideContext(){this.ctx.style.display='none';}

    showTextProps(el){
        var panel=document.getElementById('edPanelBody');
        var cs=getComputedStyle(el);
        var currentType=this.getElementType(el);
        var isFancy=el.classList.contains('fancy')||el.classList.contains('alt-font')||el.classList.contains('font-display');
        var html='<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><label>Convert To</label><div class="ed-type-select">'+
            '<button class="ed-type-btn'+(currentType==='text'?' active':'')+'" data-type="text">Text</button>'+
            '<button class="ed-type-btn'+(currentType==='heading'?' active':'')+'" data-type="heading">Heading</button>'+
            '<button class="ed-type-btn'+(currentType==='subheading'?' active':'')+'" data-type="subheading">Subhead</button>'+
            '<button class="ed-type-btn'+(currentType==='caption'?' active':'')+'" data-type="caption">Caption</button>'+
            '<button class="ed-type-btn'+(currentType==='quote'?' active':'')+'" data-type="quote">Quote</button>'+
            '<button class="ed-type-btn'+(currentType==='whisper'?' active':'')+'" data-type="whisper">Whisper</button>'+
            '</div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full'+(isFancy?' ed-fancy-active':'')+'" id="edToggleFancy">✨ '+(isFancy?'Remove':'Apply')+' Fancy Font</button></div>'+
            '<div class="ed-prop"><label>Font Size</label><input type="number" class="ed-prop-input" id="edPropFS" value="'+parseInt(cs.fontSize)+'" min="8" max="120"></div>'+
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edPropOp" min="0" max="1" step="0.05" value="'+(cs.opacity||1)+'"></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteText">🗑️ Delete</button></div>'+
            '<div class="ed-shortcode-hint"><strong>Quick codes:</strong><br>'+
            '<code>## text</code> → Heading<br><code>>>> text</code> → Quote<br>'+
            '<code>~~~ text</code> → Fancy<br><code>---</code> → Divider<br>'+
            '<small>Type code + Enter</small></div>';
        panel.innerHTML=html;
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
        var tag=el.tagName.toLowerCase();var cls=el.className;
        if(tag==='h1'||tag==='h2'||tag==='h3'||tag==='h4'||cls.includes('heading')||cls.includes('section-title'))return'heading';
        if(cls.includes('sub')||cls.includes('tagline'))return'subheading';
        if(cls.includes('caption'))return'caption';
        if(tag==='blockquote'||cls.includes('quote'))return'quote';
        if(cls.includes('whisper'))return'whisper';
        return'text';
    }

    convertElementType(el,newType){
        var self=this;var content=el.innerHTML;var parent=el.parentElement;var nextSib=el.nextElementSibling;var newEl;
        this.pushUndo({el:parent,type:'child',value:el.outerHTML,ref:nextSib});
        switch(newType){
            case'heading':newEl=document.createElement('h4');newEl.className='bp-heading ed-editable ed-block';newEl.innerHTML=content;break;
            case'subheading':newEl=document.createElement('p');newEl.className='bp-caption ed-editable ed-block';newEl.style.cssText='font-size:1.1em;opacity:0.8;';newEl.innerHTML=content;break;
            case'caption':newEl=document.createElement('p');newEl.className='bp-caption ed-editable ed-block';newEl.style.cssText='font-size:0.85em;opacity:0.6;';newEl.innerHTML=content;break;
            case'quote':newEl=document.createElement('blockquote');newEl.className='bp-quote ed-block';newEl.innerHTML='<p class="ed-editable" data-ed-original="">'+content+'</p>';break;
            case'whisper':newEl=document.createElement('p');newEl.className='whisper ed-editable ed-block';newEl.innerHTML=content;break;
            default:newEl=document.createElement('p');newEl.className='bp-text ed-editable ed-block';newEl.innerHTML=content;
        }
        newEl.setAttribute('data-ed-original','');
        if(nextSib)parent.insertBefore(newEl,nextSib);else parent.appendChild(newEl);
        el.remove();
        setTimeout(function(){self.selectElement(newEl);},10);
        this.setStatus('Converted to '+newType);
    }

    processShortcodes(el){
        var text=el.textContent.trim();
        for(var i=0;i<this.shortcodes.length;i++){
            var sc=this.shortcodes[i];var match=text.match(sc.pattern);
            if(match){
                switch(sc.type){
                    case'heading':el.innerHTML=match[1];this.convertElementType(el,'heading');return true;
                    case'quote':el.innerHTML=match[1];this.convertElementType(el,'quote');return true;
                    case'divider':this.addDividerAfter(el);el.innerHTML='';el.remove();return true;
                    case'fancy':el.innerHTML=match[1];this.toggleFancyFontOnElement(el);return true;
                    case'link':el.innerHTML='<a href="'+match[2]+'" target="_blank" rel="noopener">'+match[1]+'</a>';return true;
                }
            }
        }
        return false;
    }

    toggleFancyFont(){
        var sel=window.getSelection();if(!sel.rangeCount)return;
        var range=sel.getRangeAt(0);
        if(range.collapsed){if(this.selectedEl)this.toggleFancyFontOnElement(this.selectedEl);return;}
        var span=document.createElement('span');span.className='fancy';span.style.fontFamily='var(--font-display), cursive';
        try{range.surroundContents(span);}catch(e){if(this.selectedEl)this.toggleFancyFontOnElement(this.selectedEl);}
        this.setStatus('Fancy font applied');
    }

    toggleFancyFontOnElement(el){
        var fancyClasses=['fancy','alt-font','font-display'];var hasFancy=false;
        for(var i=0;i<fancyClasses.length;i++){if(el.classList.contains(fancyClasses[i])){hasFancy=true;el.classList.remove(fancyClasses[i]);}}
        if(!hasFancy){el.classList.add('fancy');el.style.fontFamily='var(--font-display), cursive';this.setStatus('Fancy font applied');}
        else{el.style.fontFamily='';this.setStatus('Fancy font removed');}
        var fancyBtn=document.getElementById('edFmtFancy');
        if(fancyBtn)fancyBtn.classList.toggle('ed-fancy-active',!hasFancy);
    }

    moveElement(el,dir){
        var movable=el.closest('.bp-figure,.bp-gallery-item,.bp-quote,.ed-divider,.ed-link-block')||el;
        if(dir==='up'&&movable.previousElementSibling){movable.parentElement.insertBefore(movable,movable.previousElementSibling);this.setStatus('Moved up');}
        else if(dir==='down'&&movable.nextElementSibling){movable.parentElement.insertBefore(movable.nextElementSibling,movable);this.setStatus('Moved down');}
        else{this.setStatus('Cannot move '+dir);}
        this.updateHighlight(el);
    }

    addDividerAfter(el){
        var divider=document.createElement('div');divider.className='ed-divider ed-block';
        divider.style.cssText='width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;';
        el.parentElement.insertBefore(divider,el.nextElementSibling);this.setStatus('Divider added');
    }

    showImageProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML='<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full" id="edReplaceImg">📁 Replace</button></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteImg">🗑️ Delete</button></div>';
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edReplaceImg').onclick=function(){
            self.fileInput.onchange=function(){
                if(this.files&&this.files[0]){
                    var reader=new FileReader();
                    reader.onload=function(e){self.pushUndo({el:el,type:'attr',attr:'src',value:el.src});el.src=e.target.result;self.setStatus('Image replaced');};
                    reader.readAsDataURL(this.files[0]);
                }
            };self.fileInput.click();
        };
        document.getElementById('edDeleteImg').onclick=function(){self.deleteSelected();};
    }

    showBlockProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML='<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edBlockUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edBlockDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edBlockDelete">🗑️ Delete</button></div>';
        document.getElementById('edBlockUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edBlockDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edBlockDelete').onclick=function(){self.deleteSelected();};
    }

    showStickerProps(el){
        var panel=document.getElementById('edPanelBody');var currentZ=el.dataset.z||'normal';var self=this;
        panel.innerHTML='<div class="ed-prop"><label>Size</label><input type="number" class="ed-prop-input" id="edStickerSize" value="'+(parseInt(el.style.width)||80)+'" min="20" max="500"></div>'+
            '<div class="ed-prop"><label>Rotation</label><input type="range" class="ed-prop-range" id="edStickerRot" min="-180" max="180" value="'+(parseInt(el.dataset.rotation)||0)+'"></div>'+
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edStickerOp" min="0" max="1" step="0.05" value="'+(el.style.opacity||1)+'"></div>'+
            '<div class="ed-prop"><label>Layer</label><select class="ed-prop-select" id="edStickerZ">'+
            '<option value="behind" '+(currentZ==='behind'?'selected':'')+'>Behind</option>'+
            '<option value="back" '+(currentZ==='back'?'selected':'')+'>Back</option>'+
            '<option value="normal" '+(currentZ==='normal'?'selected':'')+'>Normal</option>'+
            '<option value="above" '+(currentZ==='above'?'selected':'')+'>Above</option>'+
            '<option value="top" '+(currentZ==='top'?'selected':'')+'>Top</option>'+
            '</select></div>'+
            '<div class="ed-prop ed-layer-controls"><button class="ed-btn" id="edStickerBringFront">⬆️ Front</button><button class="ed-btn" id="edStickerSendBack">⬇️ Back</button></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edStickerDelete">🗑️ Delete</button></div>';
        document.getElementById('edStickerSize').oninput=function(){el.style.width=this.value+'px';el.style.height=this.value+'px';self.updateHighlight(el);};
        document.getElementById('edStickerRot').oninput=function(){el.dataset.rotation=this.value;el.style.transform='rotate('+this.value+'deg)';};
        document.getElementById('edStickerOp').oninput=function(){el.style.opacity=this.value;};
        document.getElementById('edStickerZ').onchange=function(){el.dataset.z=this.value;self.applyStickerZ(el,this.value);};
        document.getElementById('edStickerBringFront').onclick=function(){self.bringToFront(el);};
        document.getElementById('edStickerSendBack').onclick=function(){self.sendToBack(el);};
        document.getElementById('edStickerDelete').onclick=function(){self.deleteSelected();};
    }

    showDividerProps(el){
        var panel=document.getElementById('edPanelBody');var self=this;
        panel.innerHTML='<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
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
        var panel=document.getElementById('edPanelBody');var link=el.querySelector('a');var self=this;
        panel.innerHTML='<div class="ed-prop"><label>Position</label><div class="ed-move-controls">'+
            '<button class="ed-btn" id="edMoveUp">⬆️ Up</button>'+
            '<button class="ed-btn" id="edMoveDown">⬇️ Down</button></div></div>'+
            '<div class="ed-prop"><label>Text</label><input type="text" class="ed-prop-input" id="edLinkText" value="'+(link?link.textContent:'Link')+'"></div>'+
            '<div class="ed-prop"><label>URL</label><input type="text" class="ed-prop-input" id="edLinkUrl" value="'+(link?link.href:'#')+'"></div>'+
            '<div class="ed-prop"><label>Style</label><select class="ed-prop-select" id="edLinkStyle">'+
            '<option value="btn">Button</option><option value="btn-outline">Outline</option><option value="text">Text</option>'+
            '</select></div>'+
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edLinkDelete">🗑️ Delete</button></div>';
        document.getElementById('edMoveUp').onclick=function(){self.moveElement(el,'up');};
        document.getElementById('edMoveDown').onclick=function(){self.moveElement(el,'down');};
        document.getElementById('edLinkText').oninput=function(){if(link)link.textContent=this.value;};
        document.getElementById('edLinkUrl').oninput=function(){if(link)link.href=this.value;};
        document.getElementById('edLinkStyle').onchange=function(){if(link)link.className=this.value;};
        document.getElementById('edLinkDelete').onclick=function(){self.deleteSelected();};
    }

    applyStickerZ(el,level){var z={behind:-1,back:1,normal:10,above:100,top:1000};el.style.zIndex=z[level]||10;}

    bringToFront(el){
        var stickers=el.parentElement.querySelectorAll('.ed-sticker');var maxZ=0;
        for(var i=0;i<stickers.length;i++){var z=parseInt(stickers[i].style.zIndex)||0;if(z>maxZ)maxZ=z;}
        el.style.zIndex=maxZ+1;this.setStatus('Brought to front');
    }

    sendToBack(el){
        var stickers=el.parentElement.querySelectorAll('.ed-sticker');var minZ=9999;
        for(var i=0;i<stickers.length;i++){var z=parseInt(stickers[i].style.zIndex)||0;if(z<minZ)minZ=z;}
        el.style.zIndex=minZ-1;this.setStatus('Sent to back');
    }

    showContext(e,el){
        var isSticker=el.classList.contains('ed-sticker');
        var isEditable=el.classList.contains('ed-editable');
        var html='<button data-action="select">✏️ Edit</button><hr class="ed-ctx-sep">'+
            '<button data-action="moveup">⬆️ Move Up</button><button data-action="movedown">⬇️ Move Down</button>';
        if(isEditable)html+='<hr class="ed-ctx-sep"><button data-action="fancy">✨ Fancy Font</button><button data-action="heading">📌 → Heading</button><button data-action="quote">💬 → Quote</button>';
        if(isSticker)html+='<hr class="ed-ctx-sep"><button data-action="bringfront">⬆️ Bring Front</button><button data-action="sendback">⬇️ Send Back</button>';
        html+='<hr class="ed-ctx-sep"><button data-action="delete" class="ed-ctx-danger">🗑️ Delete</button>';
        this.ctx.innerHTML=html;this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,innerWidth-200)+'px';
        this.ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';
        var self=this;
        this.ctx.querySelectorAll('button').forEach(function(btn){
            btn.onclick=function(){
                var action=btn.getAttribute('data-action');
                switch(action){
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

    findInsertTarget(){
        var expanded=document.querySelector('.bproject.expanded .bproject-content');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return null;}
        return expanded;
    }

    addImage(){
        var self=this,target=this.findInsertTarget();if(!target)return;
        this.fileInput.onchange=function(){
            if(!this.files||!this.files.length)return;
            var reader=new FileReader();
            reader.onload=function(e){
                var figure=document.createElement('figure');figure.className='bp-figure bp-img-full ed-block';
                figure.innerHTML='<img src="'+e.target.result+'" alt="" class="bp-img ed-interactive">';
                target.appendChild(figure);self.setStatus('Image added');
            };reader.readAsDataURL(this.files[0]);
        };this.fileInput.click();
    }

    addTextBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var p=document.createElement('p');p.className='bp-text ed-editable ed-block';p.textContent='Click to edit...';p.setAttribute('data-ed-original','');
        target.appendChild(p);this.selectElement(p);this.setStatus('Text added');
    }

    addHeading(){
        var target=this.findInsertTarget();if(!target)return;
        var h=document.createElement('h4');h.className='bp-heading ed-editable ed-block';h.textContent='New Heading';h.setAttribute('data-ed-original','');
        target.appendChild(h);this.selectElement(h);this.setStatus('Heading added');
    }

    addQuoteBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var quote=document.createElement('blockquote');quote.className='bp-quote ed-block';
        quote.innerHTML='<p class="ed-editable" data-ed-original="">Quote...</p><cite class="ed-editable" data-ed-original="">— Author</cite>';
        target.appendChild(quote);this.setStatus('Quote added');
    }

    addDivider(){
        var target=this.findInsertTarget();if(!target)return;
        var divider=document.createElement('div');divider.className='ed-divider ed-block';
        divider.style.cssText='width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;';
        target.appendChild(divider);this.selectElement(divider);this.setStatus('Divider added');
    }

    addLinkBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var url=prompt('Enter URL:','https://');if(!url)return;
        var text=prompt('Button text:','Click Here');if(!text)return;
        var wrapper=document.createElement('div');wrapper.className='ed-link-block ed-block';wrapper.style.cssText='margin:16px 0;';
        wrapper.innerHTML='<a href="'+url+'" target="_blank" rel="noopener" class="btn">'+text+'</a>';
        target.appendChild(wrapper);this.selectElement(wrapper);this.setStatus('Link added');
    }

    addSticker(){
        var self=this;
        var expanded=document.querySelector('.bproject.expanded');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return;}
        var stickerLayer=expanded.querySelector('.bproject-stickers');
        if(!stickerLayer){
            stickerLayer=document.createElement('div');stickerLayer.className='bproject-stickers';
            expanded.appendChild(stickerLayer);
        }
        expanded.style.position='relative';
        this.fileInput.onchange=function(){
            if(this.files&&this.files[0]){
                var reader=new FileReader();
                reader.onload=function(e){
                    var sticker=document.createElement('div');
                    sticker.className='ed-sticker';
                    sticker.dataset.rotation='0';
                    sticker.dataset.z='normal';
                    sticker.dataset.projectId=expanded.dataset.projectId||'';
                    sticker.style.cssText='position:absolute;left:50px;top:150px;width:80px;height:80px;z-index:10;';
                    sticker.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:contain;"><button class="ed-sticker-delete">✕</button>';
                    stickerLayer.appendChild(sticker);
                    sticker.querySelector('.ed-sticker-delete').onclick=function(ev){ev.stopPropagation();sticker.remove();self.setStatus('Sticker removed');};
                    self.selectElement(sticker);self.setStatus('Sticker added');
                };reader.readAsDataURL(this.files[0]);
            }
        };this.fileInput.click();
    }

    pushUndo(item){this.undoStack.push(item);if(this.undoStack.length>50)this.undoStack.shift();}

    undo(){
        if(!this.undoStack.length){this.setStatus('Nothing to undo');return;}
        var item=this.undoStack.pop();
        if(item.type==='html')item.el.innerHTML=item.value;
        else if(item.type==='attr')item.el.setAttribute(item.attr,item.value);
        else if(item.type==='child'){
            var temp=document.createElement('div');temp.innerHTML=item.value;
            var restored=temp.firstChild;
            if(item.ref)item.el.insertBefore(restored,item.ref);
            else item.el.appendChild(restored);
        }
        this.setStatus('Undone');
    }

    // ══════════════════════════════════════════════════════════════
    // FIXED: getUniqueSelector — uses nth-child index, not nth-of-type
    // ══════════════════════════════════════════════════════════════
    getUniqueSelector(el){
        if(!el||el===document.body)return'body';
        if(el.id)return'#'+el.id;

        var project=el.closest('.bproject');
        if(project&&project.dataset.projectId){
            var projectId=project.dataset.projectId;
            var base='[data-project-id="'+projectId+'"]';
            var tag=el.tagName.toLowerCase();

            // Get first meaningful class (skip ed- classes)
            var mainClass='';
            for(var i=0;i<el.classList.length;i++){
                var c=el.classList[i];
                if(!c.startsWith('ed-')&&c!=='expanded'&&c!=='ed-selected'){
                    mainClass=c;break;
                }
            }

            var elSelector=mainClass?tag+'.'+mainClass:tag;

            // Find which container it's in
            var container=el.closest('.bproject-content,.bproject-header-text,.bproject-meta');
            if(container){
                var containerClass=container.className.split(' ')[0];

                // ── KEY FIX: use position among same tag+class siblings ──
                var siblings=Array.from(container.querySelectorAll(elSelector));
                var index=siblings.indexOf(el);

                if(siblings.length>1){
                    // Store index as data attribute for reliable re-finding
                    return base+' .'+containerClass+' '+elSelector+'[data-ed-idx="'+index+'"]';
                }
                return base+' .'+containerClass+' '+elSelector;
            }

            return base+' '+elSelector;
        }

        // Non-project elements: build path up the DOM
        var path=[];var current=el;
        while(current&&current!==document.body&&current.nodeType===1){
            var sel=current.tagName.toLowerCase();
            if(current.id){path.unshift('#'+current.id);break;}
            for(var i=0;i<current.classList.length;i++){
                var c=current.classList[i];
                if(!c.startsWith('ed-')&&c!=='expanded'){sel+='.'+c;break;}
            }
            path.unshift(sel);
            current=current.parentElement;
            if(current&&(current.id||current.classList.contains('zone-inner'))){
                if(current.id)path.unshift('#'+current.id);
                break;
            }
        }
        return path.join(' ');
    }

    // ══════════════════════════════════════════════════════════════
    // FIXED: exportAmendment — stamps data-ed-idx on elements before export
    // ══════════════════════════════════════════════════════════════
    exportAmendment(){
    var self = this;
    var loaded = window.LOADED_AMENDMENTS || {stickers:{}, textChanges:{}, dividers:{}, links:{}, images:{}};

    document.querySelectorAll('.bproject').forEach(function(project){
        var projectId = project.dataset.projectId;
        if(!projectId) return;
        project.querySelectorAll('.bproject-content,.bproject-header-text,.bproject-meta')
        .forEach(function(container){
            var groups = {};
            Array.from(container.children).forEach(function(child){
                var tag = child.tagName.toLowerCase();
                var mainClass = '';
                for(var i = 0; i < child.classList.length; i++){
                    var c = child.classList[i];
                    if(!c.startsWith('ed-') && c !== 'expanded' && c !== 'ed-selected'){
                        mainClass = c; break;
                    }
                }
                var key = mainClass ? tag+'.'+mainClass : tag;
                if(!groups[key]) groups[key] = [];
                groups[key].push(child);
            });
            Object.keys(groups).forEach(function(key){
                groups[key].forEach(function(el, idx){
                    el.setAttribute('data-ed-idx', idx);
                });
            });
        });
    });

    var amendment = {
        _version: '3.1',
        _exported: new Date().toISOString(),
        projectOrder: null,
        textChanges: [],
        images: [],
        stickers: [],
        dividers: [],
        links: []
    };

    var currentProjectOrder = [];
    document.querySelectorAll('.basement-projects .bproject').forEach(function(p){
        if(p.dataset.projectId) currentProjectOrder.push(p.dataset.projectId);
    });
    if(loaded.projectOrder){
        if(JSON.stringify(currentProjectOrder) !== JSON.stringify(loaded.projectOrder))
            amendment.projectOrder = currentProjectOrder;
    } else if(currentProjectOrder.length){
        amendment.projectOrder = currentProjectOrder;
    }

    document.querySelectorAll('[data-ed-original]').forEach(function(el){
        var original = el.getAttribute('data-ed-original');
        var current = el.innerHTML;
        if(original === current) return;
        var selector = self.getUniqueSelector(el);
        var loadedChange = loaded.textChanges ? loaded.textChanges[selector] : null;
        if(loadedChange && loadedChange.content === current) return;
        var projectEl = el.closest('.bproject');
        amendment.textChanges.push({
            selector: selector,
            content: current,
            styles: el.getAttribute('style') || '',
            classes: el.className,
            projectId: projectEl ? projectEl.dataset.projectId : null
        });
    });

    document.querySelectorAll('img[src^="data:"]').forEach(function(img){
        var selector = self.getUniqueSelector(img);
        var loadedImg = loaded.images ? loaded.images[selector] : null;
        if(!loadedImg || loadedImg.src !== img.src){
            amendment.images.push({selector:selector, src:img.src, alt:img.alt||''});
        }
    });

    document.querySelectorAll('.ed-sticker').forEach(function(s){
        if(s.dataset.amendmentLoaded === 'true') return;
        var sImg = s.querySelector('img');
        var projectCard = s.closest('.bproject');
        var projectId = projectCard ? projectCard.dataset.projectId : '';
        var key = (projectId||'global')+'|'+(s.style.left||'0')+'|'+(s.style.top||'0');
        if(!loaded.stickers || !loaded.stickers[key]){
            amendment.stickers.push({
                projectId: projectId,
                src: sImg ? sImg.src : '',
                position: {left:s.style.left, top:s.style.top},
                size: {width:s.style.width, height:s.style.height},
                rotation: s.dataset.rotation || '0',
                zIndex: s.style.zIndex || '10',
                opacity: s.style.opacity || '1',
                layer: s.dataset.z || 'normal'
            });
        }
    });

    document.querySelectorAll('.ed-divider').forEach(function(d){
        if(d.dataset.amendmentLoaded === 'true') return;
        amendment.dividers.push({
            parentSelector: self.getUniqueSelector(d.parentElement),
            styles: d.getAttribute('style') || ''
        });
    });

    document.querySelectorAll('.ed-link-block').forEach(function(l){
        if(l.dataset.amendmentLoaded === 'true') return;
        var a = l.querySelector('a');
        amendment.links.push({
            parentSelector: self.getUniqueSelector(l.parentElement),
            text: a ? a.textContent : '',
            href: a ? a.href : '#',
            className: a ? a.className : 'btn',
            target: a ? a.target : '_blank'
        });
    });

    var total = amendment.textChanges.length + amendment.stickers.length +
        amendment.dividers.length + amendment.links.length + amendment.images.length +
        (amendment.projectOrder ? 1 : 0);

    if(total === 0){ this.setStatus('📭 No new changes to export'); return; }

    var now = new Date();
    var timestamp = now.toISOString().slice(0,10).replace(/-/g,'') + '-' +
                    now.toISOString().slice(11,16).replace(':','');
    var filename = 'amendments-' + timestamp + '.json';

    var content = JSON.stringify(amendment, null, 2);
    var blob = new Blob([content], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    this.downloadUpdatedManifest(filename);
    this.setStatus('📄 Exported ' + total + ' changes → ' + filename);
}

downloadUpdatedManifest(newFilename){
    var currentList = [];
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', './js/amendments/manifest.json', false);
        xhr.send(null);
        if(xhr.status === 200){
            currentList = JSON.parse(xhr.responseText);
        }
    } catch(e){}

    if(currentList.indexOf(newFilename) === -1){
        currentList.push(newFilename);
    }

    currentList.sort();

    var blob = new Blob(
        [JSON.stringify(currentList, null, 2)],
        {type: 'application/json'}
    );
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';

    setTimeout(function(){
        a.click();
        URL.revokeObjectURL(url);
    }, 300);

    console.log('📋 Manifest updated with:', newFilename);
    console.log('📋 Full manifest:', currentList);
}

downloadUpdatedManifest(newFilename){
    // Try to read current manifest first
    var currentList = [];
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', './js/amendments/manifest.json', false);
        xhr.send(null);
        if(xhr.status === 200){
            currentList = JSON.parse(xhr.responseText);
        }
    } catch(e){}

    // Add new file if not already in list
    if(currentList.indexOf(newFilename) === -1){
        currentList.push(newFilename);
    }

    // Sort so older files load first, newer last
    currentList.sort();

    // Download updated manifest
    var blob = new Blob(
        [JSON.stringify(currentList, null, 2)],
        {type: 'application/json'}
    );
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';

    // Small delay so both downloads don't clash
    setTimeout(function(){
        a.click();
        URL.revokeObjectURL(url);
    }, 300);

    console.log('📋 Manifest updated with:', newFilename);
    console.log('📋 Full manifest:', currentList);
}
    setStatus(msg){
        var s=document.getElementById('edStatus');
        if(s){s.textContent=msg;s.classList.add('ed-flash');setTimeout(function(){s.classList.remove('ed-flash');},300);}
    }
}

document.addEventListener('DOMContentLoaded',function(){window.liveEditor=new LiveEditor();});