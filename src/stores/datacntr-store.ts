import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSafeLocalStorage } from '@/lib/safe-storage';

interface DatacntrStore {
  selectedCohortId: string | null;
  setSelectedCohortId: (cohortId: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useDatacntrStore = create<DatacntrStore>()(
  persist(
    (set) => ({
      selectedCohortId: null,
      setSelectedCohortId: (cohortId) => set({ selectedCohortId: cohortId }),
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'datacntr-storage',
      storage: createJSONStorage(() => createSafeLocalStorage()),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
