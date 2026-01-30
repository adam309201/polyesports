'use client';

import { useState, useEffect, useCallback } from 'react';

interface TeamLogosCache {
  [teamName: string]: string | null;
}

// Global cache to persist across component remounts
const globalLogoCache: TeamLogosCache = {};

export function useTeamLogos(teamNames: string[]) {
  const [logos, setLogos] = useState<TeamLogosCache>({});
  const [loading, setLoading] = useState(false);

  const fetchLogos = useCallback(async (names: string[]) => {
    if (names.length === 0) return;

    // Filter out already cached names
    const uncachedNames = names.filter(
      (name) => globalLogoCache[name] === undefined
    );

    if (uncachedNames.length === 0) {
      // All logos are cached
      const cachedLogos: TeamLogosCache = {};
      names.forEach((name) => {
        cachedLogos[name] = globalLogoCache[name];
      });
      setLogos(cachedLogos);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/pandascore/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: uncachedNames }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team logos');
      }

      const data = await response.json();
      const fetchedLogos = data.logos || {};

      // Update global cache
      Object.entries(fetchedLogos).forEach(([name, logo]) => {
        globalLogoCache[name] = logo as string | null;
      });

      // Also cache names that weren't found
      uncachedNames.forEach((name) => {
        if (globalLogoCache[name] === undefined) {
          globalLogoCache[name] = null;
        }
      });

      // Set all logos (cached + newly fetched)
      const allLogos: TeamLogosCache = {};
      names.forEach((name) => {
        allLogos[name] = globalLogoCache[name] ?? null;
      });
      setLogos(allLogos);
    } catch (error) {
      console.error('Error fetching team logos:', error);
      // Set null for all unfetched names
      const fallbackLogos: TeamLogosCache = {};
      names.forEach((name) => {
        fallbackLogos[name] = globalLogoCache[name] ?? null;
      });
      setLogos(fallbackLogos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (teamNames.length > 0) {
      fetchLogos(teamNames);
    }
  }, [teamNames.join(','), fetchLogos]);

  return { logos, loading };
}

// Utility to get a single team logo with caching
export function useTeamLogo(teamName: string | null) {
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamName) {
      setLogo(null);
      return;
    }

    // Check global cache first
    if (globalLogoCache[teamName] !== undefined) {
      setLogo(globalLogoCache[teamName]);
      return;
    }

    const fetchLogo = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/pandascore/teams?name=${encodeURIComponent(teamName)}`
        );
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        const fetchedLogo = data.logo || null;

        globalLogoCache[teamName] = fetchedLogo;
        setLogo(fetchedLogo);
      } catch {
        globalLogoCache[teamName] = null;
        setLogo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [teamName]);

  return { logo, loading };
}
