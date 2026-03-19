import { create } from 'zustand';
import { format } from 'date-fns';

interface SearchState {
  fromCityId: string;
  fromCityName: string;
  fromCountry: string;
  toCityId: string;
  toCityName: string;
  toCountry: string;
  departFromDate: string; // ISO date string, e.g. "2026-03-19"
}

interface SearchActions {
  setFromCity: (id: string, name: string, country: string) => void;
  setToCity: (id: string, name: string, country: string) => void;
  setDepartFromDate: (date: string) => void;
  reset: () => void;
}

const todayIso = format(new Date(), 'yyyy-MM-dd');

const initialState: SearchState = {
  fromCityId: '',
  fromCityName: '',
  fromCountry: '',
  toCityId: '',
  toCityName: '',
  toCountry: '',
  departFromDate: todayIso,
};

export const useSearchStore = create<SearchState & SearchActions>((set) => ({
  ...initialState,

  setFromCity: (id, name, country) =>
    set({ fromCityId: id, fromCityName: name, fromCountry: country }),

  setToCity: (id, name, country) =>
    set({ toCityId: id, toCityName: name, toCountry: country }),

  setDepartFromDate: (date) => set({ departFromDate: date }),

  reset: () => set({ ...initialState, departFromDate: format(new Date(), 'yyyy-MM-dd') }),
}));
