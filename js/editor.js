/* ═══════ LIVE VISUAL EDITOR ═══════ */
class LiveEditor{
    constructor(){
        this.active=false;
        this.selectedEl=null;
        this.undoStack=[];
        this.stickerDragging=null;
        this.stickerOffset={x:0,y:0};
        this.buildUI();
        this.bindShortcut();
    }

    buildUI(){
        var toolbar=document.createElement('div');
        toolbar.id='editorToolbar';
        toolbar.innerHTML='<div class="ed-header"><span class="ed-title">☠ Live Editor</span><div class="ed-controls"><button class="ed-btn" id="edAddImage">🖼️ Image</button><button class="ed-btn" id="edAddText">📝 Text</button><button class="ed-btn" id="edAddHeading">📌 Heading</button><button class="ed-btn" id="edAddQuote">💬 Quote</button><button class="ed-btn" id="edAddSticker">⭐ Sticker</button><button class="ed-btn ed-sep" id="edUndo">↩️ Undo</button><button class="ed-btn ed-export" id="edExport">📦 Export</button><button class="ed-btn ed-close" id="edClose">✕</button></div></div><div class="ed-status" id="edStatus">Ctrl+E to toggle • Click to edit • Right-click for menu</div>';
        document.body.appendChild(toolbar);

        var formatBar=document.createElement('div');
        formatBar.id='edFormatBar';
        formatBar.innerHTML='<button class="ed-fmt" data-cmd="bold"><strong>B</strong></button><button class="ed-fmt" data-cmd="italic"><em>I</em></button><button class="ed-fmt" data-cmd="underline"><u>U</u></button><span class="ed-fmt-sep">|</span><input type="color" class="ed-fmt-color" id="edFmtColor" value="#c084fc"><select class="ed-fmt-select" id="edFmtSize"><option value="">Size</option><option value="1">XS</option><option value="3">M</option><option value="5">L</option><option value="7">XL</option></select><button class="ed-fmt" data-cmd="removeFormat">⌧</button>';
        document.body.appendChild(formatBar);

        var panel=document.createElement('div');
        panel.id='editorPanel';
        panel.innerHTML='<div class="ed-panel-header">Properties</div><div class="ed-panel-body" id="edPanelBody"><p class="ed-panel-hint">Select element to edit</p></div>';
        document.body.appendChild(panel);

        var highlight=document.createElement('div');
        highlight.id='editorHighlight';
        document.body.appendChild(highlight);

        var ctx=document.createElement('div');
        ctx.id='editorContext';
        document.body.appendChild(ctx);

        var fileInput=document.createElement('input');
        fileInput.type='file';fileInput.id='edFileInput';
        fileInput.accept='image/*,.gif';fileInput.multiple=true;
        fileInput.style.display='none';
        document.body.appendChild(fileInput);

        this.toolbar=toolbar;this.formatBar=formatBar;
        this.panel=panel;this.highlight=highlight;
        this.ctx=ctx;this.fileInput=fileInput;
    }

    bindShortcut(){
        var self=this;
        document.addEventListener('keydown',function(e){
            if(e.ctrlKey&&e.key==='e'){e.preventDefault();self.toggle()}
            if(self.active&&e.ctrlKey&&e.key==='z'){e.preventDefault();self.undo()}
            if(self.active&&e.key==='Delete'&&self.selectedEl)self.deleteSelected();
            if(self.active&&e.key==='Escape'){self.deselectAll();self.hideContext()}
        });
    }

    toggle(){
        this.active=!this.active;
        document.body.classList.toggle('editor-active',this.active);
        this.toolbar.classList.toggle('ed-visible',this.active);
        this.panel.classList.toggle('ed-visible',this.active);
        if(this.active)this.enableEditing();
        else{this.disableEditing();this.deselectAll();this.hideContext();this.hideFormatBar()}
    }

    enableEditing(){
        var self=this;
        var editables=document.querySelectorAll('.hero-right h1,.hero-right h2,.hero-right p,.section-title,.section-sub,.pcard h3,.pcard-short,.bp-text,.bp-heading,.bp-caption,.bproject-header-text h3,.bproject-tagline,.bm-value,.whisper,.hero-desc,.rcard h3,.rcard-role,.rcard p,.mantras li,.about-text p');
        for(var i=0;i<editables.length;i++){
            editables[i].setAttribute('data-ed-original',editables[i].innerHTML);
            editables[i].classList.add('ed-editable');
        }
        var images=document.querySelectorAll('.bp-img,.bp-gallery-img,.bproject-thumb-img,.pcard-thumb-img,.hero-photo,.rcard img');
        for(var i=0;i<images.length;i++)images[i].classList.add('ed-interactive');
        var blocks=document.querySelectorAll('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.bp-text,.bp-heading');
        for(var i=0;i<blocks.length;i++)blocks[i].classList.add('ed-block');

        this._clickHandler=function(e){
            if(!self.active)return;
            var target=e.target;
            if(target.closest('.ed-sticker')){e.stopPropagation();self.selectElement(target.closest('.ed-sticker'));return}
            if(target.closest('.ed-editable')){e.stopPropagation();self.selectElement(target.closest('.ed-editable'));return}
            if(target.closest('.ed-interactive')){e.stopPropagation();self.selectElement(target.closest('.ed-interactive'));return}
            if(target.closest('.ed-block')){e.stopPropagation();self.selectElement(target.closest('.ed-block'));return}
            if(!target.closest('#editorPanel,#editorToolbar,#editorContext,#edFormatBar')){self.deselectAll();self.hideContext()}
        };
        document.addEventListener('click',this._clickHandler);

        this._contextHandler=function(e){
            if(!self.active)return;
            var target=e.target.closest('.ed-block,.ed-interactive,.ed-editable,.ed-sticker');
            if(target){e.preventDefault();self.showContext(e,target)}
        };
        document.addEventListener('contextmenu',this._contextHandler);

        this._mousedownHandler=function(e){
            if(!self.active)return;
            var sticker=e.target.closest('.ed-sticker');
            if(sticker&&!e.target.closest('.ed-sticker-delete')){
                self.stickerDragging=sticker;
                var rect=sticker.getBoundingClientRect();
                self.stickerOffset.x=e.clientX-rect.left;
                self.stickerOffset.y=e.clientY-rect.top;
                sticker.classList.add('ed-sticker-dragging');
                e.preventDefault();
            }
        };
        this._mousemoveHandler=function(e){
            if(self.stickerDragging){
                var parent=self.stickerDragging.parentElement;
                var parentRect=parent.getBoundingClientRect();
                self.stickerDragging.style.left=(e.clientX-parentRect.left-self.stickerOffset.x)+'px';
                self.stickerDragging.style.top=(e.clientY-parentRect.top-self.stickerOffset.y)+'px';
            }
        };
        this._mouseupHandler=function(){
            if(self.stickerDragging){
                self.stickerDragging.classList.remove('ed-sticker-dragging');
                self.stickerDragging=null;
            }
        };
        document.addEventListener('mousedown',this._mousedownHandler);
        document.addEventListener('mousemove',this._mousemoveHandler);
        document.addEventListener('mouseup',this._mouseupHandler);

        document.getElementById('edAddImage').onclick=function(){self.addImage()};
        document.getElementById('edAddText').onclick=function(){self.addTextBlock()};
        document.getElementById('edAddHeading').onclick=function(){self.addHeading()};
        document.getElementById('edAddQuote').onclick=function(){self.addQuoteBlock()};
        document.getElementById('edAddSticker').onclick=function(){self.addSticker()};
        document.getElementById('edUndo').onclick=function(){self.undo()};
        document.getElementById('edExport').onclick=function(){self.exportChanges()};
        document.getElementById('edClose').onclick=function(){self.toggle()};

        var fmtBtns=this.formatBar.querySelectorAll('.ed-fmt');
        for(var i=0;i<fmtBtns.length;i++){
            (function(btn){
                btn.addEventListener('mousedown',function(e){
                    e.preventDefault();
                    var cmd=btn.getAttribute('data-cmd');
                    if(cmd)document.execCommand(cmd,false,null);
                });
            })(fmtBtns[i]);
        }
        document.getElementById('edFmtColor').addEventListener('input',function(){document.execCommand('foreColor',false,this.value)});
        document.getElementById('edFmtSize').addEventListener('change',function(){if(this.value)document.execCommand('fontSize',false,this.value);this.value=''});
    }

    disableEditing(){
        var editables=document.querySelectorAll('.ed-editable');
        for(var i=0;i<editables.length;i++){editables[i].contentEditable='false';editables[i].classList.remove('ed-editable','ed-selected')}
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
        this.deselectAll();
        this.selectedEl=el;
        el.classList.add('ed-selected');
        if(el.classList.contains('ed-editable')){el.contentEditable='true';el.focus();this.showFormatBar(el);this.showTextProps(el)}
        else if(el.tagName==='IMG'){this.hideFormatBar();this.showImageProps(el)}
        else if(el.classList.contains('ed-sticker')){this.hideFormatBar();this.showStickerProps(el)}
        else{this.hideFormatBar();this.showBlockProps(el)}
        this.updateHighlight(el);
    }

    deselectAll(){
        if(this.selectedEl&&this.selectedEl.classList.contains('ed-editable')){
            this.selectedEl.contentEditable='false';
            var original=this.selectedEl.getAttribute('data-ed-original');
            if(original!==null&&original!==this.selectedEl.innerHTML)
                this.pushUndo({el:this.selectedEl,type:'html',value:original});
        }
        var selected=document.querySelectorAll('.ed-selected');
        for(var i=0;i<selected.length;i++)selected[i].classList.remove('ed-selected');
        this.selectedEl=null;
        this.highlight.style.display='none';
        this.hideFormatBar();
        document.getElementById('edPanelBody').innerHTML='<p class="ed-panel-hint">Select element to edit</p>';
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
        var rect=el.getBoundingClientRect();
        this.formatBar.classList.add('ed-visible');
        this.formatBar.style.top=Math.max(60,rect.top+window.scrollY-45)+'px';
        this.formatBar.style.left=Math.max(10,rect.left)+'px';
    }

    hideFormatBar(){this.formatBar.classList.remove('ed-visible')}

    showTextProps(el){
        var panel=document.getElementById('edPanelBody');
        var cs=getComputedStyle(el);
        panel.innerHTML='<div class="ed-prop"><label>Font Size</label><input type="number" class="ed-prop-input" id="edPropFS" value="'+parseInt(cs.fontSize)+'" min="8" max="120"></div><div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edPropOp" min="0" max="1" step="0.05" value="'+(cs.opacity||1)+'"></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteText">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edPropFS').oninput=function(){el.style.fontSize=this.value+'px';self.updateHighlight(el)};
        document.getElementById('edPropOp').oninput=function(){el.style.opacity=this.value};
        document.getElementById('edDeleteText').onclick=function(){self.deleteSelected()};
    }

    showImageProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><button class="ed-btn ed-full" id="edReplaceImg">📁 Replace</button></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edDeleteImg">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edReplaceImg').onclick=function(){
            self.fileInput.onchange=function(){
                if(this.files&&this.files[0]){
                    var reader=new FileReader();
                    reader.onload=function(e){self.pushUndo({el:el,type:'attr',attr:'src',value:el.src});el.src=e.target.result;self.setStatus('Image replaced')};
                    reader.readAsDataURL(this.files[0]);
                }
            };
            self.fileInput.click();
        };
        document.getElementById('edDeleteImg').onclick=function(){self.deleteSelected()};
    }

    showBlockProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><button class="ed-btn" id="edBlockUp">⬆️ Up</button><button class="ed-btn" id="edBlockDown">⬇️ Down</button></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edBlockDelete">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edBlockUp').onclick=function(){self.moveBlock(el,'up')};
        document.getElementById('edBlockDown').onclick=function(){self.moveBlock(el,'down')};
        document.getElementById('edBlockDelete').onclick=function(){self.deleteSelected()};
    }

    showStickerProps(el){
        var panel=document.getElementById('edPanelBody');
        panel.innerHTML='<div class="ed-prop"><label>Size</label><input type="number" class="ed-prop-input" id="edStickerSize" value="'+parseInt(el.style.width||80)+'" min="20" max="500"></div><div class="ed-prop"><label>Rotation</label><input type="range" class="ed-prop-range" id="edStickerRot" min="-180" max="180" value="'+(parseInt(el.dataset.rotation)||0)+'"></div><div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edStickerDelete">🗑️ Delete</button></div>';
        var self=this;
        document.getElementById('edStickerSize').oninput=function(){el.style.width=this.value+'px';el.style.height=this.value+'px'};
        document.getElementById('edStickerRot').oninput=function(){el.dataset.rotation=this.value;el.style.transform='rotate('+this.value+'deg)'};
        document.getElementById('edStickerDelete').onclick=function(){self.deleteSelected()};
    }

    showContext(e,el){
        this.ctx.innerHTML='<button data-action="select">✏️ Edit</button><button data-action="delete" class="ed-ctx-danger">🗑️ Delete</button>';
        this.ctx.style.display='block';
        this.ctx.style.left=Math.min(e.clientX,window.innerWidth-200)+'px';
        this.ctx.style.top=Math.min(e.clientY,window.innerHeight-150)+'px';
        var self=this;
        var btns=this.ctx.querySelectorAll('button');
        for(var i=0;i<btns.length;i++){
            (function(btn){
                btn.onclick=function(){
                    var action=btn.getAttribute('data-action');
                    if(action==='select')self.selectElement(el);
                    else if(action==='delete'){self.selectedEl=el;self.deleteSelected()}
                    self.hideContext();
                };
            })(btns[i]);
        }
    }

    hideContext(){this.ctx.style.display='none'}

    moveBlock(el,dir){
        if(dir==='up'&&el.previousElementSibling)el.parentElement.insertBefore(el,el.previousElementSibling);
        else if(dir==='down'&&el.nextElementSibling)el.parentElement.insertBefore(el.nextElementSibling,el);
        this.updateHighlight(el);this.setStatus('Moved '+dir);
    }

    deleteSelected(){
        if(!this.selectedEl)return;
        var block=this.selectedEl.closest('.bp-figure,.bp-gallery-item,.bp-gallery,.bp-columns,.bp-quote,.ed-sticker')||this.selectedEl;
        this.pushUndo({el:block.parentElement,type:'child',value:block.outerHTML,ref:block.nextElementSibling});
        block.remove();
        this.selectedEl=null;
        this.highlight.style.display='none';
        this.hideFormatBar();
        this.setStatus('Deleted');
    }

    findInsertTarget(){
        var expanded=document.querySelector('.bproject.expanded .bproject-content');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return null}
        return expanded;
    }

    addImage(){
        var self=this,target=this.findInsertTarget();
        if(!target)return;
        this.fileInput.onchange=function(){
            if(!this.files||!this.files.length)return;
            var reader=new FileReader();
            reader.onload=function(e){
                var figure=document.createElement('figure');
                figure.className='bp-figure bp-img-full ed-block';
                figure.innerHTML='<img src="'+e.target.result+'" alt="" class="bp-img ed-interactive">';
                target.appendChild(figure);
                self.setStatus('Image added');
            };
            reader.readAsDataURL(this.files[0]);
        };
        this.fileInput.click();
    }

    addTextBlock(){
        var target=this.findInsertTarget();
        if(!target)return;
        var p=document.createElement('p');
        p.className='bp-text ed-editable ed-block';
        p.textContent='Click to edit...';
        p.setAttribute('data-ed-original','');
        target.appendChild(p);
        this.selectElement(p);
        this.setStatus('Text added');
    }

    addHeading(){
        var target=this.findInsertTarget();
        if(!target)return;
        var h=document.createElement('h4');
        h.className='bp-heading ed-editable ed-block';
        h.textContent='New Heading';
        h.setAttribute('data-ed-original','');
        target.appendChild(h);
        this.selectElement(h);
        this.setStatus('Heading added');
    }

    addQuoteBlock(){
        var target=this.findInsertTarget();
        if(!target)return;
        var quote=document.createElement('blockquote');
        quote.className='bp-quote ed-block';
        quote.innerHTML='<p class="ed-editable" data-ed-original="">Quote...</p><cite class="ed-editable" data-ed-original="">— Author</cite>';
        target.appendChild(quote);
        this.setStatus('Quote added');
    }

    addSticker(){
        var self=this;
        var expanded=document.querySelector('.bproject.expanded');
        if(!expanded){this.setStatus('⚠️ Expand a project first');return}
        this.fileInput.onchange=function(){
            if(this.files&&this.files[0]){
                var reader=new FileReader();
                reader.onload=function(e){
                    var sticker=document.createElement('div');
                    sticker.className='ed-sticker';
                    sticker.dataset.rotation='0';
                    sticker.dataset.z='normal';
                    sticker.style.cssText='position:absolute;left:50px;top:50px;width:80px;height:80px;';
                    sticker.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:contain;pointer-events:none;"><button class="ed-sticker-delete">✕</button>';
                    expanded.style.position='relative';
                    expanded.appendChild(sticker);
                    sticker.querySelector('.ed-sticker-delete').onclick=function(ev){ev.stopPropagation();sticker.remove();self.setStatus('Sticker removed')};
                    self.setStatus('Sticker added');
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
        this.fileInput.click();
    }

    pushUndo(item){this.undoStack.push(item);if(this.undoStack.length>50)this.undoStack.shift()}

    undo(){
        if(!this.undoStack.length){this.setStatus('Nothing to undo');return}
        var item=this.undoStack.pop();
        switch(item.type){
            case 'html':item.el.innerHTML=item.value;break;
            case 'attr':item.el.setAttribute(item.attr,item.value);break;
            case 'child':
                var temp=document.createElement('div');
                temp.innerHTML=item.value;
                var restored=temp.firstChild;
                if(item.ref)item.el.insertBefore(restored,item.ref);
                else item.el.appendChild(restored);
                break;
        }
        this.setStatus('Undone');
    }

    setStatus(msg){
        var s=document.getElementById('edStatus');
        if(s){s.textContent=msg;s.classList.add('ed-flash');setTimeout(function(){s.classList.remove('ed-flash')},300)}
    }

    exportChanges(){
        var changes=[];
        var editables=document.querySelectorAll('[data-ed-original]');
        for(var i=0;i<editables.length;i++){
            var el=editables[i];
            var original=el.getAttribute('data-ed-original');
            if(original!==el.innerHTML)changes.push({original:original,current:el.innerHTML});
        }
        var json=JSON.stringify({timestamp:new Date().toISOString(),changes:changes},null,2);
        var blob=new Blob([json],{type:'application/json'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');
        a.href=url;a.download='changes-'+Date.now()+'.json';a.click();
        URL.revokeObjectURL(url);
        this.setStatus('Exported '+changes.length+' changes');
    }
}

document.addEventListener('DOMContentLoaded',function(){new LiveEditor()});