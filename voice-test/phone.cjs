const {createPhoneAgent} = require('./phone-agent.cjs');

async function main() {
  const index=process.argv.indexOf('--public-url');
  if(index<0 || !process.argv[index+1])throw Error('Pass --public-url https://YOUR-TUNNEL');
  const agent=createPhoneAgent({publicUrl:process.argv[index+1]});
  process.once('SIGINT',async()=>{await agent.stop();process.exit();});
  process.once('SIGTERM',async()=>{await agent.stop();process.exit();});
  try {await agent.start();if(process.argv.includes('--dial'))await agent.call();}
  catch(error){await agent.stop();throw error;}
}
if(require.main === module)main().catch(error=>{console.log('Phone test stopped: '+error.message);process.exitCode=1;});
module.exports = {createPhoneAgent};
