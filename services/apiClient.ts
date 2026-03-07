import { Match, Participant, Tournament, TournamentStatus, EliminationType } from "../types";

export interface TournamentSummary {
  id: string;
  name: string;
  title: string;
  urlSlug: string;
  description: string;
  participantCount: number;
  qualifiesByGroup: number;
  eliminationType: EliminationType;
  status: TournamentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

interface TournamentWritePayload {
  name: string;
  title: string;
  urlSlug: string;
  description: string;
  participantCount: number;
  qualifiesByGroup: number;
  eliminationType: EliminationType;
  status: TournamentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  participants: Participant[];
  matches: Match[];
}

const API_BASE = "/api";

const parseError = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const toWritePayload = (tournament: Tournament): TournamentWritePayload => ({
  name: tournament.name,
  title: tournament.title,
  urlSlug: tournament.urlSlug,
  description: tournament.description,
  participantCount: tournament.participantCount,
  qualifiesByGroup: tournament.qualifiesByGroup,
  eliminationType: tournament.eliminationType,
  status: tournament.status,
  createdAt: tournament.createdAt,
  startedAt: tournament.startedAt,
  completedAt: tournament.completedAt,
  participants: tournament.participants,
  matches: tournament.matches,
});

export const getHealth = async (): Promise<{ status: string }> => {
  const response = await fetch("/health");
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as { status: string };
};

export const listTournaments = async (): Promise<TournamentSummary[]> => request("/tournaments");

export const getTournamentById = async (id: string): Promise<Tournament> => request(`/tournaments/${id}`);

export const createTournament = async (tournament: Tournament): Promise<Tournament> =>
  request("/tournaments", {
    method: "POST",
    body: JSON.stringify(toWritePayload(tournament)),
  });

export const updateTournament = async (id: string, tournament: Tournament): Promise<Tournament> =>
  request(`/tournaments/${id}`, {
    method: "PUT",
    body: JSON.stringify(toWritePayload(tournament)),
  });

export const deleteTournament = async (id: string): Promise<void> =>
  request(`/tournaments/${id}`, {
    method: "DELETE",
  });

export const startTournament = async (
  id: string,
  payload: { participants: Participant[]; matches: Match[]; startedAt?: number }
): Promise<Tournament> =>
  request(`/tournaments/${id}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMatchResult = async (
  id: string,
  matchId: string,
  payload: { scoreA: number; scoreB: number }
): Promise<Tournament> =>
  request(`/tournaments/${id}/matches/${matchId}/result`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const swapMatchParticipant = async (
  id: string,
  matchId: string,
  payload: { slot: "A" | "B"; newParticipantId: string }
): Promise<Tournament> =>
  request(`/tournaments/${id}/matches/${matchId}/swap-participant`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
