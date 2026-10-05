import http from 'node:http';
import fs from 'node:fs/promises';
const paths={'/widget-host.html':'web/widget-host.html','/dist/widget.html':'web/dist/widget.html'};
http.createServer(async(req,res)=>{const file=paths[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);res.end();return}try{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(await fs.readFile(file))}catch{res.writeHead(500);res.end('Fixture unavailable')}}).listen(5175,'127.0.0.1',()=>console.log('Controlled host at http://127.0.0.1:5175/widget-host.html'));
