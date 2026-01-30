import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenIds = searchParams.get('tokenIds');

  if (!tokenIds) {
    return NextResponse.json({ error: 'tokenIds required' }, { status: 400 });
  }

  try {
    const url = `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenIds}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error('[markets-by-tokens] API error:', response.status);
      return NextResponse.json({ error: 'Failed to fetch markets' }, { status: response.status });
    }

    const markets = await response.json();

    const tokenMap: Record<
      string,
      { question: string; slug: string; image: string; outcome: string }
    > = {};

    if (Array.isArray(markets)) {
      markets.forEach((market: any) => {
        let tokens = market.clobTokenIds || [];
        if (typeof tokens === 'string') {
          try {
            tokens = JSON.parse(tokens);
          } catch {
            tokens = [tokens];
          }
        }
        if (!Array.isArray(tokens)) {
          tokens = [tokens];
        }

        let outcomes = market.outcomes || ['Yes', 'No'];
        if (typeof outcomes === 'string') {
          try {
            outcomes = JSON.parse(outcomes);
          } catch {
            outcomes = ['Yes', 'No'];
          }
        }

        tokens.forEach((tokenId: string, idx: number) => {
          tokenMap[tokenId] = {
            question: market.question || '',
            slug: market.slug || '',
            image: market.image || '',
            outcome: outcomes[idx] || (idx === 0 ? 'Yes' : 'No'),
          };
        });
      });
    }

    return NextResponse.json({ tokenMap });
  } catch (error: any) {
    console.error('[markets-by-tokens] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
