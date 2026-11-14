/** Run only in the review browser after real viewport/selection checks.
 * Exports the actual mounted canvas, without cloning or recomputing layout.
 * Expand the browser viewport to the returned dimensions before screenshot.
 */
function exportWorkbench(){
 const scene=document.querySelector('.restoration-scene.is-focused');
 if(!scene)throw Error('Open actual focus view first');
 const canvas=scene.querySelector('.restoration-scene-canvas'),pan=scene.querySelector('.restoration-scene-pan');
 const panels=[...canvas.querySelectorAll('[data-scene-region]')];
 const width=Math.ceil(Math.max(...panels.map(p=>p.offsetLeft+p.offsetWidth))+12),height=Math.ceil(Math.max(...panels.map(p=>p.offsetTop+p.offsetHeight))+12);
 const style=document.createElement('style');
 style.textContent=`.restoration-scene-canvas{width:${width}px!important;height:${height}px!important;margin:0!important;background:#e9eef3!important}.restoration-scene-pan{max-height:none!important;overflow:visible!important;flex:none!important;width:${width}px!important;height:${height}px!important}.restoration-scene.is-focused{overflow:visible!important;padding:0!important}.restoration-scene.is-focused>header,.restoration-scene-overview,.scene-view-registration,.restoration-context-questions,.modal-header{display:none!important}.modal-backdrop:has(.restoration-scene.is-focused){display:block!important;padding:0!important;animation:none!important}.modal:has(.restoration-scene.is-focused){width:${width}px!important;max-width:none!important;height:${height}px!important;max-height:none!important;overflow:visible!important;margin:0!important;border:0!important;animation:none!important;transform:none!important}`;
 document.head.append(style);pan.scrollLeft=0;pan.scrollTop=0;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','실제 작업면 전체 내보내기');
 return {width,height,viewportWidth:width+24,viewportHeight:height+24,panelCount:panels.length,objects:canvas.querySelectorAll('[data-drawing-piece]').length};
}
