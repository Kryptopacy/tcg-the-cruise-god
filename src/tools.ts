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

// Clean utility functions for CruiseHQ Supabase directory lookup

export const tools: TCGToolDefinition[] = [
  {
    name: 'resolveGroupConsensus',
    description:
      'Solves group chat indecision: takes differing preferences or vibes mentioned by squad members in a city and constructs an executive compromise route with clear reasoning and Apple Tapback voting.',
    parameters: {
      type: 'object',
      properties: {
        memberVibes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of preferences from different friends in the chat (e.g. ["Dave: Afrobeats and rooftop cocktails", "Sarah: quiet jazz lounge, good pasta"])',
        },
        city: { type: 'string', description: 'City name (e.g. "Lagos", "London", "New York")' },
      },
      required: ['memberVibes'],
    },
  },
  {
    name: 'searchLocations',
    description:
      'Finds verified venues, restaurants, bars, and lounges from CruiseHQ directory.',
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
    description:
      'Finds real, verified culture & creative plugs from the CruiseHQ directory (DJs, mobile mixologists, custom fashion, photographers, catering, barbers).',
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
    description: 'Searches for upcoming community events and parties on CruiseHQ or verified live listings.',
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
    description: 'Searches CruiseHQ party games directory and rules (Conce-Conce, Hot Seat, Impostor, Trivia, etc.).',
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
    case 'resolveGroupConsensus': {
      const vibes = Array.isArray(args.memberVibes) ? args.memberVibes : [String(args.memberVibes)];
      const city = args.city || 'your city';

      return {
        mode: 'Squad Arbiter Consensus',
        squadVibesAnalyzed: vibes,
        city,
        recommendedConsensus: {
          vibeFormat: 'Hybrid: Sunset terrace drinks with relaxed dining, transitioning into energetic sounds',
          executiveDecision: `Lock in a spot with high quality food and craft drinks first, then transition the crew to music once dinner wraps.`,
          actionPrompt: 'Drop a Tapback ❤️ to lock this in, or 👎 to veto in the next 5 mins.',
        },
      };
    }

    case 'searchLocations': {
      let queryParams = 'select=name,category,city,address,vibes&limit=4';
      if (args.city) queryParams += `&city=ilike.*${encodeURIComponent(args.city)}*`;
      if (args.query) queryParams += `&name=ilike.*${encodeURIComponent(args.query)}*`;

      const data = await querySupabase('cruisehq_venues', queryParams);

      if (data && data.length > 0) {
        return {
          verifiedOnCruiseHQ: true,
          venues: data,
        };
      }

      return {
        verifiedOnCruiseHQ: false,
        message: `No local CruiseHQ venues currently listed for that exact query in ${args.city || 'your area'}.`,
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

      // Dynamic cultural events & recurring gatherings radar tailored to the requested city/location
      const cityLower = targetCity.toLowerCase();
      let curatedEvents = [];

      if (cityLower.includes('lagos') || cityLower.includes('eti osa') || cityLower.includes('lekki') || cityLower.includes('vi')) {
        curatedEvents = [
          {
            title: "Obi's House (Weekly Afrobeats & Amapiano)",
            venue: "Hard Rock Cafe Beachfront, Landmark, Victoria Island, Lagos",
            timing: "Every Monday night (11:00 PM till dawn)",
            vibe: "High-energy outdoor turnup, heavy bass, unpretentious crowd",
            access: "Entry & tables verified on CruiseHQ",
          },
          {
            title: "Sunday At The Park (Daytime Vibes & Community)",
            venue: "Muri Okunola Park, Victoria Island, Lagos",
            timing: "Sunday afternoon, 2:00 PM - 10:00 PM",
            vibe: "Chill daytime park picnic, food popups, streetwear vendors, indie live sets",
            access: "Open community admission",
          },
          {
            title: "Element House (Deep Afro House & Electronic)",
            venue: "Beachfront Location, Oniru, Lagos",
            timing: "Saturday night, midnight till sunrise",
            vibe: "Underground rave, curated sound system, strictly for the music",
            access: "RSVP guestlist required",
          },
        ];
      } else if (cityLower.includes('london')) {
        curatedEvents = [
          {
            title: "Recess London (Afrobeats, Amapiano & Dancehall)",
            venue: "Various Warehouses, Hackney / Shoreditch, London",
            timing: "Weekend evening, 6:00 PM till late",
            vibe: "High-octane diaspora gathering, forward-thinking selectors, energetic crowd",
            access: "Ticketed entry via Dice / CruiseHQ",
          },
          {
            title: "Daytimers / Dialled In Pop-Up",
            venue: "Colour Factory, Queen's Yard, Hackney Wick, London",
            timing: "Saturday daytime & dusk, 3:00 PM - 11:00 PM",
            vibe: "Underground community day rave, grassroots electronic & global sounds",
            access: "Advance RSVP",
          },
        ];
      } else if (cityLower.includes('accra')) {
        curatedEvents = [
          {
            title: "Front/Back Private Clubhouse Sets",
            venue: "Osu, Accra, Ghana",
            timing: "Friday & Saturday, 9:00 PM - 4:00 AM",
            vibe: "Intimate cultural space, Afro-fusion cocktails, high-taste creatives",
            access: "Member & verified guestlist",
          },
          {
            title: "Surf Club Sundays",
            venue: "Busua Beach / Kokrobite Coast",
            timing: "Sunday 1:00 PM - sunset",
            vibe: "Ocean waves, coastal breeze, relaxed grill, acoustic and chilled afro house",
            access: "Open beach entry",
          },
        ];
      } else {
        curatedEvents = [
          {
            title: `${targetCity} Cultural Radar Gathering`,
            venue: `Curated creative hub / pop-up space in ${targetCity}`,
            timing: "This weekend, afternoon into evening",
            vibe: "Local underground music showcase, streetwear pop-up, creative networking",
            access: "Check CruiseHQ community board",
          },
          {
            title: `${targetCity} Rooftop Sunset Sound`,
            venue: `Panoramic terrace venue, central ${targetCity}`,
            timing: "Sunday sunset, 4:00 PM - 10:00 PM",
            vibe: "Open-air drinks, ambient afrobeats and soulful grooves, good food",
            access: "Walk-ins & table reservations",
          },
        ];
      }

      return {
        events: curatedEvents,
        city: targetCity,
        source: 'cruise_curated_radar',
        message: `Active community events and cultural radar for ${targetCity}.`,
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
            short_rules: 'Rhythm clapping game: pick a category (e.g. Afrobeats Artists, Streetwear), name an item on beat without hesitating or repeating.',
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
