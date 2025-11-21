import { Tournament } from '../types';

const STORAGE_KEY = 'tournament_builder_data_v1';

interface StorageData {
  tournaments: Record<string, Tournament>; // Keyed by slug
}

const getStorage = (): StorageData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { tournaments: {} };
  } catch (e) {
    console.error("Failed to load storage", e);
    return { tournaments: {} };
  }
};

const setStorage = (data: StorageData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save storage", e);
  }
};

export const saveTournament = (tournament: Tournament) => {
  const data = getStorage();
  data.tournaments[tournament.urlSlug] = tournament;
  setStorage(data);
};

export const getTournament = (slug: string): Tournament | undefined => {
  const data = getStorage();
  return data.tournaments[slug];
};

export const getAllTournaments = (): Tournament[] => {
  const data = getStorage();
  return Object.values(data.tournaments).sort((a, b) => b.createdAt - a.createdAt);
};

export const checkSlugExists = (slug: string): boolean => {
  const data = getStorage();
  return !!data.tournaments[slug];
};