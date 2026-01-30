import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get('market');

  if (!market) {
    return NextResponse.json({ error: 'market (conditionId) is required' }, { status: 400 });
  }

  try {
    const url = `https://data-api.polymarket.com/holders?market=${market}&limit=20`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Holders API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top holders' },
      { status: 500 }
    );
  }
}
