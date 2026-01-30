import MarketCard from './MarketCard';
import {Market, GroupedMarkets, getSectionHeader, getMarketTypeTitle} from './event-utils';

interface SeriesMarketListProps {
  groupedMarkets: GroupedMarkets;
  sortedMarketTypes: string[];
  selectedMarket: Market | null;
  selectedOutcomeIndex: 0 | 1;
  onSelectMarket: (market: Market, outcomeIndex?: 0 | 1) => void;
}

export default function SeriesMarketList({
  groupedMarkets,
  sortedMarketTypes,
  selectedMarket,
  selectedOutcomeIndex,
  onSelectMarket,
}: SeriesMarketListProps) {
  const shownHeaders = new Set<string>();

  return (
    <div className="space-y-4">
      {sortedMarketTypes.map((marketType) => {
        const typeMarkets = groupedMarkets[marketType];
        if (!typeMarkets || typeMarkets.length === 0) return null;

        const sectionHeader = getSectionHeader(marketType);
        const showHeader = sectionHeader && !shownHeaders.has(sectionHeader);
        if (sectionHeader) shownHeaders.add(sectionHeader);

        const title = getMarketTypeTitle(typeMarkets[0]);

        return (
          <div key={marketType}>
            {showHeader && (
              <h3 className="text-base font-semibold text-[var(--text-primary)] mt-6 mb-3">
                {sectionHeader}
              </h3>
            )}
            <MarketCard
              title={title}
              markets={typeMarkets}
              selectedMarket={selectedMarket}
              selectedOutcomeIndex={selectedOutcomeIndex}
              onSelectMarket={onSelectMarket}
            />
          </div>
        );
      })}
    </div>
  );
}
