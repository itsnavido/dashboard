// Discord webhook integration
const axios = require('axios');

/**
 * Send Discord webhook message
 * @param {Object} data - Payment data
 * @param {String} data.action - Action type: 'create', 'update', 'delete'
 */
async function sendDiscordMessage(data) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not configured, skipping webhook');
    return;
  }

  try {
    // Send only JSON data as content in a code block
    const jsonData = JSON.stringify(data, null, 2);
    const payload = {
      content: `\`\`\`json\n${jsonData}\n\`\`\``
    };

    await axios.post(webhookUrl, payload);
  } catch (error) {
    console.error('Error sending Discord webhook:', error.message);
    throw error;
  }
}

module.exports = {
  sendDiscordMessage
};

