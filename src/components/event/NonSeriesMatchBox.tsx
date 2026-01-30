import Image from 'next/image';
import {formatVolume, formatStartTime} from './event-utils';

interface NonSeriesMatchBoxProps {
  image: string;
  title: string;
  volume: number;
  endDate: string;
}

export default function NonSeriesMatchBox({image, title, volume, endDate}: NonSeriesMatchBoxProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {image && (
        <div className="w-32 h-32 rounded-2xl overflow-hidden mb-4 bg-[var(--bg-elevated)]">
          <Image
            src={image}
            alt={title}
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">{title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span className="px-3 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
          {formatVolume(volume)} Vol.
        </span>
        {endDate && (
          <span className="px-3 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Ends {formatStartTime(endDate)}
          </span>
        )}
      </div>
    </div>
  );
}
