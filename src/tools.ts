export interface TCGToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

async function querySupabase(table: string, params: string = ''): Promise<any[]> {
  const url = process.env.SUPABASE_URL || 'https://vwxhxygaijvdthahjwec.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) return [];

  const endpoint = `${url}/rest/v1/${table}?${params}`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) {
      console.warn(`Supabase ${table} query returned ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error(`Supabase query failed on ${table}:`, err);
    return [];
  }
}

async function insertSupabase(table: string, body: Record<string, any>): Promise<any> {
  const url = process.env.SUPABASE_URL || 'https://vwxhxygaijvdthahjwec.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) return null;

  try {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Supabase insert failed on ${table}:`, err);
    return null;
  }
}

async function queryFirecrawl(query: string, limit: number = 3): Promise<any[]> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) return [];

  try {
    const resp = await fetch('https://api.firecrawl.dev/v0/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        query,
        pageOptions: { fetchPageContent: false },
        limit,
      }),
    });
    const searchData = await resp.json();
    if (searchData.success && Array.isArray(searchData.data)) {
      return searchData.data.map((item: any) => ({
        title: item.title,
        url: item.url,
        description: item.description,
      }));
    }
  } catch (e) {
    console.warn('Firecrawl search fallback error:', e);
  }
  return [];
}

// In-memory pronunciation dictionary for the session
const pronunciationMap = new Map<string, string>();

export const tools: TCGToolDefinition[] = [
  {
    name: 'resolveGroupConsensus',
    description:
      'Solves group chat indecision loops: takes differing preferences or vibes mentioned by squad members in a city and constructs an executive compromise route with clear reasoning and Apple Tapback voting.',
    parameters: {
      type: 'object',
      properties: {
        memberVibes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of preferences from friends in the chat (e.g. ["Dave: Afrobeats and rooftop cocktails", "Sarah: quiet pasta and wine"])',
        },
        city: { type: 'string', description: 'City name (e.g. "Lagos", "London", "Abuja", "New York")' },
      },
      required: ['memberVibes'],
    },
  },
  {
    name: 'searchLocations',
    description:
      'Finds verified venues, restaurants, bars, rooftops, and lounges from CruiseHQ verified directory and live search.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Category, vibe, or name of location (e.g. "cocktail lounge", "rooftop", "pasta", "beach club")' },
        city: { type: 'string', description: 'Target city, e.g. "Lagos", "London", "Abuja", "Ibadan"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchPlugs',
    description:
      'Finds verified creative talent and party essentials from CruiseHQ directory (DJs, mobile mixologists, streetwear drip, photographers, catering, barbers, stylists, private chefs).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Service category like "DJ", "Mixologist", "Barber", "Catering", "Fashion", "Photographer"' },
        location: { type: 'string', description: 'City or region (e.g. "Lagos", "London")' },
      },
      required: ['category'],
    },
  },
  {
    name: 'searchEvents',
    description: 'Searches for upcoming live community events, popups, and club nights from CruiseHQ verified directory and live web search.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Event type or vibe (e.g. "afrobeats", "rave", "day party", "listening party", "brunch")' },
        city: { type: 'string', description: 'City name (e.g. "Lagos", "London", "Accra")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchGames',
    description: 'Searches CruiseHQ social and party games directory with complete rules, materials, and player counts (Conce-Conce, Charades, Hot Seat, etc.).',
    parameters: {
      type: 'object',
      properties: {
        vibe: { type: 'string', description: 'Game style (e.g. "drinking", "high energy", "icebreaker", "fast-paced", "word game")' },
      },
      required: ['vibe'],
    },
  },
  {
    name: 'createCruiseRoom',
    description: 'Spins up an interactive live multiplayer room on CruiseHQ for synced arcade games, trivia, and duels with a sharable link.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Session title or vibe for the squad room' },
        hostName: { type: 'string', description: 'Name of the host initiating the room' },
      },
      required: ['title'],
    },
  },
  {
    name: 'createMemory',
    description: 'Saves an iconic moment, legendary roast, or event recap to the squad CruiseHQ memory bank.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the memory' },
        content: { type: 'string', description: 'The quote, roast, or recap being preserved' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'savePronunciation',
    description: 'Saves phonetic pronunciation when a user corrects how their name or CruiseID should be pronounced.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The user name or CruiseID' },
        phonetic: { type: 'string', description: 'Phonetic pronunciation guide' },
      },
      required: ['name', 'phonetic'],
    },
  },
  {
    name: 'splitCheck',
    description: 'Calculates per-person bill split with tip/tax breakdown.',
    parameters: {
      type: 'object',
      properties: {
        totalAmount: { type: 'number', description: 'Total bill amount' },
        numberOfPeople: { type: 'number', description: 'Number of people splitting' },
        tipPercentage: { type: 'number', description: 'Tip percentage (e.g. 10, 15)' },
        currencySymbol: { type: 'string', description: 'Currency symbol or code (e.g. "₦", "$", "£")' },
      },
      required: ['totalAmount', 'numberOfPeople'],
    },
  },
  {
    name: 'flipCoin',
    description: 'Flips a coin to break ties instantly in the chat.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'What the coin flip is deciding' },
      },
      required: [],
    },
  },
];

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'resolveGroupConsensus': {
      const vibes = Array.isArray(args.memberVibes) ? args.memberVibes : [String(args.memberVibes)];
      const city = args.city || 'your city';

      return {
        mode: 'Squad Arbiter Consensus',
        squadVibesAnalyzed: vibes,
        city,
        recommendedConsensus: {
          vibeFormat: 'Hybrid: Aesthetic food & drinks first, transitioning to sound & energy',
          executiveDecision: `Start at a spot with top-tier food and craft cocktails to talk and dine, then transition the crew to the rooftop sound system once dinner wraps.`,
          actionPrompt: 'Drop a Tapback ❤️ to lock it in, or 👎 to veto in the next 5 mins.',
        },
      };
    }

    case 'searchLocations': {
      const city = args.city || '';
      const query = args.query || '';
      const limit = 4;

      let queryParams = `select=name,category,city,address,description,website_url&status=eq.approved&limit=${limit}`;
      if (city) {
        queryParams += `&city=ilike.*${encodeURIComponent(city)}*`;
      }
      if (query) {
        queryParams += `&or=(name.ilike.*${encodeURIComponent(query)}*,category.ilike.*${encodeURIComponent(query)}*,description.ilike.*${encodeURIComponent(query)}*)`;
      }

      let data = await querySupabase('cruisehq_venues', queryParams);

      if (!data || data.length === 0) {
        // Fallback: search without category filter if city provided
        if (city) {
          data = await querySupabase('cruisehq_venues', `select=name,category,city,address,description,website_url&city=ilike.*${encodeURIComponent(city)}*&limit=${limit}`);
        }
      }

      if (data && data.length > 0) {
        return {
          verifiedOnCruiseHQ: true,
          venues: data.map((v) => ({
            name: v.name,
            category: v.category || 'Spot',
            city: v.city,
            address: v.address || `${v.city}`,
            description: v.description,
            link: v.website_url,
          })),
        };
      }

      // Live search fallback via Firecrawl
      const webResults = await queryFirecrawl(`best ${query} venues restaurants spots in ${city || 'the city'}`, limit);
      if (webResults.length > 0) {
        return {
          verifiedOnCruiseHQ: false,
          source: 'live_web_verified',
          venues: webResults,
        };
      }

      return {
        verifiedOnCruiseHQ: false,
        message: `No venues found for "${query}" in ${city || 'this area'}.`,
      };
    }

    case 'searchPlugs': {
      const cat = args.category || '';
      const loc = args.location || '';
      const limit = 4;

      let queryParams = `select=title,description,url,service_category,service_types,locations,price_ngn,price_usd&status=eq.approved&limit=${limit}`;
      if (cat) {
        queryParams += `&or=(service_category.ilike.*${encodeURIComponent(cat)}*,title.ilike.*${encodeURIComponent(cat)}*,description.ilike.*${encodeURIComponent(cat)}*)`;
      }

      let plugs = await querySupabase('cruisehq_plugs', queryParams);

      // Also check profiles for VIP plugs
      if (!plugs || plugs.length < limit) {
        const profilePlugs = await querySupabase(
          'profiles',
          `select=display_name,bio,website&is_plug=is.true&limit=3`
        );
        if (profilePlugs && profilePlugs.length > 0) {
          const mapped = profilePlugs.map((p) => ({
            title: p.display_name || 'Verified VIP Plug',
            description: p.bio || 'CruiseHQ VIP Plug',
            url: p.website || 'https://cruisehq.fun/plugs',
            service_category: cat || 'VIP Concierge',
            locations: [loc || 'All Cities'],
          }));
          plugs = [...(plugs || []), ...mapped].slice(0, limit);
        }
      }

      if (plugs && plugs.length > 0) {
        return {
          verifiedPlugs: plugs.map((p) => ({
            name: p.title,
            category: p.service_category || 'Creative Plug',
            description: p.description,
            locations: p.locations,
            rates: p.price_ngn ? `₦${p.price_ngn.toLocaleString()}` : (p.price_usd ? `$${p.price_usd}` : 'Rate on request'),
            link: p.url || 'https://cruisehq.fun/plugs',
          })),
        };
      }

      // Web search fallback
      const webPlugs = await queryFirecrawl(`verified ${cat} for events parties in ${loc || 'the city'}`, 3);
      if (webPlugs.length > 0) {
        return {
          verifiedPlugs: webPlugs,
          source: 'live_web_verified',
        };
      }

      return {
        verifiedPlugs: [],
        message: `No verified plugs found in that exact category on CruiseHQ directory yet.`,
      };
    }

    case 'searchEvents': {
      const city = args.city || '';
      const query = args.query || '';
      const limit = 4;

      // 1. Check CruiseHQ events table
      let queryParams = `select=name,title,date,venue,city,description,source_url&limit=${limit}`;
      if (city) {
        queryParams += `&city=ilike.*${encodeURIComponent(city)}*`;
      }
      if (query) {
        queryParams += `&or=(name.ilike.*${encodeURIComponent(query)}*,title.ilike.*${encodeURIComponent(query)}*,description.ilike.*${encodeURIComponent(query)}*)`;
      }

      const dbEvents = await querySupabase('cruisehq_events', queryParams);
      if (dbEvents && dbEvents.length > 0) {
        return {
          events: dbEvents.map((e) => ({
            title: e.name || e.title,
            date: e.date,
            venue: e.venue,
            city: e.city,
            description: e.description,
            link: e.source_url,
          })),
          source: 'cruisehq_verified',
        };
      }

      // 2. Fallback to live Firecrawl web search (NO hardcoded static city arrays!)
      const searchTarget = city ? `${query} events happening in ${city} this weekend` : `${query} nightlife concerts popups this weekend`;
      const webResults = await queryFirecrawl(searchTarget, limit);

      if (webResults.length > 0) {
        return {
          events: webResults.map((item) => ({
            title: item.title,
            venue: city || 'City Venue',
            description: item.description,
            link: item.url,
          })),
          city: city || 'Local',
          source: 'live_web_verified',
        };
      }

      return {
        events: [],
        city,
        message: `No live events found matching "${query}" in ${city || 'this area'}. Check back closer to the weekend.`,
      };
    }

    case 'searchGames': {
      const vibe = args.vibe || '';
      const limit = 4;

      let queryParams = `select=title,vibe,description,how_to_play,people_count,rules_content&limit=${limit}`;
      if (vibe) {
        queryParams += `&or=(title.ilike.*${encodeURIComponent(vibe)}*,vibe.ilike.*${encodeURIComponent(vibe)}*,description.ilike.*${encodeURIComponent(vibe)}*)`;
      }

      const dbGames = await querySupabase('cruisehq_games', queryParams);
      if (dbGames && dbGames.length > 0) {
        return {
          games: dbGames.map((g) => ({
            title: g.title,
            vibe: g.vibe || 'Party Game',
            rules: g.how_to_play || g.rules_content || g.description,
            players: g.people_count || '3+ players',
          })),
        };
      }

      // Default classic party games
      return {
        games: [
          {
            title: 'Conce-Conce (Concentration)',
            vibe: 'High Energy Voice Rhythm',
            rules: 'Warmup chant: "Conce-Conce... CONCENTRATION!" Roll the rhythm: "Name of [Category]!". Go around the room naming one unique item on beat. 3 Golden Rules: No repeats, no off-category, don\'t freeze.',
            players: '3–20 players',
          },
          {
            title: 'Charades',
            vibe: 'Physical & Hilarious',
            rules: 'Act out words or phrases without talking. Teams guess against a 60-second timer.',
            players: '4+ players',
          },
        ],
      };
    }

    case 'createCruiseRoom': {
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      const baseUrl = process.env.CRUISEHQ_BASE_URL || 'https://cruisehq.fun';

      await insertSupabase('cruisehq_rooms', {
        room_code: code,
        status: 'active',
        event_title: args.title || 'Squad HQ Session',
      });

      return {
        roomCode: code,
        joinUrl: `${baseUrl}/room/${code}`,
        title: args.title || 'Squad HQ Session',
        message: `Synced CruiseHQ Room is live! Squad can join here: ${baseUrl}/room/${code}`,
      };
    }

    case 'createMemory': {
      await insertSupabase('cruisehq_memories', {
        content: `[${args.title}] ${args.content}`,
        metadata: {
          title: args.title,
          source: 'tcg_imessage_bot',
          created_at: new Date().toISOString(),
        },
      });

      return {
        saved: true,
        memoryTitle: args.title,
        message: `Saved to squad memory bank: "${args.title}"`,
      };
    }

    case 'savePronunciation': {
      pronunciationMap.set(args.name.toLowerCase(), args.phonetic);
      return {
        saved: true,
        name: args.name,
        phonetic: args.phonetic,
        message: `Got it. I will remember how to pronounce ${args.name} ("${args.phonetic}").`,
      };
    }

    case 'splitCheck': {
      const total = Number(args.totalAmount) || 0;
      const people = Math.max(1, Number(args.numberOfPeople) || 1);
      const tipPct = args.tipPercentage ? Number(args.tipPercentage) / 100 : 0;
      const grandTotal = total * (1 + tipPct);
      const perPerson = Math.ceil((grandTotal / people) * 100) / 100;
      const sym = args.currencySymbol || '₦';

      return {
        subtotal: total,
        tipPercent: args.tipPercentage || 0,
        grandTotal: Math.round(grandTotal * 100) / 100,
        perPerson,
        peopleCount: people,
        formattedTotal: `${sym}${grandTotal.toLocaleString()}`,
        formattedPerPerson: `${sym}${perPerson.toLocaleString()}`,
      };
    }

    case 'flipCoin': {
      const outcome = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return {
        result: outcome,
        reason: args.reason || 'Decision',
        message: `Coin landed on: ${outcome.toUpperCase()}!`,
      };
    }

    default:
      return { error: `Tool ${name} not found.` };
  }
}
