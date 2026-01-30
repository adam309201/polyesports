'use client';

import {useState} from 'react';
import {Market, parseMarketData, formatVolume} from './event-utils';

interface MarketCardProps {
  title: string;
  markets: Market[];
  selectedMarket: Market | null;
  selectedOutcomeIndex: 0 | 1;
  onSelectMarket: (market: Market, outcomeIndex?: 0 | 1) => void;
}

export default function MarketCard({
  title,
  markets,
  selectedMarket,
  selectedOutcomeIndex,
  onSelectMarket,
}: MarketCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMarket = markets[activeIndex] || markets[0];
  const {prices, outcomes} = activeMarket ? parseMarketData(activeMarket) : {prices: [], outcomes: []};
  const isSelected = selectedMarket?.id === activeMarket?.id;
  const totalVolume = markets.reduce((sum, m) => sum + (m.volumeNum || 0), 0);

  const activeTitle = activeMarket?.groupItemTitle || title;
  const hasVariants = markets.length > 1;

  return (
    <div
      onClick={() => onSelectMarket(activeMarket, 0)}
      className={`rounded-xl border overflow-hidden mb-3 transition-all cursor-pointer ${
        isSelected
          ? 'border-[#ccc] bg-[var(--bg-elevated)]'
          : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]'
      }`}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
        <div className="flex flex-col gap-0.5 min-w-0 flex-shrink-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {activeTitle}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatVolume(totalVolume)} Vol.
          </p>
        </div>

        {/* Outcome Buttons */}
        <div className="flex w-full sm:w-auto items-center gap-2 ml-0 sm:ml-auto">
          {outcomes.map((outcome, idx) => {
            const price = ((prices[idx] || 0) * 100).toFixed(0);

            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMarket(activeMarket, idx as 0 | 1);
                }}
                className={`w-full flex-1 sm:w-[125px] flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase transition-all duration-150 active:scale-95 hover:brightness-110 ${
                  isSelected
                    ? idx === 0
                      ? 'bg-[#00b8ff] text-white shadow-lg shadow-[#00b8ff]/30'
                      : 'bg-[#5c6c8a] text-white shadow-lg shadow-[#5c6c8a]/30'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="opacity-70 truncate">{outcome}</span>
                <span className="ml-1 text-sm flex-shrink-0">{price}¢</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Variant Swiper */}
      {hasVariants && (
        <div className="border-t border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-center h-12 relative">
            {/* Prev button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = Math.max(0, activeIndex - 1);
                setActiveIndex(newIndex);
                onSelectMarket(markets[newIndex], 0);
              }}
              disabled={activeIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline
                  points="7.75 1.75 3.5 6 7.75 10.25"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>

            {/* Variant buttons */}
            <div className="flex items-center gap-2">
              {markets.map((market, idx) => {
                const mapMatch = market.question.match(/map\s*(\d+)/i);
                const handicapMatch = market.question.match(/([+-]?\d+\.?\d*)/);
                const label = mapMatch ? mapMatch[1] : handicapMatch ? handicapMatch[1] : `${idx + 1}`;
                const isActive = activeIndex === idx;

                return (
                  <button
                    key={market.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(idx);
                      onSelectMarket(market, 0);
                    }}
                    className={`relative px-3 h-12 text-sm font-medium transition-all ${
                      isActive
                        ? 'text-[var(--text-primary)] text-base'
                        : 'text-[var(--text-secondary)] text-xs'
                    }`}
                  >
                    {isActive && (
                      <svg
                        className="absolute left-1/2 -translate-x-1/2 -top-1 text-[#00b8ff] z-10"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="m9.099,2.5H2.901c-.554,0-1.061.303-1.322.792-.262.488-.233,1.079.074,1.54l3.099,4.648c.279.418.745.668,1.248.668s.969-.25,1.248-.668l3.099-4.648c.308-.461.336-1.051.074-1.54-.262-.489-.769-.792-1.322-.792Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = Math.min(markets.length - 1, activeIndex + 1);
                setActiveIndex(newIndex);
                onSelectMarket(markets[newIndex], 0);
              }}
              disabled={activeIndex === markets.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline
                  points="4.25 10.25 8.5 6 4.25 1.75"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
