import { TCGEngine } from '../src/agent.ts';

async function runTests() {
  console.log('🧪 Starting TCG Engine Smoke Tests...');
  const tcg = new TCGEngine();

  const scenarios = [
    {
      name: 'Concierge Plug Search',
      sender: 'Marcus',
      input: 'Yo TCG, our squad is planning a party in Lagos this weekend. Do we have any verified DJs or mixologists on CruiseHQ?',
    },
    {
      name: 'Game Master / Conce-Conce',
      sender: 'Kemi',
      input: "We are hanging out right now and kinda bored. What's a fast party game we can play in the chat?",
    },
    {
      name: 'Group Room Creation',
      sender: 'Dave',
      input: "Can you set up an interactive CruiseHQ room for tonight's games so everyone can join?",
    },
  ];

  for (const s of scenarios) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`[TEST]: ${s.name}`);
    console.log(`[USER ${s.sender}]: "${s.input}"`);
    try {
      const response = await tcg.processMessage('test-chat-1', s.sender, s.input);
      console.log(`[TCG REPLY]:\n${response}`);
    } catch (err) {
      console.error(`Error in test ${s.name}:`, err);
    }
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log('✅ Smoke tests completed!');
}

runTests();
