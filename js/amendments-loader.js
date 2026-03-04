/* ═══════ AMENDMENTS LOADER v6 — Fixed Selectors ═══════ */
(function(){
    'use strict';

    var AMENDMENTS_FOLDER='./js/amendments/';
    var AMENDMENTS_FILES=[
        'amendments.json',
        'amendments-001.json',
        'amendments-002.json',
        'amendments-003.json',
        'amendments-004.json',
        'amendments-005.json'
    ];

    var DEBUG=true;

    window.LOADED_AMENDMENTS={stickers:{},textChanges:{},dividers:{},links:{},images:{},projectOrder:null,_loaded:false};

    var storedAmendments=null;
    var mergedAmendments={textChanges:{},stickers:{},dividers:{},links:{},images:{},projectOrder:null};

    var style=document.createElement('style');
    style.textContent=
        '.bproject-stickers{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none!important;overflow:visible;z-index:50}'+
        '.amendment-sticker,.amendment-sticker *{pointer-events:none!important}'+
        '.fancy{font-family:var(--font-display),cursive}'+
        '.amendment-divider{pointer-events:none}';
    document.head.appendChild(style);

    function log(){if(DEBUG)console.log.apply(console,arguments);}

    function loadAllAmendments(){
        var loadedCount=0;
        AMENDMENTS_FILES.forEach(function(filename){
            try{
                var xhr=new XMLHttpRequest();
                xhr.open('GET',AMENDMENTS_FOLDER+filename,false);
                xhr.send(null);
                if(xhr.status===200){
                    var data=JSON.parse(xhr.responseText);
                    smartMerge(data);
                    loadedCount++;
                    log('✅ Loaded:',filename);
                }
            }catch(e){}
        });

        if(loadedCount>0){
            storedAmendments=finalizeAmendments();
            window.LOADED_AMENDMENTS={
                stickers:Object.assign({},mergedAmendments.stickers),
                textChanges:Object.assign({},mergedAmendments.textChanges),
                dividers:Object.assign({},mergedAmendments.dividers),
                links:Object.assign({},mergedAmendments.links),
                images:Object.assign({},mergedAmendments.images),
                projectOrder:mergedAmendments.projectOrder,
                _loaded:true
            };

            if(storedAmendments.projectOrder&&typeof PROJECTS!=='undefined'){
                reorderArray(PROJECTS,storedAmendments.projectOrder);
                log('📋 Reordered PROJECTS array');
            }

            log('📦 Merged',loadedCount,'amendment file(s)');
            log('📝 Text changes:',storedAmendments.textChanges.length);
            log('🎨 Stickers:',storedAmendments.stickers.length);

            scheduleVisualChanges(storedAmendments);
        }else{
            window.LOADED_AMENDMENTS._loaded=true;
            log('ℹ️ No amendments found');
        }
    }

    function smartMerge(data){
        if(data.textChanges){
            data.textChanges.forEach(function(change){
                var key=(change.projectId||'static')+'|'+change.selector;
                mergedAmendments.textChanges[key]=change;
            });
        }
        if(data.stickers){
            data.stickers.forEach(function(sticker){
                var key=(sticker.projectId||'global')+'|'+sticker.position.left+'|'+sticker.position.top;
                mergedAmendments.stickers[key]=sticker;
            });
        }
        if(data.dividers){
            data.dividers.forEach(function(d){mergedAmendments.dividers[d.parentSelector]=d;});
        }
        if(data.links){
            data.links.forEach(function(l){mergedAmendments.links[l.parentSelector+'|'+l.href]=l;});
        }
        if(data.images){
            data.images.forEach(function(img){mergedAmendments.images[img.selector]=img;});
        }
        if(data.projectOrder)mergedAmendments.projectOrder=data.projectOrder;
    }

    function finalizeAmendments(){
        return{
            textChanges:Object.values(mergedAmendments.textChanges),
            stickers:Object.values(mergedAmendments.stickers),
            dividers:Object.values(mergedAmendments.dividers),
            links:Object.values(mergedAmendments.links),
            images:Object.values(mergedAmendments.images),
            projectOrder:mergedAmendments.projectOrder
        };
    }

    function reorderArray(arr,orderIds){
        var orderMap={};
        orderIds.forEach(function(id,i){orderMap[id]=i;});
        arr.sort(function(a,b){return(orderMap[a.id]||999)-(orderMap[b.id]||999);});
    }

    function scheduleVisualChanges(data){
        if(document.readyState==='loading'){
            document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){applyAll(data);},500);});
        }else{
            setTimeout(function(){applyAll(data);},500);
        }
    }

    function applyAll(data){
        log('🎨 Applying amendments to DOM...');
        var applied=0;
        if(data.textChanges)data.textChanges.forEach(function(c){if(applyTextChange(c))applied++;});
        if(data.stickers)data.stickers.forEach(function(s){if(applySticker(s))applied++;});
        if(data.dividers)data.dividers.forEach(function(d){if(applyDivider(d))applied++;});
        if(data.links)data.links.forEach(function(l){if(applyLink(l))applied++;});
        if(data.images){
            data.images.forEach(function(img){
                try{var el=document.querySelector(img.selector);if(el&&el.tagName==='IMG'){el.src=img.src;applied++;}}catch(e){}
            });
        }
        if(data.projectOrder)reorderDOM(data.projectOrder);
        setupProjectObserver();
        log('✅ Applied',applied,'amendments');
    }

    // ══════════════════════════════════════════════════════════════
    // FIXED: applyTextChange with smart fallback finder
    // ══════════════════════════════════════════════════════════════
    function applyTextChange(change){
        try{
            var el=findElement(change);
            if(el){
                el.innerHTML=change.content;
                if(change.styles)el.style.cssText=change.styles;
                // Restore non-ed classes
                if(change.classes){
                    change.classes.split(' ').forEach(function(c){
                        if(c&&!c.startsWith('ed-')&&c!=='expanded')el.classList.add(c);
                    });
                }
                log('  ✓ Text applied for:',change.projectId,'— idx:',change.selector.match(/data-ed-idx="(\d+)"/)?change.selector.match(/data-ed-idx="(\d+)"/)[1]:'direct');
                return true;
            }else{
                log('  ⚠️ Element not found for:',change.projectId,change.selector.substring(0,60));
                return false;
            }
        }catch(e){log('  ❌ Error:',e.message);return false;}
    }

    function findElement(change){
        // Strategy 1: direct querySelector (works for new data-ed-idx format)
        if(change.selector){
            try{
                var el=document.querySelector(change.selector);
                if(el)return el;
            }catch(e){}
        }

        // Strategy 2: if selector has data-ed-idx, find by index in project
        if(change.selector&&change.selector.includes('data-ed-idx')){
            return findByIndex(change);
        }

        // Strategy 3: old nth-of-type selectors — convert to index-based search
        if(change.selector&&change.selector.includes('nth-of-type')){
            return findByNthFallback(change);
        }

        // Strategy 4: find by projectId + class only
        if(change.projectId&&change.classes){
            return findByProjectAndClass(change);
        }

        return null;
    }

    function findByIndex(change){
        // Extract: projectId, containerClass, tag.class, index
        var idxMatch=change.selector.match(/data-ed-idx="(\d+)"/);
        if(!idxMatch)return null;
        var idx=parseInt(idxMatch[1]);

        var project=document.querySelector('[data-project-id="'+change.projectId+'"]');
        if(!project)return null;

        // Extract element selector part (tag.class)
        var elMatch=change.selector.match(/\]\s*\.[\w-]+\s+([\w.]+)\[data-ed-idx/);
        if(!elMatch)return null;
        var elSelector=elMatch[1];

        // Find container
        var containerMatch=change.selector.match(/\]\s*\.([\w-]+)\s+/);
        if(!containerMatch)return null;
        var containerClass=containerMatch[1];

        var container=project.querySelector('.'+containerClass);
        if(!container)return null;

        var candidates=Array.from(container.querySelectorAll(elSelector));
        return candidates[idx]||null;
    }

    function findByNthFallback(change){
        // Old format: [data-project-id="x"] .container tag.class:nth-of-type(n)
        var project=document.querySelector('[data-project-id="'+change.projectId+'"]');
        if(!project)return null;

        // Extract nth index
        var nthMatch=change.selector.match(/:nth-of-type\((\d+)\)/);
        var idx=nthMatch?parseInt(nthMatch[1])-1:0;

        // Extract tag and class
        var tagClassMatch=change.selector.match(/(\w+)\.([\w-]+):nth-of-type/);
        if(!tagClassMatch)return null;
        var tag=tagClassMatch[1];
        var cls=tagClassMatch[2];

        // Find in content
        var content=project.querySelector('.bproject-content');
        if(!content)return null;

        // Get all elements with this tag+class
        var candidates=Array.from(content.querySelectorAll(tag+'.'+cls));
        log('  📍 Fallback nth search:',tag+'.'+cls,'found',candidates.length,'candidates, want index',idx);
        return candidates[idx]||candidates[0]||null;
    }

    function findByProjectAndClass(change){
        var project=document.querySelector('[data-project-id="'+change.projectId+'"]');
        if(!project)return null;
        var mainClass=change.classes.split(' ').find(function(c){return c&&!c.startsWith('ed-');});
        if(!mainClass)return null;
        return project.querySelector('.'+mainClass)||null;
    }

    // ══════════════════════════════════════════════════════════════
    // FIXED: applySticker with better debug
    // ══════════════════════════════════════════════════════════════
    function applySticker(sticker){
        try{
            var project=document.querySelector('[data-project-id="'+sticker.projectId+'"]');
            if(!project){
                log('  ❌ Sticker: project not found:',sticker.projectId);
                log('  Available IDs:',Array.from(document.querySelectorAll('[data-project-id]')).map(function(el){return el.dataset.projectId;}));
                return false;
            }

            project.style.position='relative';

            var layer=project.querySelector('.bproject-stickers');
            if(!layer){
                layer=document.createElement('div');
                layer.className='bproject-stickers';
                project.insertBefore(layer,project.firstChild);
            }

            // Deduplicate
            var existing=layer.querySelectorAll('.amendment-sticker');
            for(var i=0;i<existing.length;i++){
                if(existing[i].style.left===sticker.position.left&&existing[i].style.top===sticker.position.top)return false;
            }

            var div=document.createElement('div');
            div.className='ed-sticker amendment-sticker';
            div.dataset.amendmentLoaded='true';
            div.dataset.projectId=sticker.projectId;
            div.style.cssText=
                'position:absolute;'+
                'left:'+sticker.position.left+';'+
                'top:'+sticker.position.top+';'+
                'width:'+sticker.size.width+';'+
                'height:'+sticker.size.height+';'+
                'z-index:'+(sticker.zIndex||10)+';'+
                'opacity:'+(sticker.opacity||1)+';'+
                'transform:rotate('+(sticker.rotation||0)+'deg);'+
                'pointer-events:none;';

            var img=document.createElement('img');
            img.src=sticker.src;
            img.style.cssText='width:100%;height:100%;object-fit:contain;pointer-events:none;';
            img.onerror=function(){log('  ❌ Sticker img failed:',sticker.src.substring(0,60));};

            div.appendChild(img);
            layer.appendChild(div);
            return true;
        }catch(e){log('  ❌ Sticker error:',e.message);return false;}
    }

    function applyDivider(divider){
        try{
            var parent=document.querySelector(divider.parentSelector);if(!parent)return false;
            if(parent.querySelector('.amendment-divider'))return false;
            var div=document.createElement('div');div.className='ed-divider amendment-divider';div.dataset.amendmentLoaded='true';div.style.cssText=divider.styles;
            parent.appendChild(div);return true;
        }catch(e){return false;}
    }

    function applyLink(link){
        try{
            var parent=document.querySelector(link.parentSelector);if(!parent)return false;
            if(parent.querySelector('.amendment-link a[href="'+link.href+'"]'))return false;
            var wrapper=document.createElement('div');wrapper.className='ed-link-block amendment-link';wrapper.dataset.amendmentLoaded='true';wrapper.style.margin='16px 0';
            var a=document.createElement('a');a.href=link.href;a.textContent=link.text;a.className=link.className||'btn';a.target=link.target||'_blank';
            wrapper.appendChild(a);parent.appendChild(wrapper);return true;
        }catch(e){return false;}
    }

    function reorderDOM(order){
        var container=document.querySelector('.basement-projects,#basementProjects');
        if(container){order.forEach(function(id){var el=container.querySelector('[data-project-id="'+id+'"]');if(el)container.appendChild(el);});}
        var grid=document.querySelector('.pgrid,#projectGrid');
        if(grid){order.forEach(function(id){var el=grid.querySelector('[data-project-id="'+id+'"],[data-target="'+id+'"]');if(el)grid.appendChild(el);});}
    }

    function setupProjectObserver(){
        if(!storedAmendments)return;
        var observer=new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                var target=m.target;
                if(target.classList.contains('bproject')&&target.classList.contains('expanded')){
                    setTimeout(function(){reapplyForProject(target.dataset.projectId);},200);
                }
            });
        });
        document.querySelectorAll('.bproject').forEach(function(p){
            observer.observe(p,{attributes:true,attributeFilter:['class']});
        });
        log('👁️ Watching for project expansions');
    }

    function reapplyForProject(projectId){
        if(!storedAmendments||!projectId)return;
        var applied=0;
        log('📌 Re-applying amendments for:',projectId);

        // Stamp idx attributes on newly rendered content
        var project=document.querySelector('[data-project-id="'+projectId+'"]');
        if(project){
            project.querySelectorAll('.bproject-content,.bproject-header-text,.bproject-meta').forEach(function(container){
                var groups={};
                Array.from(container.children).forEach(function(child){
                    var tag=child.tagName.toLowerCase();
                    var mainClass='';
                    for(var i=0;i<child.classList.length;i++){
                        var c=child.classList[i];
                        if(!c.startsWith('ed-')&&c!=='expanded'){mainClass=c;break;}
                    }
                    var key=mainClass?tag+'.'+mainClass:tag;
                    if(!groups[key])groups[key]=[];
                    groups[key].push(child);
                });
                Object.keys(groups).forEach(function(key){
                    groups[key].forEach(function(el,idx){el.setAttribute('data-ed-idx',idx);});
                });
            });
        }

        storedAmendments.textChanges.forEach(function(c){if(c.projectId===projectId&&applyTextChange(c))applied++;});
        storedAmendments.stickers.forEach(function(s){if(s.projectId===projectId&&applySticker(s))applied++;});
        storedAmendments.dividers.forEach(function(d){if(d.parentSelector.includes(projectId)&&applyDivider(d))applied++;});
        storedAmendments.links.forEach(function(l){if(l.parentSelector.includes(projectId)&&applyLink(l))applied++;});

        log('  Applied',applied,'items');
    }

    loadAllAmendments();
})();