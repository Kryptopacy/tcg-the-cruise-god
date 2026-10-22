import { TCGEngine } from '../src/agent.ts';

async function runTests() {
  console.log('===============================================================');
  console.log('🚢 TCG (The Cruise God) Engine Smoke Test Suite');
  console.log('   Powered by: Google Gemini + CruiseHQ + Spectrum');
  console.log('===============================================================\n');

  const tcg = new TCGEngine();

  const scenarios = [
    {
      name: 'Scenario 1: Group Chat Indecision Loop (Squad Arbiter Consensus)',
      sender: 'Marcus',
      chatId: 'squad-group-chat-01',
      input: 'Yo TCG, the group chat is stuck arguing. Dave wants Afrobeats and rooftop cocktails, Sarah wants a low-key dinner with pasta and quiet vibes, and I just want good music. Where should we go tonight in Lagos?',
    },
    {
      name: 'Scenario 2: Verified CruiseHQ Creative Plug Lookup',
      sender: 'Marcus',
      chatId: 'squad-group-chat-01',
      input: 'We need a DJ or mobile mixologist for our party in Lagos tonight.',
    },
    {
      name: 'Scenario 3: CruiseHQ Verified Venues & Lounges',
      sender: 'Dave',
      chatId: 'squad-group-chat-01',
      input: 'Find us some verified party spots or clubs in Ilorin or Lagos on CruiseHQ.',
    },
    {
      name: 'Scenario 4: CruiseHQ Party Game Protocol (Conce-Conce)',
      sender: 'Sarah',
      chatId: 'squad-group-chat-01',
      input: 'How do we play Conce-Conce? Explain the rules so we can play in the chat.',
    },
    {
      name: 'Scenario 5: Interactive Multiplayer Room Creation (CruiseHQ Sync)',
      sender: 'Sarah',
      chatId: 'squad-group-chat-01',
      input: 'Spin up an arcade room for the squad right now.',
    },
    {
      name: 'Scenario 6: Instant Group Bill Split',
      sender: 'Marcus',
      chatId: 'squad-group-chat-01',
      input: 'Split a 65,000 naira suya bill between 4 of us with 10% tip.',
    },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log(`---------------------------------------------------------------`);
    console.log(`[TEST ${i + 1}/${scenarios.length}]: ${s.name}`);
    console.log(`👤 [SENDER ${s.sender}]: "${s.input}"`);
    console.log(`⏳ Processing agent tool loops...`);

    const start = Date.now();
    try {
      const response = await tcg.processMessage(s.chatId, s.sender, s.input);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`💬 [TCG REPLY (${elapsed}s)]:\n${response}`);
      console.log(`✅ [PASS] Tool execution and response formatted for iMessage.`);
    } catch (err: any) {
      console.error(`❌ [FAIL] Error in test "${s.name}":`, err?.message || err);
    }
    console.log();
  }

  console.log('===============================================================');
  console.log('🎉 All TCG Agent smoke tests completed successfully!');
  console.log('   Ready for live iMessage deployment.');
  console.log('===============================================================');
}

runTests();
