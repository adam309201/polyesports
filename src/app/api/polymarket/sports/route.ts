import { NextResponse } from 'next/server';

// Esports sport IDs from Polymarket
const ESPORTS_SPORT_IDS = [37, 38, 39, 40, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];

interface PolymarketSport {
  id: number;
  sport: string;
  image: string;
  series: string;
}

interface PolymarketSeries {
  id: string;
  title: string;
  slug: string;
  image: string;
}

export async function GET() {
  try {
    // Fetch all sports
    const sportsResponse = await fetch('https://gamma-api.polymarket.com/sports', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!sportsResponse.ok) {
      throw new Error(`Polymarket API error: ${sportsResponse.status}`);
    }

    const sportsData: PolymarketSport[] = await sportsResponse.json();

    // Filter esports games
    const esportsSports = sportsData.filter((sport) =>
      ESPORTS_SPORT_IDS.includes(sport.id)
    );

    // Fetch series info for each esports game to get proper names
    const esportsGames = await Promise.all(
      esportsSports.map(async (sport) => {
        try {
          const seriesResponse = await fetch(
            `https://gamma-api.polymarket.com/series/${sport.series}`,
            {
              headers: { 'Accept': 'application/json' },
              next: { revalidate: 3600 },
            }
          );
          if (seriesResponse.ok) {
            const seriesData: PolymarketSeries = await seriesResponse.json();
            return {
              id: sport.id,
              name: seriesData.title || sport.sport,
              slug: sport.sport,
              image: sport.image || seriesData.image,
              seriesId: parseInt(sport.series) || 0,
            };
          }
        } catch {
          // Fallback to sport code if series fetch fails
        }

        return {
          id: sport.id,
          name: sport.sport.toUpperCase(),
          slug: sport.sport,
          image: sport.image,
          seriesId: parseInt(sport.series) || 0,
        };
      })
    );

    return NextResponse.json(esportsGames);
  } catch (error) {
    console.error('Polymarket API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch esports games from Polymarket' },
      { status: 500 }
    );
  }
}
