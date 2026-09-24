/* Local drafts only. POST occurs exclusively in Save or Build click handlers. */
(() => {
 const $=id=>document.getElementById(id),drafts=new Map();
 let catalog=window.CUP_AVATAR,state={head:0,skin:0,hair:0,hairColor:0,eyes:0,mouth:0,glasses:0,hat:0,shirt:0};
 let category='hair',layer='front',connected=false,strokes=[],drawing=null,canvasVersion=0;
 const names={character:'Character',head:'Head',skin:'Skin',hair:'Hair',hairColor:'Hair colour',eyes:'Eyes',mouth:'Mouth',glasses:'Glasses',hat:'Hat',shirt:'Shirt'};
 const current=()=>category==='character'?null:catalog.parts[category]?.[state[category]];
 const file=()=>current()?.files?.[layer];
 function valid(code){const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${code}</svg>`,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid SVG XML');
  for(const el of doc.querySelectorAll('*')){if(!['svg','g','path','circle','ellipse','rect','polygon','polyline','line','defs','linearGradient','radialGradient','stop','clipPath','title','desc'].includes(el.localName))throw Error('Only inert SVG geometry is allowed');for(const a of el.attributes)if(/^on|href|src/i.test(a.name)||/url\s*\(|javascript:/i.test(a.value))throw Error('SVG scripts and external references are not allowed');}return code;
 }
 const status=msg=>{$('status').textContent=msg;};
 function dataWithDrafts(){const data=structuredClone(catalog);for(const items of Object.values(data.parts))for(const p of items)for(const [l,f] of Object.entries(p.files||{}))if(drafts.has(f)){try{p[l]=valid(drafts.get(f));}catch{/* invalid draft is not executed */}}return data;}
 function render(){ $('avatarDisplay').innerHTML=window.CupAvatar.render(state,dataWithDrafts()); }
 let characterIndex = 0;
 function controls(){const container=$('controlsContainer');container.replaceChildren();
  for(const [key,name] of Object.entries(names)){
   const row=document.createElement('div');row.className='control';
   row.style.justifyContent='center'; row.style.gap='20px';
   
   const styleArrow = b => { b.style.padding='4px 16px'; b.style.background='#24314d'; b.style.border='1px solid #455475'; b.style.borderRadius='8px'; b.style.color='#fff'; b.style.fontSize='16px'; b.style.cursor='pointer'; };
   const btnLeft = document.createElement('button'); btnLeft.textContent = '❮'; styleArrow(btnLeft);
   const label=document.createElement('button');label.textContent=name;
   label.className=category===key?'active':'';
   label.style.flex='1';label.style.textAlign='center';
   label.style.color=category===key?'#a8aaff':'#8b9dc3';
   label.style.fontWeight=category===key?'bold':'normal';
   label.style.cursor='pointer'; label.style.background='none'; label.style.border='none';
   const btnRight = document.createElement('button'); btnRight.textContent = '❯'; styleArrow(btnRight);
   
   label.onclick=()=>{category=key;editor();controls();};
   const changeOption = (delta) => {
     if (key === 'character') {
       characterIndex += delta;
       if (characterIndex < 0) characterIndex = catalog.presets.length - 1;
       if (characterIndex >= catalog.presets.length) characterIndex = 0;
       state = { ...catalog.presets[characterIndex].avatar };
       category = key; editor(); controls(); render();
       return;
     }
     const items=key==='skin'?catalog.skins:key==='hairColor'?catalog.hairColors:catalog.parts[key];
     if(!items) return;
     let val = (state[key]||0) + delta;
     if(val < 0) val = items.length - 1;
     if(val >= items.length) val = 0;
     state[key] = val;
     if(catalog.parts[key]){category=key;editor();}
     controls();render();
   };
   btnLeft.onclick=()=>changeOption(-1);
   btnRight.onclick=()=>changeOption(1);
   
   row.append(btnLeft,label,btnRight);container.append(row);
  }
 }
 document.addEventListener('keydown', e => {
   if(document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
   const catKeys = Object.keys(names);
   const catIdx = catKeys.indexOf(category);
   if(e.key==='ArrowUp'){e.preventDefault();category=catKeys[catIdx>0?catIdx-1:catKeys.length-1];editor();controls();}
   else if(e.key==='ArrowDown'){e.preventDefault();category=catKeys[catIdx<catKeys.length-1?catIdx+1:0];editor();controls();}
   else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();
     if (category === 'character') {
       characterIndex += (e.key==='ArrowLeft'?-1:1);
       if (characterIndex < 0) characterIndex = catalog.presets.length - 1;
       if (characterIndex >= catalog.presets.length) characterIndex = 0;
       state = { ...catalog.presets[characterIndex].avatar };
       editor();controls();render();
       return;
     }
     const items=category==='skin'?catalog.skins:category==='hairColor'?catalog.hairColors:catalog.parts[category];
     if(!items) return;
     let val = (state[category]||0) + (e.key==='ArrowLeft'?-1:1);
     if(val < 0) val = items.length - 1;
     if(val >= items.length) val = 0;
     state[category] = val; 
     editor();controls();render();
   }
 });
 function editor(){const item=current(),keys=Object.keys(item?.files||{});if(!keys.includes(layer))layer=keys[0]||'svg';
  $('layerPicker').replaceChildren(...keys.map(k=>new Option(k,k)));$('layerPicker').value=layer;
  $('activePartTitle').textContent=category==='character'?'Character presets are not editable':`${names[category]}: ${item?.name||item?.id||'None'}`;
  $('activePartPath').textContent=file()||'No editable source layer';
  $('svgCodeInput').value=drafts.get(file())??item?.[layer]??'';$('svgCodeInput').disabled=!file();$('savePartBtn').disabled=!connected||!file();
  const deleteItem=category==='character'?catalog.presets[characterIndex]:item;$('deletePartBtn').disabled=!connected||(!deleteItem&&(category!=='character'));
  strokes=[];drawing=null;initCanvas();
 }
 function draft(){if(!file())return;drafts.set(file(),$('svgCodeInput').value);try{valid($('svgCodeInput').value);render();status('Unsaved draft — nothing written to disk.');}catch(e){status(e.message+' — draft retained, preview unchanged.');}}
 $('svgCodeInput').addEventListener('input',draft);
 $('layerPicker').onchange=()=>{layer=$('layerPicker').value;editor();};
 
 const canvas=$('drawCanvas'),ctx=canvas.getContext('2d');
 function paintStrokes(){for(const s of strokes){ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';s.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}}
 function initCanvas(){const version=++canvasVersion;ctx.clearRect(0,0,250,260);let code=$('svgCodeInput').value;try{valid(code);}catch{return;}
  const img=new Image(),url=URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 104">${code}</svg>`],{type:'image/svg+xml'}));img.onload=()=>{if(version===canvasVersion){ctx.clearRect(0,0,250,260);ctx.drawImage(img,0,0,250,260);paintStrokes();}URL.revokeObjectURL(url);};img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
 }
 const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*250/r.width,(e.clientY-r.top)*260/r.height];};
 canvas.onpointerdown=e=>{if(!file())return;canvas.setPointerCapture(e.pointerId);const p=point(e);drawing={color:$('brushColor').value,width:Number($('brushSize').value),points:[p,[p[0]+.01,p[1]+.01]]};strokes.push(drawing);paintStrokes();};
 canvas.onpointermove=e=>{if(drawing){drawing.points.push(point(e));paintStrokes();}};
 canvas.onpointerup=canvas.onpointercancel=()=>{drawing=null;};
 $('clearCanvasBtn').onclick=()=>{strokes=[];initCanvas();};
 $('applyCanvasBtn').onclick=()=>{if(!file()||!strokes.length)return;const svg=strokes.map(s=>`<path d="${s.points.map(([x,y],i)=>`${i?'L':'M'}${(x/2.5).toFixed(2)} ${(y/2.5-4).toFixed(2)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.width/2.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');$('svgCodeInput').value+='\n'+svg;strokes=[];draft();initCanvas();};
 async function post(endpoint,payload){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok||!result.success)throw Error(result.error||'Operation failed');return result;}
 $('savePartBtn').onclick=async()=>{const target=file(),code=$('svgCodeInput').value;if(!target)return;try{valid(code);await post('/api/save-part',{filePath:target,content:code});const res=await fetch('/api/catalog');if(!res.ok)throw Error('Saved, but catalog readback failed');const fresh=await res.json();const saved=Object.values(fresh.parts).flat().some(p=>Object.entries(p.files||{}).some(([k,f])=>f===target&&p[k]===code.trim()));if(!saved)throw Error('Save readback mismatch');catalog=fresh;drafts.delete(target);render();status('Saved selected layer locally. Student bundle not rebuilt; no sync or deployment.');}catch(e){status('Save failed: '+e.message);}};
 $('deletePartBtn').onclick=async()=>{const item=category==='character'?catalog.presets[characterIndex]:current();if(!item||item.id==='none'||item.id==='default')return status('Cannot delete base templates.');if(!confirm(`Are you sure you want to completely delete ${item.name||item.id}? This cannot be undone.`))return;try{const r=await post('/api/delete',{category,id:item.id});status(r.message);setTimeout(()=>$('rebuildBtn').click(),800);}catch(e){status('Delete failed: '+e.message);}};
 $('rebuildBtn').onclick=async()=>{try{const r=await post('/api/build',{});status('Local bundle built. Unsaved drafts not included. '+r.output);}catch(e){status('Build failed: '+e.message);}};
 $('syncBtn').onclick=async()=>{try{status('Syncing to cloud...');const r=await post('/api/sync',{});status(r.message);}catch(e){status('Sync failed: '+e.message);}};
 $('randomBtn').onclick=()=>{characterIndex = Math.floor(Math.random()*catalog.presets.length); state = { ...catalog.presets[characterIndex].avatar }; category='character'; editor(); controls(); render();};
 (async()=>{try{const health=await fetch('/api/health').then(r=>r.json());if(health.app!=='pinplay-studio'||health.version!==2)throw Error('Incompatible Studio server');const res=await fetch('/api/catalog');if(!res.ok)throw Error('Catalog unavailable');catalog=await res.json();connected=true;status('Connected. Drafts are local to this tab.');}catch(e){status('Read-only preview: '+e.message);$('rebuildBtn').disabled=true;}
  characterIndex=catalog.presets.findIndex(p=>p.id==='trump');if(characterIndex<0)characterIndex=0;state={...catalog.presets[characterIndex].avatar};controls();editor();render();})();
})();
