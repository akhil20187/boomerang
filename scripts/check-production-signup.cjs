const {chromium,expect}=require('@playwright/test');
const {execFileSync}=require('node:child_process');
const readline=require('node:readline');

(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage();
 const email='delivered+production-20261012-0245@resend.dev';
 try{
  await page.goto('https://www.askboomerang.online/account');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);
  await page.getByRole('button',{name:'Email me a sign-in link'}).click();
  await expect(page.getByText('Check your email',{exact:true})).toBeVisible();
  console.log('Production browser form accepted the new simulator signup. Waiting for its sign-in link on stdin.');
  const input=readline.createInterface({input:process.stdin});
  const link=await new Promise(resolve=>input.once('line',resolve));input.close();
  const url=new URL(link);
  if(url.origin!=='https://www.askboomerang.online'||!['/account','/tasks'].includes(url.pathname))throw Error('Unexpected simulator link origin');
  await page.goto(url.href);
  await expect(page.getByText('₹100',{exact:false}).first()).toBeVisible();
  await page.goto('https://www.askboomerang.online/app');
  await expect(page.getByRole('heading',{name:'Find it nearby. Let us make the calls.'})).toBeVisible();
  await page.screenshot({path:'/private/tmp/boomerang-production-signup.png',fullPage:true});
  // This browser was created for the simulator and contains no user profile.
  const jwt=await page.evaluate(()=>Object.entries(localStorage).find(([key])=>key.startsWith('__convexAuthJWT'))?.[1]);
  if(!jwt)throw Error('Isolated browser session token missing');
  const output=execFileSync(process.execPath,['scripts/verify-production-signin.mjs'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,BOOMERANG_TEST_JWT:jwt,BOOMERANG_SIMULATOR_EMAIL:email,PRODUCTION_MCP_ENDPOINT:'https://www.askboomerang.online/mcp'}});
  console.log(output.trim());
  console.log('Live browser signup, welcome credit and public-domain MCP verified. Test session signed out; no calls made.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
