import {Market, parseMarketData, formatVolume} from './event-utils';

interface NonSeriesMarketListProps {
  markets: Market[];
  selectedMarket: Market | null;
  selectedOutcomeIndex: 0 | 1;
  onSelectMarket: (market: Market, outcomeIndex?: 0 | 1) => void;
}

export default function NonSeriesMarketList({
  markets,
  selectedMarket,
  selectedOutcomeIndex,
  onSelectMarket,
}: NonSeriesMarketListProps) {
  const sortedMarkets = [...markets].sort((a, b) => {
    const aData = parseMarketData(a);
    const bData = parseMarketData(b);
    const aYesIdx = aData.outcomes.findIndex(o => o.toLowerCase().trim() === 'yes');
    const bYesIdx = bData.outcomes.findIndex(o => o.toLowerCase().trim() === 'yes');
    const aChance = aData.prices[aYesIdx >= 0 ? aYesIdx : 0] || 0;
    const bChance = bData.prices[bYesIdx >= 0 ? bYesIdx : 0] || 0;
    return bChance - aChance;
  });

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markets</h3>
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {sortedMarkets.map((market) => {
          const {prices, outcomes} = parseMarketData(market);
          const yesIdx = outcomes.findIndex(o => o.toLowerCase().trim() === 'yes');
          const noIdx = outcomes.findIndex(o => o.toLowerCase().trim() === 'no');
          const yesPrice = prices[yesIdx >= 0 ? yesIdx : 0] || 0;
          const noPrice = prices[noIdx >= 0 ? noIdx : 1] || 0;
          const chancePct = (yesPrice * 100).toFixed(0);
          const isSelected = selectedMarket?.id === market.id;

          return (
            <div
              key={market.id}
              onClick={() => onSelectMarket(market, 0)}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[var(--bg-elevated)]'
                  : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{market.question}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{formatVolume(market.volumeNum)} Vol.</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarket(market, (yesIdx >= 0 ? yesIdx : 0) as 0 | 1);
                  }}
                  className={`w-[90px] py-2 rounded-lg text-sm font-semibold text-center transition-all ${
                    isSelected && selectedOutcomeIndex === (yesIdx >= 0 ? yesIdx : 0)
                      ? 'bg-[#00b8ff] text-white'
                      : 'bg-[#00b8ff]/10 text-[#00b8ff] hover:bg-[#00b8ff]/20'
                  }`}
                >
                  Yes {(yesPrice * 100).toFixed(0)}¢
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarket(market, (noIdx >= 0 ? noIdx : 1) as 0 | 1);
                  }}
                  className={`w-[90px] py-2 rounded-lg text-sm font-semibold text-center transition-all ${
                    isSelected && selectedOutcomeIndex === (noIdx >= 0 ? noIdx : 1)
                      ? 'bg-[#5c6c8a] text-white'
                      : 'bg-[#5c6c8a]/10 text-[#5c6c8a] hover:bg-[#5c6c8a]/20'
                  }`}
                >
                  No {(noPrice * 100).toFixed(0)}¢
                </button>
              </div>
              <div className="w-14 text-right flex-shrink-0">
                <div className="text-sm font-bold text-[#00b8ff]">{chancePct}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">chance</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
