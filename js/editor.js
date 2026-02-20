/* ═══════ LIVE VISUAL EDITOR v2 ═══════ */
class LiveEditor {
    constructor() {
        this.active = false;
        this.selectedEl = null;
        this.contextEl = null;
        this.undoStack = [];
        this.stickers = [];
        this.stickerDragging = null;
        this.stickerOffset = { x: 0, y: 0 };
        this.buildUI();
        this.bindShortcut();
    }

    buildUI() {
        // Editor toolbar
        var toolbar = document.createElement('div');
        toolbar.id = 'editorToolbar';
        toolbar.innerHTML =
            '<div class="ed-header">' +
                '<span class="ed-title">☠ Live Editor</span>' +
                '<div class="ed-controls">' +
                    '<button class="ed-btn" id="edAddImage" title="Add Image">🖼️ Image</button>' +
                    '<button class="ed-btn" id="edAddGallery" title="Add Gallery">🎨 Gallery</button>' +
                    '<button class="ed-btn" id="edAddText" title="Add Text">📝 Text</button>' +
                    '<button class="ed-btn" id="edAddHeading" title="Add Heading">📌 Heading</button>' +
                    '<button class="ed-btn" id="edAddQuote" title="Add Quote">💬 Quote</button>' +
                    '<button class="ed-btn" id="edAddColumns" title="Add Columns">▥ Columns</button>' +
                    '<button class="ed-btn" id="edAddSticker" title="Add Sticker">⭐ Sticker</button>' +
                    '<button class="ed-btn ed-sep" id="edUndo" title="Undo (Ctrl+Z)">↩️ Undo</button>' +
                    '<button class="ed-btn ed-export" id="edExport" title="Export">📦 Export</button>' +
                    '<button class="ed-btn ed-close" id="edClose" title="Close (Ctrl+E)">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="ed-status" id="edStatus">Press Ctrl+E to toggle • Click text to edit • Right-click for options</div>';
        document.body.appendChild(toolbar);

        // Text formatting bar
        var formatBar = document.createElement('div');
        formatBar.id = 'edFormatBar';
        formatBar.innerHTML =
            '<button class="ed-fmt" data-cmd="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>' +
            '<button class="ed-fmt" data-cmd="italic" title="Italic (Ctrl+I)"><em>I</em></button>' +
            '<button class="ed-fmt" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>' +
            '<button class="ed-fmt" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>' +
            '<span class="ed-fmt-sep">|</span>' +
            '<input type="color" class="ed-fmt-color" id="edFmtColor" value="#c084fc" title="Text Color">' +
            '<input type="color" class="ed-fmt-color" id="edFmtBgColor" value="#1a0a2e" title="Highlight Color">' +
            '<span class="ed-fmt-sep">|</span>' +
            '<select class="ed-fmt-select" id="edFmtSize">' +
                '<option value="">Size</option>' +
                '<option value="1">Tiny</option>' +
                '<option value="2">Small</option>' +
                '<option value="3">Normal</option>' +
                '<option value="4">Large</option>' +
                '<option value="5">XL</option>' +
                '<option value="6">XXL</option>' +
                '<option value="7">Huge</option>' +
            '</select>' +
            '<select class="ed-fmt-select" id="edFmtFont">' +
                '<option value="">Font</option>' +
                '<option value="Inter">Inter</option>' +
                '<option value="Caveat">Caveat</option>' +
                '<option value="JetBrains Mono">Mono</option>' +
                '<option value="serif">Serif</option>' +
            '</select>' +
            '<span class="ed-fmt-sep">|</span>' +
            '<button class="ed-fmt" data-cmd="justifyLeft" title="Align Left">⫷</button>' +
            '<button class="ed-fmt" data-cmd="justifyCenter" title="Align Center">☰</button>' +
            '<button class="ed-fmt" data-cmd="justifyRight" title="Align Right">⫸</button>' +
            '<button class="ed-fmt" data-cmd="removeFormat" title="Clear Formatting">⌧</button>';
        document.body.appendChild(formatBar);

        // Properties panel
        var panel = document.createElement('div');
        panel.id = 'editorPanel';
        panel.innerHTML =
            '<div class="ed-panel-header">Properties</div>' +
            '<div class="ed-panel-body" id="edPanelBody">' +
                '<p class="ed-panel-hint">Select an element to edit</p>' +
            '</div>';
        document.body.appendChild(panel);

        // Highlight overlay
        var highlight = document.createElement('div');
        highlight.id = 'editorHighlight';
        document.body.appendChild(highlight);

        // Context menu
        var ctx = document.createElement('div');
        ctx.id = 'editorContext';
        document.body.appendChild(ctx);

        // File input
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'edFileInput';
        fileInput.accept = 'image/*,.gif';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        this.toolbar = toolbar;
        this.formatBar = formatBar;
        this.panel = panel;
        this.highlight = highlight;
        this.ctx = ctx;
        this.fileInput = fileInput;
    }

    bindShortcut() {
        var self = this;
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                self.toggle();
            }
            if (self.active && e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                self.undo();
            }
            if (self.active && e.key === 'Delete' && self.selectedEl) {
                self.deleteSelected();
            }
            if (self.active && e.key === 'Escape') {
                self.deselectAll();
                self.hideContext();
            }
        });
    }

    toggle() {
        this.active = !this.active;
        document.body.classList.toggle('editor-active', this.active);
        this.toolbar.classList.toggle('ed-visible', this.active);
        this.panel.classList.toggle('ed-visible', this.active);

        if (this.active) {
            this.enableEditing();
            this.setStatus('Editor ON — Click to edit • Right-click for menu • Delete key removes • Ctrl+Z undo');
        } else {
            this.disableEditing();
            this.deselectAll();
            this.hideContext();
            this.hideFormatBar();
        }
    }

    enableEditing() {
        var self = this;

        // Text elements
        var editables = document.querySelectorAll(
            '.hero-right h1, .hero-right h2, .hero-right p, ' +
            '.section-title, .section-sub, ' +
            '.pcard h3, .pcard-short, ' +
            '.bp-text, .bp-heading, .bp-caption, ' +
            '.bp-quote p, .bp-quote cite, ' +
            '.bproject-header-text h3, .bproject-tagline, ' +
            '.bm-value, .whisper, .hero-desc, ' +
            '.rcard h3, .rcard-role, .rcard p:not(.rcard-quote), .rcard-quote, ' +
            '.mantras li, .about-text p'
        );
        for (var i = 0; i < editables.length; i++) {
            editables[i].setAttribute('data-ed-original', editables[i].innerHTML);
            editables[i].classList.add('ed-editable');
        }

        // Images
        var images = document.querySelectorAll(
            '.bp-img, .bp-gallery-img, .bproject-thumb-img, ' +
            '.pcard-thumb-img, .hero-photo, .rcard img'
        );
        for (var i = 0; i < images.length; i++) {
            images[i].classList.add('ed-interactive');
        }

        // Content blocks
        var blocks = document.querySelectorAll(
            '.bp-figure, .bp-gallery-item, .bp-gallery, .bp-columns, .bp-quote, .bp-video, .bp-text, .bp-heading'
        );
        for (var i = 0; i < blocks.length; i++) {
            blocks[i].classList.add('ed-block');
        }

        // Global click handler
        this._clickHandler = function(e) {
            if (!self.active) return;
            var target = e.target;

            // Sticker click
            if (target.closest('.ed-sticker')) {
                e.stopPropagation();
                self.selectElement(target.closest('.ed-sticker'));
                return;
            }

            // Editable text
            if (target.closest('.ed-editable')) {
                e.stopPropagation();
                self.selectElement(target.closest('.ed-editable'));
                return;
            }

            // Image
            if (target.closest('.ed-interactive')) {
                e.stopPropagation();
                self.selectElement(target.closest('.ed-interactive'));
                return;
            }

            // Block
            if (target.closest('.ed-block')) {
                e.stopPropagation();
                self.selectElement(target.closest('.ed-block'));
                return;
            }

            // Click outside
            if (!target.closest('#editorPanel, #editorToolbar, #editorContext, #edFormatBar')) {
                self.deselectAll();
                self.hideContext();
            }
        };
        document.addEventListener('click', this._clickHandler);

        // Context menu
        this._contextHandler = function(e) {
            if (!self.active) return;
            var target = e.target.closest('.ed-block, .ed-interactive, .ed-editable, .ed-sticker');
            if (target) {
                e.preventDefault();
                self.showContext(e, target);
            }
        };
        document.addEventListener('contextmenu', this._contextHandler);

        // Sticker drag
        this._mousedownHandler = function(e) {
            if (!self.active) return;
            var sticker = e.target.closest('.ed-sticker');
            if (sticker && !e.target.closest('.ed-sticker-delete')) {
                self.stickerDragging = sticker;
                var rect = sticker.getBoundingClientRect();
                self.stickerOffset.x = e.clientX - rect.left;
                self.stickerOffset.y = e.clientY - rect.top;
                sticker.classList.add('ed-sticker-dragging');
                e.preventDefault();
            }
        };
        this._mousemoveHandler = function(e) {
            if (self.stickerDragging) {
                var parent = self.stickerDragging.parentElement;
                var parentRect = parent.getBoundingClientRect();
                var x = e.clientX - parentRect.left - self.stickerOffset.x;
                var y = e.clientY - parentRect.top - self.stickerOffset.y;
                self.stickerDragging.style.left = x + 'px';
                self.stickerDragging.style.top = y + 'px';
            }
        };
        this._mouseupHandler = function() {
            if (self.stickerDragging) {
                self.stickerDragging.classList.remove('ed-sticker-dragging');
                self.stickerDragging = null;
            }
        };
        document.addEventListener('mousedown', this._mousedownHandler);
        document.addEventListener('mousemove', this._mousemoveHandler);
        document.addEventListener('mouseup', this._mouseupHandler);

        // Toolbar buttons
        document.getElementById('edAddImage').onclick = function() { self.addImage(); };
        document.getElementById('edAddGallery').onclick = function() { self.addGallery(); };
        document.getElementById('edAddText').onclick = function() { self.addTextBlock(); };
        document.getElementById('edAddHeading').onclick = function() { self.addHeading(); };
        document.getElementById('edAddQuote').onclick = function() { self.addQuoteBlock(); };
        document.getElementById('edAddColumns').onclick = function() { self.addColumnsBlock(); };
        document.getElementById('edAddSticker').onclick = function() { self.addSticker(); };
        document.getElementById('edUndo').onclick = function() { self.undo(); };
        document.getElementById('edExport').onclick = function() { self.exportChanges(); };
        document.getElementById('edClose').onclick = function() { self.toggle(); };

        // Format bar buttons
        var fmtBtns = this.formatBar.querySelectorAll('.ed-fmt');
        for (var i = 0; i < fmtBtns.length; i++) {
            (function(btn) {
                btn.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    var cmd = btn.getAttribute('data-cmd');
                    if (cmd) document.execCommand(cmd, false, null);
                });
            })(fmtBtns[i]);
        }

        document.getElementById('edFmtColor').addEventListener('input', function() {
            document.execCommand('foreColor', false, this.value);
        });
        document.getElementById('edFmtBgColor').addEventListener('input', function() {
            document.execCommand('hiliteColor', false, this.value);
        });
        document.getElementById('edFmtSize').addEventListener('change', function() {
            if (this.value) document.execCommand('fontSize', false, this.value);
            this.value = '';
        });
        document.getElementById('edFmtFont').addEventListener('change', function() {
            if (this.value) document.execCommand('fontName', false, this.value);
            this.value = '';
        });
    }

    disableEditing() {
        var editables = document.querySelectorAll('.ed-editable');
        for (var i = 0; i < editables.length; i++) {
            editables[i].contentEditable = 'false';
            editables[i].classList.remove('ed-editable', 'ed-selected');
        }
        var interactives = document.querySelectorAll('.ed-interactive');
        for (var i = 0; i < interactives.length; i++) {
            interactives[i].classList.remove('ed-interactive', 'ed-selected');
        }
        var blocks = document.querySelectorAll('.ed-block');
        for (var i = 0; i < blocks.length; i++) {
            blocks[i].classList.remove('ed-block', 'ed-selected');
        }
        if (this._clickHandler) document.removeEventListener('click', this._clickHandler);
        if (this._contextHandler) document.removeEventListener('contextmenu', this._contextHandler);
        if (this._mousedownHandler) document.removeEventListener('mousedown', this._mousedownHandler);
        if (this._mousemoveHandler) document.removeEventListener('mousemove', this._mousemoveHandler);
        if (this._mouseupHandler) document.removeEventListener('mouseup', this._mouseupHandler);
    }

    selectElement(el) {
        this.deselectAll();
        this.selectedEl = el;
        el.classList.add('ed-selected');

        if (el.classList.contains('ed-editable')) {
            el.contentEditable = 'true';
            el.focus();
            this.showFormatBar(el);
            this.showTextProps(el);
        } else if (el.tagName === 'IMG') {
            this.hideFormatBar();
            this.showImageProps(el);
        } else if (el.classList.contains('ed-sticker')) {
            this.hideFormatBar();
            this.showStickerProps(el);
        } else if (el.classList.contains('ed-block')) {
            this.hideFormatBar();
            this.showBlockProps(el);
        }

        this.updateHighlight(el);
    }

    deselectAll() {
        if (this.selectedEl && this.selectedEl.classList.contains('ed-editable')) {
            this.selectedEl.contentEditable = 'false';
            var original = this.selectedEl.getAttribute('data-ed-original');
            if (original !== null && original !== this.selectedEl.innerHTML) {
                this.pushUndo({ el: this.selectedEl, type: 'html', value: original });
            }
        }
        var selected = document.querySelectorAll('.ed-selected');
        for (var i = 0; i < selected.length; i++) selected[i].classList.remove('ed-selected');
        this.selectedEl = null;
        this.highlight.style.display = 'none';
        this.hideFormatBar();
        document.getElementById('edPanelBody').innerHTML = '<p class="ed-panel-hint">Select an element to edit</p>';
    }

    updateHighlight(el) {
        var rect = el.getBoundingClientRect();
        this.highlight.style.display = 'block';
        this.highlight.style.top = (rect.top + window.scrollY - 3) + 'px';
        this.highlight.style.left = (rect.left - 3) + 'px';
        this.highlight.style.width = (rect.width + 6) + 'px';
        this.highlight.style.height = (rect.height + 6) + 'px';
    }

    showFormatBar(el) {
        var rect = el.getBoundingClientRect();
        this.formatBar.classList.add('ed-visible');
        this.formatBar.style.top = Math.max(60, rect.top + window.scrollY - 45) + 'px';
        this.formatBar.style.left = Math.max(10, rect.left) + 'px';
    }

    hideFormatBar() {
        this.formatBar.classList.remove('ed-visible');
    }

    // ═══ PROPERTY PANELS ═══

    showTextProps(el) {
        var panel = document.getElementById('edPanelBody');
        var cs = getComputedStyle(el);
        panel.innerHTML =
            '<div class="ed-prop"><label>Type</label><span class="ed-prop-val">' + el.tagName + ' • ' + (el.className.replace(/ed-\S+/g, '').trim() || 'text') + '</span></div>' +
            '<div class="ed-prop"><label>Font Size (px)</label><input type="number" class="ed-prop-input" id="edPropFS" value="' + parseInt(cs.fontSize) + '" min="8" max="120" step="1"></div>' +
            '<div class="ed-prop"><label>Line Height</label><input type="number" class="ed-prop-input" id="edPropLH" value="' + parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) + '" min="0.8" max="4" step="0.1"></div>' +
            '<div class="ed-prop"><label>Letter Spacing (px)</label><input type="number" class="ed-prop-input" id="edPropLS" value="' + (parseFloat(cs.letterSpacing) || 0) + '" min="-5" max="20" step="0.5"></div>' +
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edPropOp" min="0" max="1" step="0.05" value="' + (cs.opacity || 1) + '"><span class="ed-range-val" id="edPropOpVal">' + cs.opacity + '</span></div>' +
            '<div class="ed-prop"><label>Actions</label>' +
                '<button class="ed-btn ed-full ed-danger" id="edDeleteText">🗑️ Delete This Element</button>' +
            '</div>';

        var self = this;
        document.getElementById('edPropFS').oninput = function() { el.style.fontSize = this.value + 'px'; self.updateHighlight(el); };
        document.getElementById('edPropLH').oninput = function() { el.style.lineHeight = this.value; };
        document.getElementById('edPropLS').oninput = function() { el.style.letterSpacing = this.value + 'px'; };
        document.getElementById('edPropOp').oninput = function() { el.style.opacity = this.value; document.getElementById('edPropOpVal').textContent = this.value; };
        document.getElementById('edDeleteText').onclick = function() { self.deleteSelected(); };
    }

    showImageProps(el) {
        var panel = document.getElementById('edPanelBody');
        var cs = getComputedStyle(el);
        var currentW = el.style.width || '100%';
        var currentH = el.style.height || 'auto';
        var currentRadius = parseInt(cs.borderRadius) || 0;

        panel.innerHTML =
            '<div class="ed-prop"><label>Image</label><span class="ed-prop-val">' + (el.src.split('/').pop().substring(0, 30)) + '</span></div>' +
            '<div class="ed-prop"><label>Replace</label><button class="ed-btn ed-full" id="edReplaceImg">📁 Choose File (PNG/JPG/GIF)</button></div>' +
            '<div class="ed-prop"><label>Width (any CSS value)</label><input type="text" class="ed-prop-input" id="edImgW" value="' + currentW + '" placeholder="100%, 300px, auto"></div>' +
            '<div class="ed-prop"><label>Height (any CSS value)</label><input type="text" class="ed-prop-input" id="edImgH" value="' + currentH + '" placeholder="auto, 200px, 50vh"></div>' +
            '<div class="ed-prop"><label>Max Width (any CSS value)</label><input type="text" class="ed-prop-input" id="edImgMW" value="' + (el.style.maxWidth || 'none') + '" placeholder="none, 500px, 80%"></div>' +
            '<div class="ed-prop"><label>Border Radius (px)</label><input type="number" class="ed-prop-input" id="edImgR" value="' + currentRadius + '" min="0" max="200" step="1"></div>' +
            '<div class="ed-prop"><label>Object Fit</label><select class="ed-prop-select" id="edImgFit">' +
                '<option value="cover"' + (cs.objectFit === 'cover' ? ' selected' : '') + '>Cover</option>' +
                '<option value="contain"' + (cs.objectFit === 'contain' ? ' selected' : '') + '>Contain</option>' +
                '<option value="fill"' + (cs.objectFit === 'fill' ? ' selected' : '') + '>Fill</option>' +
                '<option value="none"' + (cs.objectFit === 'none' ? ' selected' : '') + '>None (original)</option>' +
            '</select></div>' +
            '<div class="ed-prop"><label>Object Position</label><select class="ed-prop-select" id="edImgPos">' +
                '<option value="center center">Center</option>' +
                '<option value="top center">Top</option>' +
                '<option value="bottom center">Bottom</option>' +
                '<option value="left center">Left</option>' +
                '<option value="right center">Right</option>' +
            '</select></div>' +
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edImgOp" min="0" max="1" step="0.05" value="' + (cs.opacity || 1) + '"><span class="ed-range-val" id="edImgOpVal">' + (cs.opacity || 1) + '</span></div>' +
            '<div class="ed-prop"><label>Actions</label>' +
                '<button class="ed-btn ed-full ed-danger" id="edDeleteImg">🗑️ Delete This Image</button>' +
            '</div>';

        var self = this;
        document.getElementById('edReplaceImg').onclick = function() {
            self.fileInput.onchange = function() {
                if (this.files && this.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        self.pushUndo({ el: el, type: 'attr', attr: 'src', value: el.src });
                        el.src = e.target.result;
                        self.setStatus('Image replaced');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            };
            self.fileInput.click();
        };
        document.getElementById('edImgW').oninput = function() { el.style.width = this.value; self.updateHighlight(el); };
        document.getElementById('edImgH').oninput = function() { el.style.height = this.value; self.updateHighlight(el); };
        document.getElementById('edImgMW').oninput = function() { el.style.maxWidth = this.value; self.updateHighlight(el); };
        document.getElementById('edImgR').oninput = function() { el.style.borderRadius = this.value + 'px'; };
        document.getElementById('edImgFit').onchange = function() { el.style.objectFit = this.value; };
        document.getElementById('edImgPos').onchange = function() { el.style.objectPosition = this.value; };
        document.getElementById('edImgOp').oninput = function() { el.style.opacity = this.value; document.getElementById('edImgOpVal').textContent = this.value; };
        document.getElementById('edDeleteImg').onclick = function() { self.deleteSelected(); };
    }

    showBlockProps(el) {
        var panel = document.getElementById('edPanelBody');
        var blockType = 'Block';
        if (el.classList.contains('bp-figure')) blockType = 'Image Figure';
        else if (el.classList.contains('bp-gallery')) blockType = 'Gallery';
        else if (el.classList.contains('bp-columns')) blockType = 'Columns';
        else if (el.classList.contains('bp-quote')) blockType = 'Quote';
        else if (el.classList.contains('bp-text')) blockType = 'Text';
        else if (el.classList.contains('bp-heading')) blockType = 'Heading';

        panel.innerHTML =
            '<div class="ed-prop"><label>Block Type</label><span class="ed-prop-val">' + blockType + '</span></div>' +
            '<div class="ed-prop"><label>Move</label>' +
                '<div class="ed-btn-row">' +
                    '<button class="ed-btn" id="edBlockUp">⬆️ Move Up</button>' +
                    '<button class="ed-btn" id="edBlockDown">⬇️ Move Down</button>' +
                '</div>' +
            '</div>' +
            '<div class="ed-prop"><label>Actions</label>' +
                '<button class="ed-btn ed-full" id="edBlockDupe">📋 Duplicate</button>' +
                '<button class="ed-btn ed-full ed-danger" id="edBlockDelete">🗑️ Delete Block</button>' +
            '</div>';

        // Image-specific sizing
        if (el.classList.contains('bp-figure')) {
            var sizeHTML = '<div class="ed-prop"><label>Size</label>' +
                '<div class="ed-btn-row">' +
                    '<button class="ed-btn' + (el.classList.contains('bp-img-small') ? ' ed-active' : '') + '" id="edSizeS">Small</button>' +
                    '<button class="ed-btn' + (el.classList.contains('bp-img-medium') ? ' ed-active' : '') + '" id="edSizeM">Medium</button>' +
                    '<button class="ed-btn' + (el.classList.contains('bp-img-full') ? ' ed-active' : '') + '" id="edSizeF">Full</button>' +
                '</div></div>';
            panel.innerHTML = panel.innerHTML.replace('</div><div class="ed-prop"><label>Move', sizeHTML + '<div class="ed-prop"><label>Move');

            document.getElementById('edSizeS').onclick = function() { el.className = el.className.replace(/bp-img-\w+/, 'bp-img-small'); };
            document.getElementById('edSizeM').onclick = function() { el.className = el.className.replace(/bp-img-\w+/, 'bp-img-medium'); };
            document.getElementById('edSizeF').onclick = function() { el.className = el.className.replace(/bp-img-\w+/, 'bp-img-full'); };
        }

        var self = this;
        document.getElementById('edBlockUp').onclick = function() { self.moveBlock(el, 'up'); };
        document.getElementById('edBlockDown').onclick = function() { self.moveBlock(el, 'down'); };
        document.getElementById('edBlockDupe').onclick = function() { self.duplicateBlock(el); };
        document.getElementById('edBlockDelete').onclick = function() { self.deleteSelected(); };
    }

    showStickerProps(el) {
        var panel = document.getElementById('edPanelBody');
        panel.innerHTML =
            '<div class="ed-prop"><label>Sticker</label><span class="ed-prop-val">Drag to reposition</span></div>' +
            '<div class="ed-prop"><label>Replace Image</label><button class="ed-btn ed-full" id="edStickerReplace">📁 Choose File</button></div>' +
            '<div class="ed-prop"><label>Size (px)</label><input type="number" class="ed-prop-input" id="edStickerSize" value="' + parseInt(el.style.width || 80) + '" min="20" max="500" step="5"></div>' +
            '<div class="ed-prop"><label>Rotation (deg)</label><input type="range" class="ed-prop-range" id="edStickerRot" min="-180" max="180" value="' + (parseInt(el.dataset.rotation) || 0) + '"><span class="ed-range-val" id="edStickerRotVal">' + (el.dataset.rotation || 0) + '°</span></div>' +
            '<div class="ed-prop"><label>Opacity</label><input type="range" class="ed-prop-range" id="edStickerOp" min="0" max="1" step="0.05" value="' + (el.style.opacity || 1) + '"><span class="ed-range-val" id="edStickerOpVal">' + (el.style.opacity || 1) + '</span></div>' +
            '<div class="ed-prop"><label>Z-Index</label><select class="ed-prop-select" id="edStickerZ">' +
                '<option value="1">Behind content</option>' +
                '<option value="5" selected>Normal</option>' +
                '<option value="20">Above content</option>' +
            '</select></div>' +
            '<div class="ed-prop"><button class="ed-btn ed-full ed-danger" id="edStickerDelete">🗑️ Delete Sticker</button></div>';

        var self = this;
        document.getElementById('edStickerReplace').onclick = function() {
            self.fileInput.onchange = function() {
                if (this.files && this.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var img = el.querySelector('img');
                        if (img) img.src = e.target.result;
                        self.setStatus('Sticker replaced');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            };
            self.fileInput.click();
        };
        document.getElementById('edStickerSize').oninput = function() {
            el.style.width = this.value + 'px';
            el.style.height = this.value + 'px';
        };
        document.getElementById('edStickerRot').oninput = function() {
            el.dataset.rotation = this.value;
            el.style.transform = 'rotate(' + this.value + 'deg)';
            document.getElementById('edStickerRotVal').textContent = this.value + '°';
        };
        document.getElementById('edStickerOp').oninput = function() {
            el.style.opacity = this.value;
            document.getElementById('edStickerOpVal').textContent = this.value;
        };
        document.getElementById('edStickerZ').onchange = function() {
            el.style.zIndex = this.value;
        };
        document.getElementById('edStickerDelete').onclick = function() { self.deleteSelected(); };
    }

    // ═══ CONTEXT MENU ═══

    showContext(e, el) {
        this.contextEl = el;
        var isBlock = el.classList.contains('ed-block');
        var isImg = el.tagName === 'IMG';
        var isSticker = el.classList.contains('ed-sticker');
        var isText = el.classList.contains('ed-editable');

        this.ctx.innerHTML =
            '<button data-action="select">✏️ Select / Edit</button>' +
            (isBlock || isText ? '<button data-action="moveup">⬆️ Move Up</button>' : '') +
            (isBlock || isText ? '<button data-action="movedown">⬇️ Move Down</button>' : '') +
            (isBlock ? '<button data-action="duplicate">📋 Duplicate</button>' : '') +
            (isImg ? '<button data-action="replace">🖼️ Replace Image</button>' : '') +
            (isBlock && el.classList.contains('bp-figure') ? '<button data-action="resize">↔️ Cycle Size</button>' : '') +
            '<hr class="ed-ctx-sep">' +
            '<button data-action="delete" class="ed-ctx-danger">🗑️ Delete</button>';

        this.ctx.style.display = 'block';
        this.ctx.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
        this.ctx.style.top = Math.min(e.clientY, window.innerHeight - 300) + 'px';

        var self = this;
        var btns = this.ctx.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
            (function(btn) {
                btn.onclick = function() {
                    self.handleContextAction(btn.getAttribute('data-action'));
                    self.hideContext();
                };
            })(btns[i]);
        }
    }

    hideContext() {
        this.ctx.style.display = 'none';
        this.contextEl = null;
    }

    handleContextAction(action) {
        var el = this.contextEl;
        if (!el) return;

        switch (action) {
            case 'select':
                this.selectElement(el);
                break;
            case 'moveup':
                this.moveBlock(el, 'up');
                break;
            case 'movedown':
                this.moveBlock(el, 'down');
                break;
            case 'duplicate':
                this.duplicateBlock(el);
                break;
            case 'replace':
                this.selectElement(el);
                var replBtn = document.getElementById('edReplaceImg');
                if (replBtn) replBtn.click();
                break;
            case 'resize':
                if (el.classList.contains('bp-img-full')) {
                    el.className = el.className.replace('bp-img-full', 'bp-img-medium');
                } else if (el.classList.contains('bp-img-medium')) {
                    el.className = el.className.replace('bp-img-medium', 'bp-img-small');
                } else {
                    el.className = el.className.replace('bp-img-small', 'bp-img-full');
                }
                this.setStatus('Size cycled');
                break;
            case 'delete':
                this.selectedEl = el;
                this.deleteSelected();
                break;
        }
    }

    // ═══ ACTIONS ═══

    moveBlock(el, direction) {
        var block = el.closest('.bp-figure, .bp-gallery, .bp-columns, .bp-quote, .bp-text, .bp-heading') || el;
        if (direction === 'up' && block.previousElementSibling) {
            block.parentElement.insertBefore(block, block.previousElementSibling);
            this.setStatus('Moved up');
        } else if (direction === 'down' && block.nextElementSibling) {
            block.parentElement.insertBefore(block.nextElementSibling, block);
            this.setStatus('Moved down');
        }
        this.updateHighlight(block);
    }

    duplicateBlock(el) {
        var block = el.closest('.bp-figure, .bp-gallery, .bp-columns, .bp-quote') || el;
        var clone = block.cloneNode(true);
        block.parentElement.insertBefore(clone, block.nextSibling);
        this.setStatus('Duplicated');
    }

    deleteSelected() {
        if (!this.selectedEl) return;
        var el = this.selectedEl;
        var block = el.closest('.bp-figure, .bp-gallery-item, .bp-gallery, .bp-columns, .bp-quote, .ed-sticker') || el;

        if (block.classList.contains('ed-sticker') || confirm('Delete this element?')) {
            this.pushUndo({ el: block.parentElement, type: 'child', value: block.outerHTML, ref: block.nextElementSibling });
            block.remove();
            this.selectedEl = null;
            this.highlight.style.display = 'none';
            this.hideFormatBar();
            document.getElementById('edPanelBody').innerHTML = '<p class="ed-panel-hint">Element deleted</p>';
            this.setStatus('Deleted');
        }
    }

    // ═══ ADD CONTENT ═══

    findInsertTarget() {
        var expanded = document.querySelector('.bproject.expanded .bproject-content');
        if (!expanded) {
            this.setStatus('⚠️ Expand a Basement project first');
            return null;
        }
        return expanded;
    }

    addImage() {
        var self = this;
        var target = this.findInsertTarget();
        if (!target) return;

        this.fileInput.onchange = function() {
            if (!this.files || !this.files.length) return;
            for (var f = 0; f < this.files.length; f++) {
                (function(file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var figure = document.createElement('figure');
                        figure.className = 'bp-figure bp-img-full ed-block';
                        figure.innerHTML =
                            '<img src="' + e.target.result + '" alt="" class="bp-img ed-interactive">' +
                            '<figcaption class="bp-caption ed-editable" data-ed-original="">Click to add caption</figcaption>';
                        target.appendChild(figure);
                        self.setStatus('Image added: ' + file.name);
                    };
                    reader.readAsDataURL(file);
                })(this.files[f]);
            }
        };
        this.fileInput.click();
    }

    addGallery() {
        var self = this;
        var target = this.findInsertTarget();
        if (!target) return;

        this.fileInput.multiple = true;
        this.fileInput.onchange = function() {
            if (!this.files || !this.files.length) return;
            var gallery = document.createElement('div');
            gallery.className = 'bp-gallery ed-block';
            var loaded = 0;
            for (var f = 0; f < this.files.length; f++) {
                (function(file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var item = document.createElement('figure');
                        item.className = 'bp-gallery-item';
                        item.innerHTML =
                            '<img src="' + e.target.result + '" alt="" class="bp-gallery-img ed-interactive">' +
                            '<figcaption class="bp-caption ed-editable" data-ed-original="">Caption</figcaption>';
                        gallery.appendChild(item);
                        loaded++;
                        if (loaded === self.fileInput.files.length) {
                            self.setStatus('Gallery added with ' + loaded + ' images');
                        }
                    };
                    reader.readAsDataURL(file);
                })(this.files[f]);
            }
            target.appendChild(gallery);
        };
        this.fileInput.click();
    }

    addTextBlock() {
        var target = this.findInsertTarget();
        if (!target) return;
        var p = document.createElement('p');
        p.className = 'bp-text ed-editable ed-block';
        p.textContent = 'Click to edit this text...';
        p.setAttribute('data-ed-original', '');
        target.appendChild(p);
        this.selectElement(p);
        this.setStatus('Text block added');
    }

    addHeading() {
        var target = this.findInsertTarget();
        if (!target) return;
        var h = document.createElement('h4');
        h.className = 'bp-heading ed-editable ed-block';
        h.textContent = 'New Heading';
        h.setAttribute('data-ed-original', '');
        target.appendChild(h);
        this.selectElement(h);
        this.setStatus('Heading added');
    }

    addQuoteBlock() {
        var target = this.findInsertTarget();
        if (!target) return;
        var quote = document.createElement('blockquote');
        quote.className = 'bp-quote ed-block';
        quote.innerHTML = '<p class="ed-editable" data-ed-original="">Click to edit quote...</p><cite class="ed-editable" data-ed-original="">— Author</cite>';
        target.appendChild(quote);
        this.setStatus('Quote added');
    }

    addColumnsBlock() {
        var target = this.findInsertTarget();
        if (!target) return;
        var cols = document.createElement('div');
        cols.className = 'bp-columns ed-block';
        cols.innerHTML =
            '<div class="bp-col"><p class="bp-text ed-editable ed-block" data-ed-original="">Left column text...</p></div>' +
            '<div class="bp-col"><p class="bp-text ed-editable ed-block" data-ed-original="">Right column text...</p></div>';
        target.appendChild(cols);
        this.setStatus('Columns added');
    }

    addSticker() {
        var self = this;
        var expanded = document.querySelector('.bproject.expanded');
        if (!expanded) {
            this.setStatus('⚠️ Expand a Basement project first');
            return;
        }

        this.fileInput.onchange = function() {
            if (this.files && this.files[0]) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var sticker = document.createElement('div');
                    sticker.className = 'ed-sticker';
                    sticker.dataset.rotation = '0';
                    sticker.style.cssText = 'position:absolute;left:50px;top:50px;width:80px;height:80px;z-index:5;cursor:grab;';
                    sticker.innerHTML =
                        '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">' +
                        '<button class="ed-sticker-delete" title="Delete">✕</button>';

                    // Make sure parent is position:relative
                    expanded.style.position = 'relative';
                    expanded.appendChild(sticker);

                    sticker.querySelector('.ed-sticker-delete').onclick = function(ev) {
                        ev.stopPropagation();
                        sticker.remove();
                        self.setStatus('Sticker removed');
                    };

                    self.setStatus('Sticker added — drag to position');
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
        this.fileInput.click();
    }

    // ═══ UNDO ═══

    pushUndo(item) {
        this.undoStack.push(item);
        if (this.undoStack.length > 50) this.undoStack.shift();
    }

    undo() {
        if (!this.undoStack.length) { this.setStatus('Nothing to undo'); return; }
        var item = this.undoStack.pop();
        switch (item.type) {
            case 'html':
                item.el.innerHTML = item.value;
                break;
            case 'attr':
                item.el.setAttribute(item.attr, item.value);
                break;
            case 'child':
                var temp = document.createElement('div');
                temp.innerHTML = item.value;
                var restored = temp.firstChild;
                if (item.ref) {
                    item.el.insertBefore(restored, item.ref);
                } else {
                    item.el.appendChild(restored);
                }
                break;
        }
        this.setStatus('Undone');
    }

    setStatus(msg) {
        var s = document.getElementById('edStatus');
        if (s) {
            s.textContent = msg;
            s.classList.add('ed-flash');
            setTimeout(function() { s.classList.remove('ed-flash'); }, 300);
        }
    }

    // ═══ EXPORT ═══

    exportChanges() {
        var changes = [];
        var editables = document.querySelectorAll('[data-ed-original]');
        for (var i = 0; i < editables.length; i++) {
            var el = editables[i];
            var original = el.getAttribute('data-ed-original');
            if (original !== el.innerHTML) {
                changes.push({ selector: this.getSelector(el), original: original, current: el.innerHTML });
            }
        }

        var projectData = [];
        var bps = document.querySelectorAll('.bproject');
        for (var i = 0; i < bps.length; i++) {
            var content = bps[i].querySelector('.bproject-content');
            if (!content) continue;
            var blocks = [];
            for (var j = 0; j < content.children.length; j++) {
                var child = content.children[j];
                if (child.classList.contains('bp-text')) blocks.push({ type: 'text', text: child.innerHTML });
                else if (child.classList.contains('bp-heading')) blocks.push({ type: 'heading', text: child.innerHTML });
                else if (child.classList.contains('bp-figure')) {
                    var img = child.querySelector('img');
                    var cap = child.querySelector('.bp-caption');
                    blocks.push({ type: 'image', src: img ? img.src.substring(0, 100) : '', caption: cap ? cap.textContent : '', size: child.classList.contains('bp-img-small') ? 'small' : child.classList.contains('bp-img-medium') ? 'medium' : 'full' });
                }
                else if (child.classList.contains('bp-gallery')) {
                    var imgs = [];
                    var items = child.querySelectorAll('.bp-gallery-item');
                    for (var k = 0; k < items.length; k++) {
                        var gi = items[k].querySelector('img');
                        var gc = items[k].querySelector('.bp-caption');
                        imgs.push({ src: gi ? gi.src.substring(0, 100) : '', caption: gc ? gc.textContent : '' });
                    }
                    blocks.push({ type: 'gallery', images: imgs });
                }
                else if (child.classList.contains('bp-quote')) {
                    var qp = child.querySelector('p');
                    var qc = child.querySelector('cite');
                    blocks.push({ type: 'quote', text: qp ? qp.textContent : '', author: qc ? qc.textContent.replace('— ', '') : '' });
                }
                else if (child.classList.contains('bp-columns')) {
                    blocks.push({ type: 'columns', html: child.innerHTML });
                }
            }
            // Stickers
            var stickers = bps[i].querySelectorAll('.ed-sticker');
            var stickerData = [];
            for (var s = 0; s < stickers.length; s++) {
                var st = stickers[s];
                var stImg = st.querySelector('img');
                stickerData.push({
                    src: stImg ? stImg.src.substring(0, 100) : '',
                    left: st.style.left,
                    top: st.style.top,
                    width: st.style.width,
                    rotation: st.dataset.rotation || '0',
                    opacity: st.style.opacity || '1',
                    zIndex: st.style.zIndex || '5'
                });
            }
            projectData.push({ id: bps[i].id, content: blocks, stickers: stickerData });
        }

        var exportData = {
            timestamp: new Date().toISOString(),
            textChanges: changes,
            projects: projectData
        };

        var json = JSON.stringify(exportData, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'site-changes-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.setStatus('Exported: ' + changes.length + ' text changes, ' + projectData.length + ' projects');
    }

    getSelector(el) {
        var path = [];
        while (el && el !== document.body) {
            var s = el.tagName.toLowerCase();
            if (el.id) { path.unshift('#' + el.id); break; }
            if (el.className) {
                var c = el.className.split(' ').filter(function(x) { return x && !x.startsWith('ed-'); });
                if (c.length) s += '.' + c[0];
            }
            path.unshift(s);
            el = el.parentElement;
        }
        return path.join(' > ');
    }
}

var _editor = null;
document.addEventListener('DOMContentLoaded', function() {
    _editor = new LiveEditor();
});