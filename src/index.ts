import http from 'node:http';
import { Spectrum } from 'spectrum-ts';
import { imessage } from '@spectrum-ts/imessage';
import { TCGEngine } from './agent.ts';

// Real-time telemetry state for live cloud diagnostic
const state = {
  status: 'initializing',
  connected: false,
  connectedAt: null as string | null,
  lastError: null as string | null,
  messagesProcessed: 0,
  lastMessageAt: null as string | null,
  env: {
    PROJECT_ID: Boolean(process.env.PROJECT_ID),
    PROJECT_SECRET: Boolean(process.env.PROJECT_SECRET),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    FIRECRAWL_API_KEY: Boolean(process.env.FIRECRAWL_API_KEY),
  }
};

// Lightweight health & diagnostic server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  if (req.url === '/status' || req.url === '/diag') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state, null, 2));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`🚢 TCG (The Cruise God) Live Daemon
Status: ${state.status} | Spectrum Connected: ${state.connected}
Messages Processed: ${state.messagesProcessed}
Env: PROJECT_ID=${state.env.PROJECT_ID ? '✅' : '❌'}, GEMINI=${state.env.GEMINI_API_KEY ? '✅' : '❌'}, SUPABASE=${state.env.SUPABASE_URL ? '✅' : '❌'}
${state.lastError ? `Last Error: ${state.lastError}\n` : ''}`);
}).listen(PORT, () => {
  console.log(`🌐 Health check server listening on port ${PORT}`);
});

async function startBot() {
  let tcg: TCGEngine;
  try {
    tcg = new TCGEngine();
  } catch (err: any) {
    state.status = 'error';
    state.lastError = err.message || String(err);
    console.error('❌ Failed to initialize TCGEngine:', err);
    return;
  }

  while (true) {
    try {
      state.status = 'connecting';
      console.log('🔄 Connecting TCG to Photon Spectrum iMessage relay...');
      const app = await Spectrum({
        projectId: process.env.PROJECT_ID!,
        projectSecret: process.env.PROJECT_SECRET!,
        providers: [
          imessage.config(),
        ],
      });

      state.status = 'connected';
      state.connected = true;
      state.connectedAt = new Date().toISOString();
      state.lastError = null;
      console.log('🚢 TCG (The Cruise God) is live on iMessage via Spectrum!');

      for await (const [space, message] of app.messages) {
        state.messagesProcessed++;
        state.lastMessageAt = new Date().toISOString();
        const senderObj = (message as any).sender;
        const sender = senderObj?.name || senderObj?.displayName || senderObj?.address || 'Cruiser';
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
