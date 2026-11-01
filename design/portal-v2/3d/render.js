const {chromium}=require('playwright');const fs=require('fs');const http=require('http');const path=require('path');
const root=__dirname;const srv=http.createServer((q,s)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end()}s.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html'});s.end(d)})}).listen(8765);
const jobs=JSON.parse(process.argv[2]);
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const p=await b.newPage();p.on('console',m=>console.log('console',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/scene.html?s='+(process.argv[3]||1000));await p.waitForFunction('window.ready',null,{timeout:60000});
fs.mkdirSync('out',{recursive:true});
for(const [n,o] of jobs){const t=Date.now();const u=await p.evaluate(([n,o])=>render(n,o),[n,o||{}]);fs.writeFileSync('out/'+n+'.png',Buffer.from(u.split(',')[1],'base64'));console.log(n,Date.now()-t,'ms')}
await b.close();srv.close()})();
