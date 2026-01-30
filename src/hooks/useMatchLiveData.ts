'use client';

import { useQuery } from '@tanstack/react-query';

interface TeamData {
  id: number;
  name: string;
  acronym: string | null;
  logo: string | null;
  score: number;
}

interface GameData {
  position: number;
  status: string;
  winner: string | null;
}

interface StreamData {
  url: string | null;
  embedUrl: string | null;
}

interface TournamentData {
  name: string;
  league: string;
  leagueLogo: string | null;
}

export interface MatchLiveData {
  id: number;
  status: string;
  isLive: boolean;
  scheduledAt: string;
  beginAt: string | null;
  numberOfGames: number;
  team1: TeamData;
  team2: TeamData;
  games: GameData[];
  stream: StreamData;
  tournament: TournamentData;
  videogame: string;
}

interface UseMatchLiveDataResult {
  data: MatchLiveData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  found: boolean;
  refetch: () => void;
}

export function useMatchLiveData(
  team1: string | undefined,
  team2: string | undefined,
  game?: string,
  enabled: boolean = true
): UseMatchLiveDataResult {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['matchLiveData', team1, team2, game],
    queryFn: async () => {
      if (!team1 || !team2) {
        return { found: false, match: null };
      }

      const params = new URLSearchParams({
        team1,
        team2,
        ...(game && { game }),
      });

      const response = await fetch(`/api/pandascore/match?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }

      return response.json();
    },
    enabled: enabled && !!team1 && !!team2,
    refetchInterval: 30000, // Refetch every 30 seconds for live data
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 1,
  });

  return {
    data: data?.match || null,
    isLoading,
    isError,
    error: error as Error | null,
    found: data?.found || false,
    refetch,
  };
}
