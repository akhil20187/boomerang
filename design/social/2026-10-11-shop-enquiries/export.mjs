import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
  const page = await browser.newPage({viewport:{width:1200,height:1500},deviceScaleFactor:1});
  await page.goto(new URL('./carousel.html', import.meta.url).href);
  const logo = await readFile(path.join(directory,'../../brand/final/boomerang-logo.svg'),'utf8');
  const mark = await readFile(path.join(directory,'../../brand/final/boomerang-mark.svg'),'utf8');
  // Inline the production assets: repeated SVG <use> references disappear in Chrome PDFs.
  await page.evaluate(({logo,mark})=>{
    for(const [selector,source] of [['.brand,.lockup',logo],['.big-mark',mark]]){
      const asset=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
      for(const svg of document.querySelectorAll(selector)){
        svg.setAttribute('viewBox',asset.getAttribute('viewBox'));
        svg.innerHTML=asset.innerHTML;
      }
    }
    const phone=document.querySelector('#phone');
    for(const svg of document.querySelectorAll('.quote svg')){
      svg.setAttribute('viewBox',phone.getAttribute('viewBox'));
      svg.innerHTML=phone.innerHTML;
    }
  },{logo,mark});
  await page.evaluate(()=>document.fonts.ready);
  await mkdir(path.join(directory,'slides'),{recursive:true});
  const issues = await page.evaluate(()=>[...document.querySelectorAll('.slide')].flatMap((slide,index)=>{
    const footer=slide.querySelector('.footer').getBoundingClientRect();
    const bounds=slide.getBoundingClientRect();
    return [...slide.querySelectorAll('.content h1,.content h2,.content p,.content .step,.content .quote,.content .workflow div,.content .lockup')].flatMap(el=>{
      const r=el.getBoundingClientRect();
      return r.bottom>footer.top-15||r.right>bounds.right-60||el.scrollWidth>el.clientWidth+2 ? [{slide:index+1,text:el.textContent,problem:'overflow or footer collision'}] : [];
    });
  }));
  if(issues.length)throw new Error(JSON.stringify(issues));
  const slides=page.locator('.slide');
  for(let i=0;i<await slides.count();i++)await slides.nth(i).screenshot({path:path.join(directory,'slides',`${String(i+1).padStart(2,'0')}.png`)});
  // Use the checked slide images for PDF pages; Chrome drops identical vector logos on later pages.
  const pdfImages=[];
  for(let i=1;i<=7;i++){
    const bytes=await readFile(path.join(directory,'slides',`${String(i).padStart(2,'0')}.png`));
    pdfImages.push(`<section><img src="data:image/png;base64,${bytes.toString('base64')}"></section>`);
  }
  await page.setContent(`<html><head><title>Boomerang · Why I built it</title><style>@page{size:1080px 1350px;margin:0}*{box-sizing:border-box}body{margin:0}section{width:1080px;height:1350px;break-after:page;overflow:hidden}section:last-child{break-after:auto}img{display:block;width:1080px;height:1350px}</style></head><body>${pdfImages.join('')}</body></html>`);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  await page.pdf({path:path.join(directory,'boomerang-carousel.pdf'),preferCSSPageSize:true,printBackground:true});
  const thumbnails = Array.from({length:7},(_,i)=>`<figure><img src="slides/${String(i+1).padStart(2,'0')}.png"><figcaption>${i+1} / 7</figcaption></figure>`).join('');
  await writeFile(path.join(directory,'preview.html'),`<!doctype html><meta charset="utf-8"><title>Boomerang carousel preview</title><style>body{margin:0;padding:28px;background:#e6e6e6;font:16px system-ui}main{display:grid;grid-template-columns:repeat(4,270px);gap:22px}figure{margin:0}img{width:270px;display:block}figcaption{padding:8px 0;color:#555}</style><main>${thumbnails}</main>`);
  await page.goto(new URL('./preview.html',import.meta.url).href);
  await page.setViewportSize({width:1200,height:850});
  await page.screenshot({path:path.join(directory,'preview.png'),fullPage:true});
  console.log('Exported 7 slides at 1080×1350, a seven-page PDF, and preview. No text overflow or footer collisions.');
}finally{await browser.close();}
