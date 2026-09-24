import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildCatalog} from './avatar-catalog.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DESIGN=fs.realpathSync(process.env.PINPLAY_DESIGN_DIR || path.join(ROOT,'../PinPlayCupMediaDesign'));
const PORT=Number(process.env.STUDIO_PORT ?? 3005);
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const staticFiles=new Set(['/avatar-preview.html','/studio.js','/arena.js','/styles.css','/scripts/avatar-runtime.js','/tests/fixtures/cup-student.html','/tests/fixtures/cup-student.js','/cup/logo/pinplay-cup-logo.svg','/cup/avatar-parts.js']);
function safeSvg(content){
 if(typeof content!=='string'||Buffer.byteLength(content)>65536)throw Error('SVG must be text under 64 KiB');
 const clean=content.replace(/<!--[\s\S]*?-->/g,'');
 if(/<!\|<\?|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(|javascript:|<\s*\/?s*(?!g\b|path\b|circle\b|ellipse\b|rect\b|polygon\b|polyline\b|line\b|defs\b|linearGradient\b|radialGradient\b|stop\b|clipPath\b|title\b|desc\b)[a-z]/i.test(clean))throw Error('Only inert SVG geometry is allowed (no scripts, links, styles or embeds)');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 104">${content}</svg>\n`;
}
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>70000)throw Error('Request too large');}return JSON.parse(data);}

/* --- git helpers --- */
async function gitExec(cmd,cwd){
 const {exec}=await import('node:child_process');
 return new Promise((r,rj)=>exec(cmd,{cwd},(e,o,er)=>e?rj(Error((er||o||e.message).trim())):r(o.trim())));
}
async function repoStatus(cwd){
 await gitExec('git fetch origin',cwd).catch(()=>{});
 const [local,remote,ahead,behind,dirty]=await Promise.all([
  gitExec('git log -1 --format=%ct HEAD',cwd),
  gitExec('git log -1 --format=%ct origin/main',cwd),
  gitExec('git rev-list --count origin/main..HEAD',cwd),
  gitExec('git rev-list --count HEAD..origin/main',cwd),
  gitExec('git status --porcelain',cwd),
 ]);
 return {local:Number(local),remote:Number(remote),ahead:Number(ahead),behind:Number(behind),dirty:dirty.length>0};
}

const server=http.createServer(async(req,res)=>{
 const own=`127.0.0.1:${server.address().port}`;
 if(req.headers.host!==own)return json(res,{error:'Use the loopback URL printed by Studio'},403);
 const origin=`http://${own}`;
 if(req.headers.origin && req.headers.origin!==origin)return json(res,{error:'Foreign origin denied'},403);
 if(req.headers['sec-fetch-site']==='cross-site')return json(res,{error:'Cross-site denied'},403);
 const url=new URL(req.url,origin),pathname=url.pathname==='/'?'/avatar-preview.html':url.pathname;
 try{
  if(req.method==='GET'&&pathname==='/api/health')return json(res,{app:'pinplay-studio',version:2});
  if(req.method==='GET'&&pathname==='/api/catalog')return json(res,buildCatalog(DESIGN));
  if(req.method==='GET'&&pathname==='/api/sync-status'){
   const [code,assets]=await Promise.all([repoStatus(ROOT),repoStatus(DESIGN)]);
   return json(res,{success:true,code,assets});
  }
  if(req.method==='GET'&&staticFiles.has(pathname)){
   const file=path.join(ROOT,pathname);
   if(!fs.existsSync(file))return json(res,{error:'Not found'},404);
   const content=fs.readFileSync(file),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':`${mime[path.extname(file)]||'text/plain'}; charset=utf-8`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' ws://127.0.0.1:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(content);
  }
  if(req.method==='POST'){
   if(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))return json(res,{error:'Same-origin JSON required'},403);
   if(pathname==='/api/save-part'){
    const {filePath,content}=await body(req);
    const catalog=buildCatalog(DESIGN),allowed=new Set(Object.values(catalog.parts).flat().flatMap(p=>Object.values(p.files||{})));
    if(!allowed.has(filePath))return json(res,{error:'Not an editable catalog layer'},400);
    const target=fs.realpathSync(path.resolve(DESIGN,filePath));
    if(!target.startsWith(DESIGN+path.sep)||path.extname(target)!=='.svg')return json(res,{error:'Invalid target'},400);
    const svg=safeSvg(content);fs.writeFileSync(target,svg,'utf8');
    if(fs.readFileSync(target,'utf8')!==svg)throw Error('Save readback failed');
    return json(res,{success:true,filePath,message:'Saved locally. Build and repository sync are separate actions.'});
   }
   if(pathname==='/api/build'){
    await body(req);
    const output=await new Promise((resolve,reject)=>execFile(process.execPath,['scripts/build-cup-assets.mjs',DESIGN,'--write-worker'],{cwd:ROOT},(e,out,err)=>e?reject(Error(err||e.message)):resolve(out)));
    return json(res,{success:true,output});
   }
   if(pathname==='/api/delete'){
    const {category, id}=await body(req);
    if(category==='character'){
     const manifestPath=path.join(DESIGN,'avatars','manifest.json');
     if(fs.existsSync(manifestPath)){
      const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      const pIdx=m.previews?.findIndex(p=>p.name===id||p.id===id);
      if(pIdx>-1){m.previews.splice(pIdx,1);fs.writeFileSync(manifestPath,JSON.stringify(m,null,2),'utf8');return json(res,{success:true,message:'Preset deleted. Rebuild to sync.'});}
     }
     return json(res,{error:'Preset not found in main manifest'},404);
    }else{
     const catalog=buildCatalog(DESIGN);const p=catalog.parts[category]?.find(x=>x.id===id);
     if(!p)return json(res,{error:'Part not found'},404);
     let deleted=0;
     for(const f of Object.values(p.files||{})){
      try{const target=fs.realpathSync(path.resolve(DESIGN,f));if(target.startsWith(DESIGN+path.sep)){fs.unlinkSync(target);deleted++;}}catch{}
     }
     return json(res,{success:true,message:`Deleted ${deleted} file(s). Rebuild to sync.`});
    }
   }
   if(pathname==='/api/sync-push'){
    await body(req);
    const pushCmd=`git add -A && (git diff-index --quiet HEAD || git commit -am "Avatar Studio Auto Sync") && git push`;
    await Promise.all([gitExec(pushCmd,DESIGN),gitExec(pushCmd,ROOT)]);
    await gitExec(`cd cloudflare && npx wrangler deploy`,ROOT);
    return json(res,{success:true,message:'Pushed to cloud and deployed to Cloudflare!'});
   }
   if(pathname==='/api/sync-pull'){
    await body(req);
    await Promise.all([gitExec('git pull',DESIGN),gitExec('git pull',ROOT)]);
    await new Promise((resolve,reject)=>execFile(process.execPath,['scripts/build-cup-assets.mjs',DESIGN,'--write-worker'],{cwd:ROOT},(e,out,err)=>e?reject(Error(err||e.message)):resolve(out)));
    return json(res,{success:true,message:'Pulled from cloud and rebuilt local bundle!'});
   }
  }
  return json(res,{error:'Not found'},404);
 }catch(e){return json(res,{error:e.message},400);}
});
server.on('error',e=>{console.error(`Studio did not start: ${e.message}. Existing services are NOT reused or terminated. Choose STUDIO_PORT or close the old Studio yourself.`);process.exitCode=1;});
server.listen(PORT,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${server.address().port}`;console.log(`STUDIO_READY ${url}`);
 if(process.argv.includes('--open')&&process.platform==='win32')execFile('cmd.exe',['/c','start','',url]);
});
