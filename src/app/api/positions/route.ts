import { NextRequest, NextResponse } from 'next/server';

const DATA_API_URL = 'https://data-api.polymarket.com';
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export interface Position {
  id: string;
  tokenId: string;
  conditionId: string;
  outcomeIndex: number;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  question?: string;
  slug?: string;
  eventSlug?: string;
  image?: string;
  endDate?: string;
  resolved?: boolean;
  winningOutcome?: string;
  isWinner?: boolean;
  payout?: number;
}

interface DataApiPosition {
  asset: string;
  market?: string;
  conditionId: string;
  outcomeIndex: string;
  outcome: string;
  size: string;
  avgPrice: string;
  currentPrice: string;
  initialValue: string;
  currentValue: string;
  cashPnl: string;
  percentPnl: string;
  curPrice?: string;
  proxyWallet?: string;
  title?: string;
  slug?: string;
  eventSlug?: string;
  icon?: string;
  redeemable?: boolean;
  resolved?: boolean;
}

interface GammaMarket {
  question: string;
  slug: string;
  image: string;
  endDate: string;
  closed: boolean;
  conditionId: string;
  clobTokenIds?: string[];
  outcomes?: string[];
  outcomePrices?: string[];
  winningOutcome?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const activeUrl = `${DATA_API_URL}/positions?user=${address.toLowerCase()}&sizeThreshold=0.001&limit=100&offset=0`;
    const redeemableUrl = `${DATA_API_URL}/positions?user=${address.toLowerCase()}&sizeThreshold=0.001&redeemable=true&limit=100&offset=0`;

    const [activeRes, redeemableRes] = await Promise.all([
      fetch(activeUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
      fetch(redeemableUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
    ]);

    let allPositions: DataApiPosition[] = [];

    if (activeRes.ok) {
      const activeData = await activeRes.json();
      const activePositions: DataApiPosition[] = Array.isArray(activeData) ? activeData : (activeData.positions || []);
      allPositions = [...activePositions];
    }

    if (redeemableRes.ok) {
      const redeemableData = await redeemableRes.json();
      const redeemablePositions: DataApiPosition[] = Array.isArray(redeemableData) ? redeemableData : (redeemableData.positions || []);

      for (const rp of redeemablePositions) {
        rp.redeemable = true;
        rp.resolved = true;
      }

      for (const rp of redeemablePositions) {
        const existingIdx = allPositions.findIndex(
          (ap) => ap.asset === rp.asset && ap.conditionId === rp.conditionId
        );
        if (existingIdx === -1) {
          allPositions.push(rp);
        } else {
          allPositions[existingIdx].redeemable = true;
          allPositions[existingIdx].resolved = true;
        }
      }
    }

    const activePositions = allPositions.filter((p) => parseFloat(p.size) > 0.001);

    if (activePositions.length === 0) {
      return NextResponse.json({ positions: [] });
    }

    const tokenIds = [...new Set(activePositions.map((p) => p.asset || p.market).filter(Boolean))];
    const marketInfoMap = new Map<string, GammaMarket>();

    if (tokenIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < tokenIds.length; i += batchSize) {
        const batch = tokenIds.slice(i, i + batchSize);
        try {
          const marketUrl = `${GAMMA_API_URL}/markets?clob_token_ids=${batch.join(',')}`;
          const marketRes = await fetch(marketUrl, {
            headers: { Accept: 'application/json' },
            next: { revalidate: 60 },
          });

          if (marketRes.ok) {
            const marketsData = await marketRes.json();
            const markets: GammaMarket[] = Array.isArray(marketsData) ? marketsData : [];

            for (const market of markets) {
              if (market && market.clobTokenIds) {
                for (const tokenId of market.clobTokenIds) {
                  marketInfoMap.set(tokenId, market);
                }
              }
              if (market && market.conditionId) {
                marketInfoMap.set(market.conditionId, market);
              }
            }
          }
        } catch {
          // Continue without market info
        }
      }
    }

    const positions: Position[] = [];
    for (let index = 0; index < activePositions.length; index++) {
      const p = activePositions[index];
      try {
        const tokenId = p.asset || p.market || '';
        const size = parseFloat(p.size) || 0;
        const avgPrice = parseFloat(p.avgPrice) || 0;
        const currentPrice = parseFloat(p.currentPrice || p.curPrice || '0') || 0;
        const value = size * currentPrice;
        const pnl = parseFloat(p.cashPnl || '0') || 0;
        const pnlPercent = (parseFloat(p.percentPnl || '0') || 0) * 100;

        const marketInfo = marketInfoMap.get(tokenId) || marketInfoMap.get(p.conditionId);

        const priceIndicatesResolved = currentPrice === 0 || currentPrice === 1 ||
          currentPrice < 0.01 || currentPrice > 0.99;
        const isResolved = p.redeemable || p.resolved || marketInfo?.closed || priceIndicatesResolved;

        let winningOutcome: string | undefined;
        let isWinner = false;
        let payout = 0;

        if (isResolved) {
          if (currentPrice > 0.99) {
            winningOutcome = p.outcome;
            isWinner = true;
            payout = size;
          } else if (currentPrice < 0.01) {
            winningOutcome = p.outcome === 'Yes' ? 'No' :
                            p.outcome === 'No' ? 'Yes' :
                            'Unknown';
            isWinner = false;
            payout = 0;
          } else {
            if (marketInfo?.outcomes && Array.isArray(marketInfo.outcomePrices)) {
              const priceIndex = marketInfo.outcomePrices.findIndex(
                (price) => parseFloat(price) === 1 || parseFloat(price) > 0.99
              );
              if (priceIndex !== -1 && marketInfo.outcomes[priceIndex]) {
                winningOutcome = marketInfo.outcomes[priceIndex];
                isWinner = p.outcome.toLowerCase() === winningOutcome.toLowerCase();
                payout = isWinner ? size : 0;
              }
            }

            if (!winningOutcome && marketInfo?.winningOutcome) {
              winningOutcome = marketInfo.winningOutcome;
              isWinner = p.outcome.toLowerCase() === winningOutcome.toLowerCase();
              payout = isWinner ? size : 0;
            }
          }
        }

        positions.push({
          id: `${p.conditionId}-${p.outcomeIndex}-${index}`,
          tokenId,
          conditionId: p.conditionId,
          outcomeIndex: parseInt(p.outcomeIndex) || 0,
          outcome: p.outcome || 'Unknown',
          size,
          avgPrice,
          currentPrice,
          value,
          pnl,
          pnlPercent,
          question: p.title || marketInfo?.question,
          slug: p.slug || marketInfo?.slug,
          eventSlug: p.eventSlug,
          image: p.icon || marketInfo?.image,
          endDate: marketInfo?.endDate,
          resolved: isResolved,
          winningOutcome,
          isWinner,
          payout,
        });
      } catch {
        // Skip this position but continue with others
      }
    }

    positions.sort((a, b) => b.value - a.value);

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('[positions API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}
