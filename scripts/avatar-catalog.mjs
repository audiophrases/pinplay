import fs from 'node:fs';
import path from 'node:path';
export const EXCLUDE = new Set(['glasses-wizard-round-scar.svg','shirt-wizard-robe-scarf.svg']);
const inner = f => fs.readFileSync(f,'utf8').replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').trim();
const label = s => s.replace(/-/g,' ');
export function buildCatalog(src) {
 const pack=path.join(src,'PinPlay-Cup-Asset-Pack','avatars');
 const dirs=[pack];
 function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){
  if(!d.isDirectory() || ['base','previews','parts','modular','game','animations','sounds','vendor','photo-avatar-test','.git'].includes(d.name))continue;
  const p=path.join(dir,d.name);if(fs.readdirSync(p).some(f=>f.endsWith('.svg'))&&!dirs.includes(p))dirs.push(p);walk(p);
 }}walk(src);
 const parts={hair:[],eyes:[],mouth:[],glasses:[{id:'none',name:'None'}],hat:[{id:'none',name:'None'}],shirt:[]};
 function add(dir,f){const m=f.match(/^(hair|eyes|mouth|glasses|hat|shirt)-(.+)\.svg$/);if(!m||EXCLUDE.has(f))return;
  const [,cat,rest]=m, pair=cat==='hair'&&rest.match(/^(.+)-(back|front)$/), id=pair?pair[1]:rest, layer=cat==='hair'?(pair?pair[2]:'front'):'svg';
  let p=parts[cat].find(p=>p.id===id);if(!p){p={id,name:label(id),files:{}};parts[cat].push(p);}
  p[layer]=inner(path.join(dir,f));p.files[layer]=path.relative(src,path.join(dir,f)).split(path.sep).join('/');
 }
 for(const dir of dirs)for(const f of fs.readdirSync(dir).sort())add(dir,f);
 parts.hair.push({id:'none',name:'None'}); // append: never renumber saved human avatars
 const base=Object.fromEntries(['neck','ears','head','cheeks'].map(k=>[k,inner(path.join(pack,`base-${k}.svg`))]));
 parts.head=[{id:'human',name:'Human',...base}];
 const skins=['#F8D9C5','#EDB78F','#D79A67','#B97753','#89543E','#583C35','#E4D9DC','#F3ECDC'];
 const hairColors=['#292D43','#51372F','#88553D','#C57543','#E3B961','#E3C57D','#CBD5E3','#A888D8','#E188AA','#70BFA9','#537ACE'];
 const index=(cat,id)=>{const i=parts[cat].findIndex(p=>p.id===id);if(i<0)throw Error(`Missing ${cat}:${id}`);return i;};
 const palette=(a,v)=>{if(!a.includes(v))a.push(v);return a.indexOf(v);};
 const defaults=()=>({head:0,skin:0,hair:index('hair','none'),hairColor:0,eyes:0,mouth:0,glasses:0,hat:0,shirt:0});
 const presets=[{id:'default',name:'Default',avatar:{...defaults(),hair:0}}];
 for(const dir of dirs){const mf=path.join(dir,'manifest.json');if(!fs.existsSync(mf))continue;
  const manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
  for(const p of manifest.presets||manifest.previews||[]){if(!p.layers)continue;
   const avatar=defaults(), substitutions=[];
   for(const f of p.layers){const name=path.basename(f),m=name.match(/^(hair|eyes|mouth|glasses|hat|shirt)-(.+)\.svg$/);if(!m)continue;
    if(EXCLUDE.has(name)){substitutions.push(name);continue;}const cat=m[1],id=cat==='hair'?m[2].replace(/-(back|front)$/,''):m[2];avatar[cat]=index(cat,id);
   }
   avatar.skin=palette(skins,p.skin);avatar.hairColor=palette(hairColors,p.hair);
   const id=path.basename(p.file,'.svg');presets.push({id,name:p.label||label(p.name),avatar,...(substitutions.length?{substitutions}: {})});
  }
 }
 const animalDir=path.join(src,'PinPlay-Cup-Animal-Heads','modular');
 if(fs.existsSync(path.join(animalDir,'manifest.json'))){const am=JSON.parse(fs.readFileSync(path.join(animalDir,'manifest.json'),'utf8'));
  for(const p of am.presets){const h={id:p.id,name:label(p.id),files:{},neck:'',cheeks:''};
   for(const layer of ['head','ears']){h[layer]=inner(path.join(animalDir,p[layer]));h.files[layer]=path.relative(src,path.join(animalDir,p[layer])).split(path.sep).join('/');}
   parts.head.push(h);for(const cat of ['eyes','mouth'])add(animalDir,p[cat]);
   presets.push({id:p.id,name:label(p.id),avatar:{...defaults(),head:index('head',p.id),eyes:index('eyes',p.id),mouth:index('mouth',p.id)}});
  }
 }
 return {viewBox:'0 -4 100 104',skins,hairColors,base,parts,presets};
}
export function runtimeCatalog(data){return JSON.parse(JSON.stringify(data,(key,value)=>key==='files'?undefined:value));}
