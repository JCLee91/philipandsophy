import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DatacntrStore {
  selectedCohortId: string | 'all';
  setSelectedCohortId: (cohortId: string | 'all') => void;
}

export const useDatacntrStore = create<DatacntrStore>()(
  persist(
    (set) => ({
      selectedCohortId: 'all',
      setSelectedCohortId: (cohortId) => set({ selectedCohortId: cohortId }),
    }),
    {
      name: 'datacntr-storage',
    }
  )
);
