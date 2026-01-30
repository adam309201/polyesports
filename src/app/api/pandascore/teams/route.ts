import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for team logos
const teamLogoCache = new Map<string, { logo: string | null; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface PandaScoreTeam {
  id: number;
  name: string;
  acronym: string | null;
  image_url: string | null;
  slug: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamName = searchParams.get('name');
  const game = searchParams.get('game'); // cs2, valorant, lol, dota2

  if (!teamName) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const apiKey = process.env.PANDASCORE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PandaScore API key not configured' }, { status: 500 });
  }

  // Check cache first
  const cacheKey = `${teamName.toLowerCase()}_${game || 'all'}`;
  const cached = teamLogoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ logo: cached.logo, cached: true });
  }

  try {
    // Map game names to PandaScore videogame slugs
    const gameSlugMap: Record<string, string> = {
      cs2: 'cs-2',
      csgo: 'cs-go',
      valorant: 'valorant',
      lol: 'league-of-legends',
      dota2: 'dota-2',
      dota: 'dota-2',
      cod: 'call-of-duty',
      overwatch: 'ow-2',
      pubg: 'pubg',
      r6: 'r6-siege',
      rocketleague: 'rl',
    };

    const videogameSlug = game ? gameSlugMap[game.toLowerCase()] : null;

    // Search for team
    let url = `https://api.pandascore.co/teams?search[name]=${encodeURIComponent(teamName)}`;
    if (videogameSlug) {
      url += `&filter[videogame]=${videogameSlug}`;
    }
    url += '&per_page=5';

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      throw new Error(`PandaScore API error: ${response.status}`);
    }

    const teams: PandaScoreTeam[] = await response.json();

    // Find best match
    const exactMatch = teams.find(
      (t) => t.name.toLowerCase() === teamName.toLowerCase() ||
             t.acronym?.toLowerCase() === teamName.toLowerCase()
    );

    const team = exactMatch || teams[0];
    const logo = team?.image_url || null;

    // Cache the result
    teamLogoCache.set(cacheKey, { logo, timestamp: Date.now() });

    return NextResponse.json({
      logo,
      team: team ? { id: team.id, name: team.name, acronym: team.acronym } : null,
    });
  } catch (error) {
    console.error('PandaScore API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team from PandaScore' },
      { status: 500 }
    );
  }
}

// Batch endpoint to get multiple team logos at once
export async function POST(request: NextRequest) {
  const apiKey = process.env.PANDASCORE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PandaScore API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { teams, game } = body as { teams: string[]; game?: string };

    if (!teams || !Array.isArray(teams)) {
      return NextResponse.json({ error: 'Teams array is required' }, { status: 400 });
    }

    const results: Record<string, string | null> = {};
    const teamsToFetch: string[] = [];

    // Check cache for each team
    for (const teamName of teams) {
      const cacheKey = `${teamName.toLowerCase()}_${game || 'all'}`;
      const cached = teamLogoCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        results[teamName] = cached.logo;
      } else {
        teamsToFetch.push(teamName);
      }
    }

    // Fetch uncached teams in parallel (with rate limiting)
    const gameSlugMap: Record<string, string> = {
      cs2: 'cs-2',
      valorant: 'valorant',
      lol: 'league-of-legends',
      dota2: 'dota-2',
    };
    const videogameSlug = game ? gameSlugMap[game.toLowerCase()] : null;

    const fetchPromises = teamsToFetch.map(async (teamName) => {
      let url = `https://api.pandascore.co/teams?search[name]=${encodeURIComponent(teamName)}`;
      if (videogameSlug) {
        url += `&filter[videogame]=${videogameSlug}`;
      }
      url += '&per_page=3';

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) return { teamName, logo: null };

        const teamsData: PandaScoreTeam[] = await response.json();
        const exactMatch = teamsData.find(
          (t) => t.name.toLowerCase() === teamName.toLowerCase() ||
                 t.acronym?.toLowerCase() === teamName.toLowerCase()
        );
        const team = exactMatch || teamsData[0];
        const logo = team?.image_url || null;

        // Cache result
        const cacheKey = `${teamName.toLowerCase()}_${game || 'all'}`;
        teamLogoCache.set(cacheKey, { logo, timestamp: Date.now() });

        return { teamName, logo };
      } catch {
        return { teamName, logo: null };
      }
    });

    const fetchResults = await Promise.all(fetchPromises);
    for (const { teamName, logo } of fetchResults) {
      results[teamName] = logo;
    }

    return NextResponse.json({ logos: results });
  } catch (error) {
    console.error('PandaScore batch API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams from PandaScore' },
      { status: 500 }
    );
  }
}
