require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const { createWhatsAppClient } = require('../services/catvWhatsAppNotifications');
const { client } = createWhatsAppClient();
client.on('ready', async () => {
  try {
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
  } catch { console.error('Unable to list groups. Check the linked device and retry.'); process.exitCode = 1; }
  finally { await client.destroy(); }
});
client.initialize().catch(async error => {
  console.error('WhatsApp setup failed. Check Chrome installation and persistent session directory.');
  console.error(error.message);
  process.exitCode = 1;
  await client.destroy().catch(() => {});
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await client.destroy().catch(() => {}); process.exit(); });
