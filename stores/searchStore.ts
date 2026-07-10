import { create } from 'zustand';
import { format } from 'date-fns';

interface SearchState {
  fromCityId: string;
  fromCityName: string;
  fromCountry: string;
  toCityId: string;
  toCityName: string;
  toCountry: string;
  departFromDate: string | null; // ISO date string (e.g. "2026-03-19") or null for "any date"
}

interface SearchActions {
  setFromCity: (id: string, name: string, country: string) => void;
  setToCity: (id: string, name: string, country: string) => void;
  setDepartFromDate: (date: string | null) => void;
  reset: () => void;
}

const initialState: SearchState = {
  fromCityId: '',
  fromCityName: '',
  fromCountry: '',
  toCityId: '',
  toCityName: '',
  toCountry: '',
  departFromDate: null,
};

export const useSearchStore = create<SearchState & SearchActions>((set) => ({
  ...initialState,

  setFromCity: (id, name, country) =>
    set({ fromCityId: id, fromCityName: name, fromCountry: country }),

  setToCity: (id, name, country) =>
    set({ toCityId: id, toCityName: name, toCountry: country }),

  setDepartFromDate: (date) => set({ departFromDate: date }),

  reset: () => set({ ...initialState }),
}));
