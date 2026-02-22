class LiveEditor{
    constructor(){
    this.active=false;this.selectedEl=null;this.undoStack=[];this.stickerDragging=null;this.stickerOffset={x:0,y:0};

    var s=document.createElement('style');
    s.textContent=
        '.bproject-stickers,.ed-sticker,.ed-sticker *{pointer-events:none!important}'+
        '.ed-sticker-delete{display:none}'+
        '.editor-active .bproject-stickers,.editor-active .ed-sticker,.editor-active .ed-sticker *{pointer-events:auto!important}'+
        '.editor-active .ed-sticker-delete{display:block}';
    document.head.appendChild(s);

    this.buildUI();this.bindShortcut();
}
    buildUI(){
        var toolbar=document.createElement('div');toolbar.id='editorToolbar';
        toolbar.innerHTML='<div class="ed-header"><span class="ed-title">☠ Live Editor</span><div class="ed-controls"><button class="ed-btn" id="edAddImage" title="Add Image">🖼️</button><button class="ed-btn" id="edAddText" title="Add Text">📝</button><button class="ed-btn" id="edAddHeading" title="Add Heading">📌</button><button class="ed-btn" id="edAddQuote" title="Add Quote">💬</button><button class="ed-btn" id="edAddDivider" title="Add Divider">➖</button><button class="ed-btn" id="edAddLink" title="Add Link/Button">🔗</button><button class="ed-btn" id="edAddSticker" title="Add Sticker">⭐</button><span class="ed-sep"></span><button class="ed-btn" id="edUndo" title="Undo">↩️</button><button class="ed-btn ed-amendment" id="edExportAmendment" title="Export Amendment">📄 Export</button><button class="ed-btn ed-close" id="edClose" title="Close">✕</button></div></div><div class="ed-status" id="edStatus">F2 to toggle • Click to edit • Right-click for menu</div>';
        document.body.appendChild(toolbar);
        var formatBar=document.createElement('div');formatBar.id='edFormatBar';
        formatBar.innerHTML='<button class="ed-fmt" data-cmd="bold" title="Bold"><strong>B</strong></button><button class="ed-fmt" data-cmd="italic" title="Italic"><em>I</em></button><button class="ed-fmt" data-cmd="underline" title="Underline"><u>U</u></button><span class="ed-fmt-sep">|</span><input type="color" class="ed-fmt-color" id="edFmtColor" value="#c084fc" title="Text Color"><select class="ed-fmt-select" id="edFmtSize" title="Font Size"><option value="">Size</option><option value="1">XS</option><option value="3">M</option><option value="5">L</option><option value="7">XL</option></select><button class="ed-fmt" data-cmd="createLink" title="Add Link">🔗</button><button class="ed-fmt" data-cmd="removeFormat" title="Clear">⌧</button>';
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
                if(e.key==='Delete'&&self.selectedEl)self.deleteSelected();
                if(e.key==='Escape'){self.deselectAll();self.hideContext();}
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
        var editables=document.querySelectorAll('.hero-right h1,.hero-right h2,.hero-right p,.section-title,.section-sub,.pcard h3,.pcard-short,.bp-text,.bp-heading,.bp-caption,.bproject-header-text h3,.bproject-tagline,.bm-value,.whisper,.hero-desc,.rcard h3,.rcard-role,.rcard p,.mantras li,.about-text p');
        for(var i=0;i<editables.length;i++){editables[i].setAttribute('data-ed-original',editables[i].innerHTML);editables[i].classList.add('ed-editable');}
        var images=document.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img,.pcard-thumb-img,.hero-photo,.rcard img');
        for(var i=0;i<images.length;i++)images[i].classList.add('ed-interactive');
        var blocks=document.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.bp-text,.bp-heading,.ed-divider,.ed-link-block');
        for(var i=0;i<blocks.length;i++)blocks[i].classList.add('ed-block');
        this._clickHandler=function(e){
            if(!self.active)return;
            var target=e.target;
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
        document.addEventListener('mousedown',this._mousedownHandler);document.addEventListener('mousemove',this._mousemoveHandler);document.addEventListener('mouseup',this._mouseupHandler);
        document.getElementById('edAddImage').onclick=function(){self.addImage();};
        document.getElementById('edAddText').onclick=function(){self.addTextBlock();};
        document.getElementById('edAddHeading').onclick=function(){self.addHeading();};
        document.getElementById('edAddQuote').onclick=function(){self.addQuoteBlock();};
        document.getElementById('edAddDivider').onclick=function(){self.addDivider();};
        document.getElementById('edAddLink').onclick=function(){self.addLinkBlock();};
        document.getElementById('edAddSticker').onclick=function(){self.addSticker();};
        document.getElementById('edUndo').onclick=function(){self.undo();};
        document.getElementById('edExportAmendment').onclick=function(){self.exportAmendment();};
        document.getElementById('edClose').onclick=function(){self.toggle();};
        var fmtBtns=this.formatBar.querySelectorAll('.ed-fmt');
        for(var i=0;i<fmtBtns.length;i++){(function(btn){btn.addEventListener('mousedown',function(e){e.preventDefault();var cmd=btn.getAttribute('data-cmd');if(cmd==='createLink'){var url=prompt('Enter URL:','https://');if(url)document.execCommand(cmd,false,url);}else if(cmd){document.execCommand(cmd,false,null);}});})(fmtBtns[i]);}
        document.getElementById('edFmtColor').addEventListener('input',function(){document.execCommand('foreColor',false,this.value);});
        document.getElementById('edFmtSize').addEventListener('change',function(){if(this.value)document.execCommand('fontSize',false,this.value);this.value='';});
    }
    disableEditing(){
        var editables=document.querySelectorAll('.ed-editable');
        for(var i=0;i<editables.length;i++){editables[i].contentEditable='false';editables[i].classList.remove('ed-editable','ed-selected');}
        var interactives=document.querySelectorAll('.ed-interactive');
        for(var i=0;i<interactives.length;i++)interactives[i].classList.remove('ed-interactive','ed-selected');
        var blocks=document.querySelectorAll('.ed-block');
        for(var i=0;i<blocks.length;i++)blocks[i].classList.remove('ed-block','ed-selected');
        if(this._clickHandler)document.removeEventListener('click',this._clickHandler);
        if(this._contextHandler)document.removeEventListener('contextmenu',this._contextHandler);
        if(this._mousedownHandler)document.removeEventListener('mousedown',this._mousedownHandler);
        if(this._mousemoveHandler)document.removeEventListener('mousemove',this._mousemoveHandler);
        if(this._mouseupHandler)document.removeEventListener('mouseup',this._mouseupHandler);
    }
    selectElement(el){
        this.deselectAll();this.selectedEl=el;el.classList.add('ed-selected');
        if(el.classList.contains('ed-editable')){el.contentEditable='true';el.focus();this.showFormatBar(el);this.showTextProps(el);}
        else if(el.tagName==='IMG'){this.hideFormatBar();this.showImageProps(el);}
        else if(el.classList.contains('ed-sticker')){this.hideFormatBar();this.showStickerProps(el);}
        else if(el.classList.contains('ed-divider')){this.hideFormatBar();this.showDividerProps(el);}
        else if(el.classList.contains('ed-link-block')){this.hideFormatBar();this.showLinkProps(el);}
        else{this.hideFormatBar();this.showBlockProps(el);}
        this.updateHighlight(el);
    }
    deselectAll(){
        if(this.selectedEl&&this.selectedEl.classList.contains('ed-editable')){
            this.selectedEl.contentEditable='false';
            var original=this.selectedEl.getAttribute('data-ed-original');
            if(original!==null&&original!==this.selectedEl.innerHTML)this.pushUndo({el:this.selectedEl,type:'html',value:original});
        }
        var selected=document.querySelectorAll('.ed-selected');
        for(var i=0;i<selected.length;i++)selected[i].classList.remove('ed-selected');
        this.selectedEl=null;this.highlight.style.display='none';this.hideFormatBar();
        document.getElementById('edPanelBody').innerHTML='<p class="ed-panel-hint">Select element to edit</p>';
    }
    updateHighlight(el){
        var rect=el.getBoundingClientRect();this.highlight.style.display='block';
        this.highlight.style.top=(rect.top+window.scrollY-3)+'px';this.highlight.style.left=(rect.left-3)+'px';
        this.highlight.style.width=(rect.width+6)+'px';this.highlight.style.height=(rect.height+6)+'px';
    }
    showFormatBar(el){
        var rect=el.getBoundingClientRect();this.formatBar.classList.add('ed-visible');
        this.formatBar.style.top=Math.max(70,rect.top+window.scrollY-50)+'px';this.formatBar.style.left=Math.max(10,rect.left)+'px';
    }
    hideFormatBar(){this.formatBar.classList.remove('ed-visible');}
    hideContext(){this.ctx.style.display='none';}
    showTextProps(el){
        var panel=document.getElementById('edPanelBody');var cs=getComputedStyle(el);
        panel.innerHTML='<div class="ed-prop"><label>Font Size</label><input type="number" class="ed-prop-input" id="edPropFS" value="'+parseInt(cs.fontSize)+'" min="8" max="120"></div><div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edPropOp" min="0" max="1" step="0.05" value="'+(cs.opacity||1)+'"></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteText">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edPropFS').oninput=function(){el.style.fontSize=this.value+'px';self.updateHighlight(el);};
        document.getElementById('edPropOp').oninput=function(){el.style.opacity=this.value;};
        document.getElementById('edDeleteText').onclick=function(){self.deleteSelected();};
    }
    showImageProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><button class="ed-btn ed-full" id="edReplaceImg">📁 Replace</button></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteImg">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edReplaceImg').onclick=function(){
            self.fileInput.onchange=function(){if(this.files&&this.files[0]){var reader=new FileReader();reader.onload=function(e){self.pushUndo({el:el,type:'attr',attr:'src',value:el.src});el.src=e.target.result;self.setStatus('Image replaced');};reader.readAsDataURL(this.files[0]);}};self.fileInput.click();
        };
        document.getElementById('edDeleteImg').onclick=function(){self.deleteSelected();};
    }
    showBlockProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><button class="ed-btn" id="edBlockUp">⬆️ Up</button><button class="ed-btn" id="edBlockDown">⬇️ Down</button></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edBlockDelete">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edBlockUp').onclick=function(){self.moveBlock(el,'up');};
        document.getElementById('edBlockDown').onclick=function(){self.moveBlock(el,'down');};
        document.getElementById('edBlockDelete').onclick=function(){self.deleteSelected();};
    }
    showStickerProps(el){
        var panel=document.getElementById('edPanelBody');var currentZ=el.dataset.z||'normal';
        panel.innerHTML='<div class="ed-prop"><label>Size</label><input type="number" class="ed-prop-input" id="edStickerSize" value="'+(parseInt(el.style.width)||80)+'" min="20" max="500"></div><div class="ed-prop"><label>Rotation</label><input type="range" class="ed-prop-range" id="edStickerRot" min="-180" max="180" value="'+(parseInt(el.dataset.rotation)||0)+'"></div><div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edStickerOp" min="0" max="1" step="0.05" value="'+(el.style.opacity||1)+'"></div><div class="ed-prop"><label>Layer</label><select class="ed-prop-select" id="edStickerZ"><option value="behind" '+(currentZ==='behind'?'selected':'')+'>Behind</option><option value="back" '+(currentZ==='back'?'selected':'')+'>Back</option><option value="normal" '+(currentZ==='normal'?'selected':'')+'>Normal</option><option value="above" '+(currentZ==='above'?'selected':'')+'>Above</option><option value="top" '+(currentZ==='top'?'selected':'')+'>Top</option></select></div><div class="ed-prop ed-layer-controls"><button class="ed-btn" id="edStickerBringFront">⬆️ Front</button><button class="ed-btn" id="edStickerSendBack">⬇️ Back</button></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edStickerDelete">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edStickerSize').oninput=function(){el.style.width=this.value+'px';el.style.height=this.value+'px';self.updateHighlight(el);};
        document.getElementById('edStickerRot').oninput=function(){el.dataset.rotation=this.value;el.style.transform='rotate('+this.value+'deg)';};
        document.getElementById('edStickerOp').oninput=function(){el.style.opacity=this.value;};
        document.getElementById('edStickerZ').onchange=function(){el.dataset.z=this.value;self.applyStickerZ(el,this.value);};
        document.getElementById('edStickerBringFront').onclick=function(){self.bringToFront(el);};
        document.getElementById('edStickerSendBack').onclick=function(){self.sendToBack(el);};
        document.getElementById('edStickerDelete').onclick=function(){self.deleteSelected();};
    }
    showDividerProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><label>Width %</label><input type="range" class="ed-prop-range" id="edDivWidth" min="10" max="100" value="'+(parseInt(el.style.width)||100)+'"></div><div class="ed-prop"><label>Height px</label><input type="number" class="ed-prop-input" id="edDivHeight" min="1" max="20" value="'+(parseInt(el.style.height)||2)+'"></div><div class="ed-prop"><label>Margin px</label><input type="number" class="ed-prop-input" id="edDivMargin" min="0" max="100" value="'+(parseInt(el.style.marginTop)||20)+'"></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDivDelete">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edDivWidth').oninput=function(){el.style.width=this.value+'%';};
        document.getElementById('edDivHeight').oninput=function(){el.style.height=this.value+'px';};
        document.getElementById('edDivMargin').oninput=function(){el.style.marginTop=this.value+'px';el.style.marginBottom=this.value+'px';};
        document.getElementById('edDivDelete').onclick=function(){self.deleteSelected();};
    }
    showLinkProps(el){
        var panel=document.getElementById('edPanelBody');var link=el.querySelector('a');
        panel.innerHTML='<div class="ed-prop"><label>Text</label><input type="text" class="ed-prop-input" id="edLinkText" value="'+(link?link.textContent:'Link')+'"></div><div class="ed-prop"><label>URL</label><input type="text" class="ed-prop-input" id="edLinkUrl" value="'+(link?link.href:'#')+'"></div><div class="ed-prop"><label>Style</label><select class="ed-prop-select" id="edLinkStyle"><option value="btn">Button</option><option value="btn-outline">Outline</option><option value="text">Text</option></select></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edLinkDelete">🗑️ Delete</button></div>';
        var self=this;
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
        var html='<button data-action="select">✏️ Edit</button>';
        if(isSticker)html+='<hr class="ed-ctx-sep"><button data-action="bringfront">⬆️ Bring Front</button><button data-action="sendback">⬇️ Send Back</button>';
        html+='<hr class="ed-ctx-sep"><button data-action="delete" class="ed-ctx-danger">🗑️ Delete</button>';
        this.ctx.innerHTML=html;this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,innerWidth-200)+'px';this.ctx.style.top=Math.min(e.clientY,innerHeight-200)+'px';
        var self=this;var btns=this.ctx.querySelectorAll('button');
        for(var i=0;i<btns.length;i++){(function(btn){btn.onclick=function(){var action=btn.getAttribute('data-action');if(action==='select')self.selectElement(el);else if(action==='delete'){self.selectedEl=el;self.deleteSelected();}else if(action==='bringfront')self.bringToFront(el);else if(action==='sendback')self.sendToBack(el);self.hideContext();};})(btns[i]);}
    }
    moveBlock(el,dir){
        if(dir==='up'&&el.previousElementSibling)el.parentElement.insertBefore(el,el.previousElementSibling);
        else if(dir==='down'&&el.nextElementSibling)el.parentElement.insertBefore(el.nextElementSibling,el);
        this.updateHighlight(el);this.setStatus('Moved '+dir);
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
        this.fileInput.onchange=function(){if(!this.files||!this.files.length)return;var reader=new FileReader();reader.onload=function(e){var figure=document.createElement('figure');figure.className='bp-figure bp-img-full ed-block';figure.innerHTML='<img src="'+e.target.result+'" alt="" class="bp-img ed-interactive">';target.appendChild(figure);self.setStatus('Image added');};reader.readAsDataURL(this.files[0]);};this.fileInput.click();
    }
    addTextBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var p=document.createElement('p');p.className='bp-text ed-editable ed-block';p.textContent='Click to edit...';p.setAttribute('data-ed-original','');target.appendChild(p);this.selectElement(p);this.setStatus('Text added');
    }
    addHeading(){
        var target=this.findInsertTarget();if(!target)return;
        var h=document.createElement('h4');h.className='bp-heading ed-editable ed-block';h.textContent='New Heading';h.setAttribute('data-ed-original','');target.appendChild(h);this.selectElement(h);this.setStatus('Heading added');
    }
    addQuoteBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var quote=document.createElement('blockquote');quote.className='bp-quote ed-block';quote.innerHTML='<p class="ed-editable" data-ed-original="">Quote...</p><cite class="ed-editable" data-ed-original="">— Author</cite>';target.appendChild(quote);this.setStatus('Quote added');
    }
    addDivider(){
        var target=this.findInsertTarget();if(!target)return;
        var divider=document.createElement('div');divider.className='ed-divider ed-block';divider.style.cssText='width:100%;height:2px;background:linear-gradient(90deg,var(--pri),var(--gold),var(--acc));border-radius:2px;margin:24px auto;';target.appendChild(divider);this.selectElement(divider);this.setStatus('Divider added');
    }
    addLinkBlock(){
        var target=this.findInsertTarget();if(!target)return;
        var url=prompt('Enter URL:','https://');if(!url)return;var text=prompt('Button text:','Click Here');if(!text)return;
        var wrapper=document.createElement('div');wrapper.className='ed-link-block ed-block';wrapper.style.cssText='margin:16px 0;';wrapper.innerHTML='<a href="'+url+'" target="_blank" rel="noopener" class="btn">'+text+'</a>';target.appendChild(wrapper);this.selectElement(wrapper);this.setStatus('Link added');
    }
    addSticker(){
        var self=this;
        var expanded=document.querySelector('.bproject.expanded');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return;}
        var stickerLayer=expanded.querySelector('.bproject-stickers');
        if(!stickerLayer){stickerLayer=document.createElement('div');stickerLayer.className='bproject-stickers';expanded.appendChild(stickerLayer);}
        this.fileInput.onchange=function(){
            if(this.files&&this.files[0]){
                var reader=new FileReader();
                reader.onload=function(e){
                    var sticker=document.createElement('div');sticker.className='ed-sticker';sticker.dataset.rotation='0';sticker.dataset.z='normal';
                    sticker.dataset.projectId=expanded.dataset.projectId||'';
                    sticker.style.cssText='position:absolute;left:50px;top:150px;width:80px;height:80px;z-index:10;';
                    sticker.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:contain;pointer-events:none;"><button class="ed-sticker-delete">✕</button>';
                    stickerLayer.appendChild(sticker);
                    sticker.querySelector('.ed-sticker-delete').onclick=function(ev){ev.stopPropagation();sticker.remove();self.setStatus('Sticker removed');};
                    self.selectElement(sticker);self.setStatus('Sticker added');
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
        this.fileInput.click();
    }
    pushUndo(item){this.undoStack.push(item);if(this.undoStack.length>50)this.undoStack.shift();}
    undo(){
        if(!this.undoStack.length){this.setStatus('Nothing to undo');return;}
        var item=this.undoStack.pop();
        if(item.type==='html')item.el.innerHTML=item.value;
        else if(item.type==='attr')item.el.setAttribute(item.attr,item.value);
        else if(item.type==='child'){var temp=document.createElement('div');temp.innerHTML=item.value;var restored=temp.firstChild;if(item.ref)item.el.insertBefore(restored,item.ref);else item.el.appendChild(restored);}
        this.setStatus('Undone');
    }
    exportAmendment(){
        var amendment={_version:'1.0',_exported:new Date().toISOString(),textChanges:[],images:[],stickers:[],dividers:[],links:[]};
        var editables=document.querySelectorAll('[data-ed-original]');
        for(var i=0;i<editables.length;i++){var el=editables[i];var original=el.getAttribute('data-ed-original');if(original!==el.innerHTML){amendment.textChanges.push({selector:this.getUniqueSelector(el),content:el.innerHTML,styles:el.getAttribute('style')||''});}}
        var images=document.querySelectorAll('img[src^="data:"]');
        for(var i=0;i<images.length;i++){var img=images[i];amendment.images.push({selector:this.getUniqueSelector(img),src:img.src,alt:img.alt||''});}
        var stickers=document.querySelectorAll('.ed-sticker');
        for(var i=0;i<stickers.length;i++){var s=stickers[i];var sImg=s.querySelector('img');var stickerLayer=s.closest('.bproject-stickers');var projectCard=stickerLayer?stickerLayer.closest('.bproject'):null;amendment.stickers.push({projectId:projectCard?projectCard.dataset.projectId:'',parentSelector:this.getUniqueSelector(s.parentElement),src:sImg?sImg.src:'',position:{left:s.style.left,top:s.style.top},size:{width:s.style.width,height:s.style.height},rotation:s.dataset.rotation||'0',zIndex:s.style.zIndex||'10',opacity:s.style.opacity||'1',layer:s.dataset.z||'normal'});}
        var dividers=document.querySelectorAll('.ed-divider');
        for(var i=0;i<dividers.length;i++){var d=dividers[i];amendment.dividers.push({parentSelector:this.getUniqueSelector(d.parentElement),styles:d.getAttribute('style')||''});}
        var links=document.querySelectorAll('.ed-link-block');
        for(var i=0;i<links.length;i++){var l=links[i];var a=l.querySelector('a');amendment.links.push({parentSelector:this.getUniqueSelector(l.parentElement),text:a?a.textContent:'',href:a?a.href:'#',className:a?a.className:'btn',target:a?a.target:'_blank'});}
        var content=JSON.stringify(amendment,null,2);var blob=new Blob([content],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='amendments.json';a.click();URL.revokeObjectURL(url);
        var total=amendment.textChanges.length+amendment.stickers.length+amendment.dividers.length+amendment.links.length+amendment.images.length;
        this.setStatus('📄 Exported '+total+' changes → put in amendments/ folder');
    }
    getUniqueSelector(el){
        if(!el||el===document.body)return'body';if(el.id)return'#'+el.id;
        if(el.dataset.projectId)return'[data-project-id="'+el.dataset.projectId+'"]';
        var path=[];var current=el;
        while(current&&current!==document.body&&current.nodeType===1){
            var selector=current.tagName.toLowerCase();if(current.id){path.unshift('#'+current.id);break;}
            var classes=Array.from(current.classList).filter(function(c){return!c.startsWith('ed-')&&c!=='expanded';});
            if(classes.length)selector+='.'+classes.join('.');
            var parent=current.parentElement;
            if(parent){var siblings=parent.querySelectorAll(':scope > '+current.tagName.toLowerCase());if(siblings.length>1){var index=Array.prototype.indexOf.call(siblings,current)+1;selector+=':nth-child('+index+')';}}
            path.unshift(selector);current=parent;
        }
        return path.join(' > ');
    }
    setStatus(msg){var s=document.getElementById('edStatus');if(s){s.textContent=msg;s.classList.add('ed-flash');setTimeout(function(){s.classList.remove('ed-flash');},300);}}
}
document.addEventListener('DOMContentLoaded',function(){window.liveEditor=new LiveEditor();});