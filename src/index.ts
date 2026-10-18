import http from 'node:http';
import { Spectrum } from 'spectrum-ts';
import { imessage } from '@spectrum-ts/imessage';
import { TCGEngine } from './agent.ts';

// Lightweight health check server for free cloud hosts (Render, Koyeb, etc.)
const PORT = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🚢 TCG (The Cruise God) is alive and cruising on iMessage!\n');
}).listen(PORT, () => {
  console.log(`🌐 Health check server listening on port ${PORT}`);
});

async function startBot() {
  const tcg = new TCGEngine();

  while (true) {
    try {
      console.log('🔄 Connecting TCG to Photon Spectrum iMessage relay...');
      const app = await Spectrum({
        projectId: process.env.PROJECT_ID!,
        projectSecret: process.env.PROJECT_SECRET!,
        providers: [
          imessage.config(),
        ],
      });

      console.log('🚢 TCG (The Cruise God) is live on iMessage via Spectrum!');

      for await (const [space, message] of app.messages) {
        if (message.content.type === 'text') {
          const text = message.content.text;
          const sender = (message as any).sender?.address || 'Cruiser';
          const chatId = space.id;

          console.log(`📩 [${sender}]: "${text}"`);

          try {
            const reply = await tcg.processMessage(chatId, sender, text);
            console.log(`💬 TCG: "${reply}"`);
            await space.send(reply);
          } catch (err) {
            console.error('Error handling message:', err);
            await space.send('My bad, my line tripped for a sec. Hit me again?');
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Spectrum connection dropped or error encountered. Reconnecting in 5s...', err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startBot();
