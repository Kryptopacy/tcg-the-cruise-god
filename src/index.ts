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
        const sender = (message as any).sender?.address || 'Cruiser';
        const chatId = space.id;
        let text = '';
        let media: { mimeType: string; data: string } | undefined;

        if (message.content.type === 'text') {
          text = message.content.text;
          console.log(`📩 [${sender}]: "${text}"`);
        } else if (message.content.type === 'voice') {
          text = '[Voice note from user — listen to audio and reply naturally]';
          try {
            const buf = await (message.content as any).read();
            media = {
              mimeType: (message.content as any).mimeType || 'audio/m4a',
              data: Buffer.from(buf).toString('base64'),
            };
            console.log(`🎙️ [${sender}] sent a voice note (${buf.length || buf.byteLength} bytes)`);
          } catch (e) {
            console.error('Failed to read voice note:', e);
          }
        } else if (message.content.type === 'attachment') {
          const att = message.content as any;
          text = `[Photo/file attachment from user: ${att.name || 'media'}]`;
          try {
            const buf = await att.read();
            media = {
              mimeType: att.mimeType || 'image/jpeg',
              data: Buffer.from(buf).toString('base64'),
            };
            console.log(`📎 [${sender}] sent attachment: ${att.name || 'media'} (${buf.length || buf.byteLength} bytes)`);
          } catch (e) {
            console.error('Failed to read attachment:', e);
          }
        } else {
          continue;
        }

        try {
          const reply = await tcg.processMessage(chatId, sender, text, media);
          console.log(`💬 TCG: "${reply}"`);
          await space.send(reply);
        } catch (err) {
          console.error('Error handling message:', err);
          await space.send('My bad, my line tripped for a sec. Hit me again?');
        }
      }
    } catch (err) {
      console.error('⚠️ Spectrum connection dropped or error encountered. Reconnecting in 5s...', err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startBot();
