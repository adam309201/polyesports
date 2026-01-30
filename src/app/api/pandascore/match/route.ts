import { NextRequest, NextResponse } from 'next/server';

const PANDASCORE_API_URL = 'https://api.pandascore.co';
const PANDASCORE_API_KEY = process.env.PANDASCORE_API_KEY;

interface PandaScoreStream {
  main: boolean;
  language: string;
  raw_url: string;
  embed_url: string | null;
  official: boolean;
}

interface PandaScoreGame {
  id: number;
  position: number;
  status: string;
  winner: {
    id: number;
    name: string;
  } | null;
  winner_type: string;
}

interface PandaScoreTeam {
  id: number;
  name: string;
  acronym: string | null;
  image_url: string | null;
}

interface PandaScoreMatch {
  id: number;
  name: string;
  status: string; // "not_started" | "running" | "finished"
  scheduled_at: string;
  begin_at: string | null;
  end_at: string | null;
  number_of_games: number;
  games: PandaScoreGame[];
  opponents: Array<{
    opponent: PandaScoreTeam;
    type: string;
  }>;
  results: Array<{
    team_id: number;
    score: number;
  }>;
  streams_list: PandaScoreStream[];
  live_embed_url: string | null;
  official_stream_url: string | null;
  videogame: {
    id: number;
    name: string;
    slug: string;
  };
  league: {
    id: number;
    name: string;
    image_url: string | null;
  };
  serie: {
    id: number;
    name: string;
  };
  tournament: {
    id: number;
    name: string;
  };
}

// Search for matches by team names
async function searchMatchByTeams(team1: string, team2: string, game?: string): Promise<PandaScoreMatch | null> {
  if (!PANDASCORE_API_KEY) {
    console.error('PANDASCORE_API_KEY not configured');
    return null;
  }

  try {
    // Determine the game endpoint
    let gameSlug = 'csgo'; // default
    if (game) {
      const gameLower = game.toLowerCase();
      if (gameLower.includes('dota')) gameSlug = 'dota2';
      else if (gameLower.includes('lol') || gameLower.includes('league')) gameSlug = 'lol';
      else if (gameLower.includes('val')) gameSlug = 'valorant';
      else if (gameLower.includes('cs') || gameLower.includes('counter')) gameSlug = 'csgo';
    }

    // Fetch running and upcoming matches
    const response = await fetch(
      `${PANDASCORE_API_URL}/${gameSlug}/matches?filter[status]=running,not_started&sort=begin_at&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${PANDASCORE_API_KEY}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      console.error('PandaScore API error:', response.status);
      return null;
    }

    const matches: PandaScoreMatch[] = await response.json();

    // Normalize team names for comparison
    const normalizeTeamName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/esports?/gi, '')
        .replace(/gaming/gi, '')
        .replace(/team/gi, '');
    };

    const team1Normalized = normalizeTeamName(team1);
    const team2Normalized = normalizeTeamName(team2);

    // Find match with both teams
    const match = matches.find((m) => {
      if (m.opponents.length !== 2) return false;

      const matchTeams = m.opponents.map((o) => normalizeTeamName(o.opponent.name));
      const matchAcronyms = m.opponents
        .map((o) => o.opponent.acronym ? normalizeTeamName(o.opponent.acronym) : '')
        .filter(Boolean);

      const allTeamIdentifiers = [...matchTeams, ...matchAcronyms];

      const team1Match = allTeamIdentifiers.some(
        (t) => t.includes(team1Normalized) || team1Normalized.includes(t)
      );
      const team2Match = allTeamIdentifiers.some(
        (t) => t.includes(team2Normalized) || team2Normalized.includes(t)
      );

      return team1Match && team2Match;
    });

    return match || null;
  } catch (error) {
    console.error('Error fetching PandaScore match:', error);
    return null;
  }
}

// Format match data for response
function formatMatchData(match: PandaScoreMatch) {
  const team1 = match.opponents[0]?.opponent;
  const team2 = match.opponents[1]?.opponent;

  const team1Score = match.results.find((r) => r.team_id === team1?.id)?.score ?? 0;
  const team2Score = match.results.find((r) => r.team_id === team2?.id)?.score ?? 0;

  // Get best stream (prefer official, then main, then any)
  let streamUrl: string | null = match.official_stream_url || match.live_embed_url;

  if (!streamUrl && match.streams_list.length > 0) {
    const officialStream = match.streams_list.find((s) => s.official);
    const mainStream = match.streams_list.find((s) => s.main);
    const englishStream = match.streams_list.find((s) => s.language === 'en');
    const anyStream = match.streams_list[0];

    const preferredStream = officialStream || mainStream || englishStream || anyStream;
    streamUrl = preferredStream?.raw_url || preferredStream?.embed_url || null;
  }

  return {
    id: match.id,
    status: match.status,
    isLive: match.status === 'running',
    scheduledAt: match.scheduled_at,
    beginAt: match.begin_at,
    numberOfGames: match.number_of_games,
    team1: {
      id: team1?.id,
      name: team1?.name,
      acronym: team1?.acronym,
      logo: team1?.image_url,
      score: team1Score,
    },
    team2: {
      id: team2?.id,
      name: team2?.name,
      acronym: team2?.acronym,
      logo: team2?.image_url,
      score: team2Score,
    },
    games: match.games.map((g) => ({
      position: g.position,
      status: g.status,
      winner: g.winner?.name || null,
    })),
    stream: {
      url: streamUrl,
      embedUrl: match.live_embed_url,
    },
    tournament: {
      name: match.tournament?.name,
      league: match.league?.name,
      leagueLogo: match.league?.image_url,
    },
    videogame: match.videogame?.name,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  const game = searchParams.get('game');

  if (!team1 || !team2) {
    return NextResponse.json(
      { error: 'team1 and team2 parameters are required' },
      { status: 400 }
    );
  }

  if (!PANDASCORE_API_KEY) {
    return NextResponse.json(
      { error: 'PandaScore API not configured' },
      { status: 503 }
    );
  }

  const match = await searchMatchByTeams(team1, team2, game || undefined);

  if (!match) {
    return NextResponse.json(
      { found: false, message: 'Match not found in PandaScore' },
      { status: 200 }
    );
  }

  const formattedMatch = formatMatchData(match);

  return NextResponse.json({
    found: true,
    match: formattedMatch,
  });
}
