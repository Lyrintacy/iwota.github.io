/* ═══════ AMENDMENTS LOADER — Auto-applies changes from amendments.json ═══════ */
(function(){
    'use strict';
    
    var AMENDMENTS_URL = './js/amendments/amendments.json';
    var storedAmendments = null;
    
    // Inject styles
    var style = document.createElement('style');
    style.textContent = 
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}' +
        '.bproject-stickers .ed-sticker,.bproject-stickers .amendment-sticker{pointer-events:none!important}' +
        '.amendment-sticker img{pointer-events:none!important}' +
        '.fancy,.alt-font,.font-display{font-family:var(--font-display),cursive}' +
        '.amendment-divider{pointer-events:none}' +
        '.whisper{font-size:0.85em;opacity:0.6;font-style:italic}';
    document.head.appendChild(style);
    
    function loadAmendments(){
        fetch(AMENDMENTS_URL)
            .then(function(response){
                if(!response.ok) throw new Error('No amendments file');
                return response.json();
            })
            .then(function(data){
                storedAmendments = data;
                
                // Apply project order FIRST
                if(data.projectOrder && data.projectOrder.length){
                    applyProjectOrder(data.projectOrder);
                }
                
                applyAmendments(data);
                setupProjectObserver();
                console.log('✅ Amendments loaded:', data._exported || 'unknown date');
            })
            .catch(function(err){
                console.log('ℹ️ No amendments to load');
            });
    }
    
    // Apply project order to both projects and thumbnails
    function applyProjectOrder(order){
        if(!order || !order.length) return;
        
        // Find project container
        var firstProject = document.querySelector('.bproject');
        if(!firstProject) return;
        var projectContainer = firstProject.parentElement;
        
        // Find thumbnail container (adjust selectors to match your HTML)
        var thumbContainer = document.querySelector('.games-grid, .project-thumbs, .pcard-container, .basement-thumbs, .games-section .grid');
        
        var reorderedProjects = 0;
        var reorderedThumbs = 0;
        
        // Reorder projects
        for(var i = 0; i < order.length; i++){
            var projectId = order[i];
            var project = document.querySelector('.bproject[data-project-id="' + projectId + '"]');
            if(project){
                projectContainer.appendChild(project);
                reorderedProjects++;
            }
        }
        
        // Reorder thumbnails to match
        if(thumbContainer){
            for(var i = 0; i < order.length; i++){
                var projectId = order[i];
                // Try different selector patterns for thumbnails
                var thumb = thumbContainer.querySelector(
                    '[data-project-id="' + projectId + '"],' +
                    '[data-target="' + projectId + '"],' +
                    '[href="#' + projectId + '"],' +
                    '.pcard[data-project="' + projectId + '"]'
                );
                if(thumb){
                    thumbContainer.appendChild(thumb);
                    reorderedThumbs++;
                }
            }
        }
        
        if(reorderedProjects > 0){
            console.log('📋 Reordered ' + reorderedProjects + ' projects' + 
                       (reorderedThumbs > 0 ? ' and ' + reorderedThumbs + ' thumbnails' : ''));
        }
    }
    
    function applyAmendments(data){
        var applied = 0;
        
        // Apply text changes
        if(data.textChanges && data.textChanges.length){
            data.textChanges.forEach(function(change){
                try {
                    var el = document.querySelector(change.selector);
                    if(el){
                        if(change.newTag && el.tagName.toLowerCase() !== change.newTag.toLowerCase()){
                            el = convertElement(el, change);
                        } else {
                            el.innerHTML = change.content;
                            if(change.styles) el.setAttribute('style', change.styles);
                            if(change.classes) applyClasses(el, change.classes);
                        }
                        applied++;
                    }
                } catch(e){ console.warn('Amendment selector failed:', change.selector, e); }
            });
        }
        
        // Apply image changes
        if(data.images && data.images.length){
            data.images.forEach(function(img){
                try {
                    var el = document.querySelector(img.selector);
                    if(el && el.tagName === 'IMG'){
                        el.src = img.src;
                        if(img.alt) el.alt = img.alt;
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Apply stickers
        if(data.stickers && data.stickers.length){
            data.stickers.forEach(function(sticker){
                if(applySticker(sticker)) applied++;
            });
        }
        
        // Apply dividers
        if(data.dividers && data.dividers.length){
            data.dividers.forEach(function(divider){
                try {
                    var parent = document.querySelector(divider.parentSelector);
                    if(parent){
                        var existingDividers = parent.querySelectorAll('.amendment-divider');
                        var isDupe = false;
                        for(var i = 0; i < existingDividers.length; i++){
                            if(existingDividers[i].getAttribute('style') === divider.styles){
                                isDupe = true;
                                break;
                            }
                        }
                        if(!isDupe){
                            var div = document.createElement('div');
                            div.className = 'ed-divider amendment-divider';
                            div.setAttribute('style', divider.styles);
                            if(divider.position !== undefined && parent.children[divider.position]){
                                parent.insertBefore(div, parent.children[divider.position]);
                            } else {
                                parent.appendChild(div);
                            }
                            applied++;
                        }
                    }
                } catch(e){ console.warn('Divider failed:', e); }
            });
        }
        
        // Apply link blocks
        if(data.links && data.links.length){
            data.links.forEach(function(link){
                try {
                    var parent = document.querySelector(link.parentSelector);
                    if(parent){
                        var existingLinks = parent.querySelectorAll('.amendment-link a');
                        var isDupe = false;
                        for(var i = 0; i < existingLinks.length; i++){
                            if(existingLinks[i].href === link.href && existingLinks[i].textContent === link.text){
                                isDupe = true;
                                break;
                            }
                        }
                        if(!isDupe){
                            var wrapper = document.createElement('div');
                            wrapper.className = 'ed-link-block amendment-link';
                            wrapper.style.cssText = 'margin:16px 0;';
                            
                            var a = document.createElement('a');
                            a.href = link.href;
                            a.textContent = link.text;
                            a.className = link.className || 'btn';
                            a.target = link.target || '_blank';
                            a.rel = 'noopener noreferrer';
                            
                            wrapper.appendChild(a);
                            if(link.position !== undefined && parent.children[link.position]){
                                parent.insertBefore(wrapper, parent.children[link.position]);
                            } else {
                                parent.appendChild(wrapper);
                            }
                            applied++;
                        }
                    }
                } catch(e){ console.warn('Link failed:', e); }
            });
        }
        
        // Apply new blocks
        if(data.newBlocks && data.newBlocks.length){
            data.newBlocks.forEach(function(block){
                try {
                    var parent = document.querySelector(block.parentSelector);
                    if(parent){
                        var temp = document.createElement('div');
                        temp.innerHTML = block.html;
                        while(temp.firstChild){
                            if(block.position !== undefined && parent.children[block.position]){
                                parent.insertBefore(temp.firstChild, parent.children[block.position]);
                            } else {
                                parent.appendChild(temp.firstChild);
                            }
                        }
                        applied++;
                    }
                } catch(e){}
            });
        }
        
        // Apply element conversions
        if(data.conversions && data.conversions.length){
            data.conversions.forEach(function(conv){
                try {
                    var el = document.querySelector(conv.selector);
                    if(el){
                        convertElement(el, conv);
                        applied++;
                    }
                } catch(e){ console.warn('Conversion failed:', e); }
            });
        }
        
        if(applied > 0){
            console.log('📝 Applied ' + applied + ' amendments');
        }
    }
    
    function applyClasses(el, classString){
        var newClasses = classString.split(' ').filter(function(c){
            return c && !c.startsWith('ed-') && c !== 'expanded';
        });
        var preserve = ['bproject', 'bproject-content', 'bp-figure', 'bp-gallery'];
        var existing = Array.from(el.classList).filter(function(c){
            return preserve.indexOf(c) !== -1;
        });
        var finalClasses = existing.concat(newClasses.filter(function(c){
            return existing.indexOf(c) === -1;
        }));
        el.className = finalClasses.join(' ');
    }
    
    function convertElement(el, conversion){
        var newTag = conversion.newTag || guessTagFromClasses(conversion.classes);
        if(!newTag) return el;
        
        var parent = el.parentElement;
        var nextSib = el.nextElementSibling;
        
        var newEl = document.createElement(newTag);
        newEl.innerHTML = conversion.content || el.innerHTML;
        
        if(conversion.styles) newEl.setAttribute('style', conversion.styles);
        if(conversion.classes) applyClasses(newEl, conversion.classes);
        
        for(var key in el.dataset){
            newEl.dataset[key] = el.dataset[key];
        }
        
        if(nextSib){
            parent.insertBefore(newEl, nextSib);
        } else {
            parent.appendChild(newEl);
        }
        el.remove();
        
        return newEl;
    }
    
    function guessTagFromClasses(classes){
        if(!classes) return null;
        if(classes.includes('bp-heading') || classes.includes('section-title')) return 'h4';
        if(classes.includes('bp-quote')) return 'blockquote';
        return 'p';
    }
    
    function applySticker(sticker){
        try {
            var projectCard = null;
            var stickerLayer = null;
            
            if(sticker.projectId){
                projectCard = document.querySelector('.bproject[data-project-id="' + sticker.projectId + '"]');
            }
            
            if(!projectCard && sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    projectCard = stickerLayer.closest('.bproject');
                }
            }
            
            if(projectCard){
                stickerLayer = projectCard.querySelector('.bproject-stickers');
                if(!stickerLayer){
                    stickerLayer = document.createElement('div');
                    stickerLayer.className = 'bproject-stickers';
                    projectCard.appendChild(stickerLayer);
                }
                projectCard.style.position = 'relative';
            } else if(sticker.parentSelector){
                stickerLayer = document.querySelector(sticker.parentSelector);
                if(stickerLayer){
                    stickerLayer.style.position = 'relative';
                }
            }
            
            if(!stickerLayer){
                console.warn('Sticker: Could not find parent for', sticker.projectId || sticker.parentSelector);
                return false;
            }
            
            var existingStickers = stickerLayer.querySelectorAll('.ed-sticker, .amendment-sticker');
            for(var i = 0; i < existingStickers.length; i++){
                var existing = existingStickers[i];
                var existingImg = existing.querySelector('img');
                if(existing.style.left === sticker.position.left && 
                   existing.style.top === sticker.position.top &&
                   existingImg && existingImg.src === sticker.src){
                    return false;
                }
            }
            
            var div = document.createElement('div');
            div.className = 'ed-sticker amendment-sticker';
            div.dataset.rotation = sticker.rotation || '0';
            div.dataset.z = sticker.layer || 'normal';
            if(sticker.projectId) div.dataset.projectId = sticker.projectId;
            
            var styles = [
                'position:absolute',
                'left:' + (sticker.position.left || '50px'),
                'top:' + (sticker.position.top || '150px'),
                'width:' + (sticker.size.width || '80px'),
                'height:' + (sticker.size.height || '80px'),
                'z-index:' + (sticker.zIndex || '10'),
                'opacity:' + (sticker.opacity || '1'),
                'transform:rotate(' + (sticker.rotation || '0') + 'deg)',
                'pointer-events:none'
            ];
            div.style.cssText = styles.join(';');
            
            var img = document.createElement('img');
            img.src = sticker.src;
            img.alt = '';
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.draggable = false;
            div.appendChild(img);
            
            stickerLayer.appendChild(div);
            return true;
            
        } catch(e){ 
            console.warn('Sticker failed:', e); 
            return false;
        }
    }
    
    function setupProjectObserver(){
        if(!storedAmendments) return;
        
        var hasContent = (storedAmendments.stickers && storedAmendments.stickers.length) ||
                        (storedAmendments.dividers && storedAmendments.dividers.length) ||
                        (storedAmendments.links && storedAmendments.links.length) ||
                        (storedAmendments.textChanges && storedAmendments.textChanges.length);
        
        if(!hasContent) return;
        
        var projects = document.querySelectorAll('.bproject');
        if(!projects.length) return;
        
        var observer = new MutationObserver(function(mutations){
            mutations.forEach(function(mutation){
                if(mutation.type === 'attributes' && mutation.attributeName === 'class'){
                    var target = mutation.target;
                    if(target.classList.contains('bproject') && target.classList.contains('expanded')){
                        setTimeout(function(){
                            var projectId = target.dataset.projectId;
                            if(projectId){
                                reapplyAmendmentsForProject(projectId, target);
                            }
                        }, 100);
                    }
                }
            });
        });
        
        projects.forEach(function(project){
            observer.observe(project, { attributes: true, attributeFilter: ['class'] });
        });
    }
    
    function reapplyAmendmentsForProject(projectId, projectEl){
        if(!storedAmendments) return;
        var applied = 0;
        
        if(storedAmendments.stickers){
            var existingStickers = projectEl.querySelectorAll('.amendment-sticker');
            if(existingStickers.length === 0){
                storedAmendments.stickers.forEach(function(sticker){
                    if(sticker.projectId === projectId){
                        if(applySticker(sticker)) applied++;
                    }
                });
            }
        }
        
        if(storedAmendments.textChanges){
            storedAmendments.textChanges.forEach(function(change){
                if(change.selector.includes(projectId)){
                    try {
                        var el = projectEl.querySelector(change.selector) || 
                                 document.querySelector(change.selector);
                        if(el){
                            el.innerHTML = change.content;
                            if(change.styles) el.setAttribute('style', change.styles);
                            if(change.classes) applyClasses(el, change.classes);
                            applied++;
                        }
                    } catch(e){}
                }
            });
        }
        
        if(storedAmendments.dividers){
            var existingDividers = projectEl.querySelectorAll('.amendment-divider');
            if(existingDividers.length === 0){
                storedAmendments.dividers.forEach(function(divider){
                    if(divider.parentSelector.includes(projectId)){
                        try {
                            var parent = document.querySelector(divider.parentSelector);
                            if(parent){
                                var div = document.createElement('div');
                                div.className = 'ed-divider amendment-divider';
                                div.setAttribute('style', divider.styles);
                                parent.appendChild(div);
                                applied++;
                            }
                        } catch(e){}
                    }
                });
            }
        }
        
        if(storedAmendments.links){
            var existingLinks = projectEl.querySelectorAll('.amendment-link');
            if(existingLinks.length === 0){
                storedAmendments.links.forEach(function(link){
                    if(link.parentSelector.includes(projectId)){
                        try {
                            var parent = document.querySelector(link.parentSelector);
                            if(parent){
                                var wrapper = document.createElement('div');
                                wrapper.className = 'ed-link-block amendment-link';
                                wrapper.style.cssText = 'margin:16px 0;';
                                
                                var a = document.createElement('a');
                                a.href = link.href;
                                a.textContent = link.text;
                                a.className = link.className || 'btn';
                                a.target = link.target || '_blank';
                                a.rel = 'noopener noreferrer';
                                
                                wrapper.appendChild(a);
                                parent.appendChild(wrapper);
                                applied++;
                            }
                        } catch(e){}
                    }
                });
            }
        }
        
        if(applied > 0){
            console.log('📌 Re-applied ' + applied + ' amendments to project:', projectId);
        }
    }
    
    // Load when DOM is ready
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', loadAmendments);
    } else {
        loadAmendments();
    }
})();