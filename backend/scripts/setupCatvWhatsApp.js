require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const { createWhatsAppClient } = require('../services/catvWhatsAppNotifications');
const { client } = createWhatsAppClient(process.env, console, { protocolTimeout: 600000 });
client.on('ready', async () => {
  try {
    console.log('Retrieving WhatsApp groups. This may take several minutes; allow up to 10 minutes without starting another setup.');
    const groups = (await client.getChats()).filter(chat => chat.isGroup);
    console.log('Choose the CATV employee group and copy its ID into CATV_WHATSAPP_GROUP_ID:');
    const target = process.argv[2] || 'TCV Support';
    const matches = groups.filter(group => group.name === target);
    for (const group of matches) console.log(`${group.name}: ${group.id._serialized}`);
    if (matches.length !== 1) {
      console.log(`Found ${matches.length} groups named ${target}. Verify the intended group ID before enabling notifications.`);
      for (const group of groups) console.log(`${group.name}: ${group.id._serialized}`);
    }
    console.log('No messages were sent. Restart the backend after configuring the group.');
  } catch (error) {
    console.error('WhatsApp is linked, but group discovery failed:');
    console.error(error.message);
    console.error('The saved session is retained. Do not delete .wwebjs_auth.');
    process.exitCode = 1;
  }
  finally { await client.destroy(); }
});
client.initialize().catch(async error => {
  console.error('WhatsApp setup failed. Check Chrome installation and persistent session directory.');
  console.error(error.message);
  process.exitCode = 1;
  await client.destroy().catch(() => {});
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await client.destroy().catch(() => {}); process.exit(); });
