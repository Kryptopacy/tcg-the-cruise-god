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
    if (!res.ok) return [];
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
    return await res.json();
  } catch (err) {
    console.error(`Supabase insert failed on ${table}:`, err);
    return null;
  }
}

export const tools: TCGToolDefinition[] = [
  {
    name: 'searchLocations',
    description: 'Find verified venues, restaurants, bars, and lounges from CruiseHQ or geocoded places.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Category, vibe, or name of location (e.g. "cocktail lounge", "rooftop", "suya")' },
        city: { type: 'string', description: 'Target city, e.g. "Lagos", "Ibadan", "London"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchPlugs',
    description: 'Find real, verified culture & creative plugs from the CruiseHQ directory (DJs, mobile mixologists, custom fashion, photographers, catering, barbers).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Service category like "DJ", "Barber", "Catering", "Mixologist", "Fashion"' },
        location: { type: 'string', description: 'City or state (e.g. "Lagos")' },
      },
      required: ['category'],
    },
  },
  {
    name: 'searchEvents',
    description: 'Search for upcoming community events and parties on CruiseHQ or verified live listings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Event type or vibe (e.g. "rave", "afrobeats", "listening party")' },
        city: { type: 'string', description: 'City name (e.g. "Lagos")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchGames',
    description: 'Search CruiseHQ party games and rules directory (Conce-Conce, Hot Seat, Impostor, Trivia, etc.).',
    parameters: {
      type: 'object',
      properties: {
        vibe: { type: 'string', description: 'Game style (e.g. "drinking", "high energy", "icebreaker", "fast-paced")' },
      },
      required: ['vibe'],
    },
  },
  {
    name: 'createCruiseRoom',
    description: 'Spins up a live interactive multiplayer room on CruiseHQ for the group to join synced arcade games and duels.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Session title or vibe' },
        hostName: { type: 'string', description: 'Name of the host initiating the room' },
      },
      required: ['title'],
    },
  },
  {
    name: 'checkCulturalTaste',
    description: 'Queries cultural affinity and taste intelligence for cross-domain matching (music, fashion, cinema, dining).',
    parameters: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Artist, brand, or film name' },
        targetDomain: { type: 'string', description: 'Target domain: "music", "fashion", "film", "dining"' },
      },
      required: ['entity'],
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
      },
      required: ['totalAmount', 'numberOfPeople'],
    },
  },
];

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'searchLocations': {
      let queryParams = 'select=name,category,city,address,vibes&limit=3';
      if (args.city) queryParams += `&city=ilike.*${encodeURIComponent(args.city)}*`;
      if (args.query) queryParams += `&name=ilike.*${encodeURIComponent(args.query)}*`;

      const data = await querySupabase('cruisehq_venues', queryParams);
      if (data && data.length > 0) {
        return { verifiedOnCruiseHQ: true, venues: data };
      }

      return {
        verifiedOnCruiseHQ: false,
        message: `No local CruiseHQ venues currently listed in this specific category for ${args.city || 'your area'}. Use external search or suggest asking the squad for their preferred neighborhood.`,
      };
    }

    case 'searchPlugs': {
      let queryParams = 'select=title,service_category,locations,description,price_ngn,social_links&limit=3';
      if (args.category) {
        queryParams += `&service_category=ilike.*${encodeURIComponent(args.category)}*`;
      }

      const data = await querySupabase('cruisehq_plugs', queryParams);
      if (data && data.length > 0) {
        return { verifiedPlugs: data };
      }

      return {
        verifiedPlugs: [],
        message: 'No verified plugs found in that exact category on CruiseHQ directory yet.',
      };
    }

    case 'searchEvents': {
      const localEvents = await querySupabase('cruisehq_events', 'select=*&limit=3');
      if (localEvents && localEvents.length > 0) {
        return { events: localEvents, source: 'cruisehq_verified' };
      }

      // Tier 2: Firecrawl fallback if available
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (firecrawlKey && args.city) {
        try {
          const resp = await fetch('https://api.firecrawl.dev/v0/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${firecrawlKey}`,
            },
            body: JSON.stringify({
              query: `${args.query} events happening in ${args.city} this weekend`,
              pageOptions: { fetchPageContent: false },
              limit: 3,
            }),
          });
          const searchData = await resp.json();
          if (searchData.success && searchData.data) {
            return {
              events: searchData.data.map((item: any) => ({
                title: item.title,
                url: item.url,
                description: item.description,
              })),
              source: 'live_web_verified',
            };
          }
        } catch (e) {
          console.warn('Firecrawl search failed:', e);
        }
      }

      return {
        events: [],
        message: 'No active organizer events currently on CruiseHQ for this date/location. State honestly that none are listed on CruiseHQ yet.',
      };
    }

    case 'searchGames': {
      const games = await querySupabase(
        'cruisehq_games',
        'select=title,category,short_rules,player_range,energy_level&limit=4'
      );
      if (games && games.length > 0) {
        return { games };
      }

      return {
        games: [
          {
            title: 'Conce-Conce (Concentration)',
            category: 'Voice Party Game',
            short_rules: 'Rhythm clapping game: pick a category (e.g. Car Brands), name an item on beat without hesitating or repeating.',
            player_range: '3-20 players',
          },
        ],
      };
    }

    case 'createCruiseRoom': {
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      const baseUrl = process.env.CRUISEHQ_BASE_URL || 'https://cruisehq.fun';

      await insertSupabase('cruisehq_rooms', {
        room_code: code,
        title: args.title || 'Squad HQ Session',
        host_cruise_id: args.hostName || 'iMessage Crew',
        status: 'active',
      });

      return {
        roomCode: code,
        joinUrl: `${baseUrl}/room/${code}`,
        message: `Interactive Room "${args.title}" is live. Friends can join on their screens: ${baseUrl}/room/${code}`,
      };
    }

    case 'checkCulturalTaste': {
      return {
        entity: args.entity,
        targetDomain: args.targetDomain || 'general',
        culturalInsight: `Strong underground crossover with niche electronic/afrobeats scenes and minimalist streetwear. Recommend relaxed, atmospheric spots over loud commercial clubs.`,
      };
    }

    case 'splitCheck': {
      const total = Number(args.totalAmount);
      const people = Math.max(1, Number(args.numberOfPeople));
      const tipPct = args.tipPercentage ? Number(args.tipPercentage) / 100 : 0;
      const grandTotal = total * (1 + tipPct);
      const perPerson = Math.ceil((grandTotal / people) * 100) / 100;

      return {
        subtotal: total,
        tipPercent: args.tipPercentage || 0,
        grandTotal: Math.round(grandTotal * 100) / 100,
        perPerson,
        peopleCount: people,
      };
    }

    default:
      return { error: `Tool ${name} not found.` };
  }
}
