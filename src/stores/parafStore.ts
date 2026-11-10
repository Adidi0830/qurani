import { create } from 'zustand'

interface ParafStore {
  parafStatuses: { [key: string]: boolean }
  setParafStatus: (recapId: string, status: boolean) => void
  loadParafStatuses: (statuses: { [key: string]: boolean }) => void
  resetParafStatuses: () => void
}

export const useParafStore = create<ParafStore>((set) => ({
  parafStatuses: {},
  setParafStatus: (recapId, status) => set((state) => ({
    parafStatuses: { ...state.parafStatuses, [recapId]: status }
  })),
  loadParafStatuses: (statuses) => set({ parafStatuses: statuses }),
  resetParafStatuses: () => set({ parafStatuses: {} })
}))