import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MemorizationType, ErrorCategory } from "@/types/recap";

type SetoranState = {
  type: "group" | "friend";
  group_id: string | null;
  recitation_type: "tahsin" | "tahfidz" | "praquran";
  memorization_type: MemorizationType;
  selectedItem: string | null;
  selectedMember: string | null;
  selectedMemberName: string | null;
  address: string | null;
  mistakes: {
    word: string;
    color: string;
    type: string;
    text_uthman: string;
    key?: string;
    page_number?: number;
    verse_number?: number;
    juz_number?: number;
    error_category?: ErrorCategory;
    id?: string;
  }[];
  chapters: { 
    surah: string, 
    start_verse: number, 
    end_verse: number, 
    verse_numbers: number[] 
  }[];
  qurani_settings: {
    layout_type: string | undefined,
    font_type: string | undefined,
    font_size: string | undefined,
    page_mode: string | undefined,
  }
  startSurah: string | null;
  endSurah: string | null;
  startVerse: string | null;
  endVerse: string | null;
  pageConclusionsAndNotes: Record<string, { conclusion: string; notes: string }>;
  verse_number?: number[]
  selectedItemId?: string | null;
  is_praquran?: boolean | false;
  resetStore: () => void;
  setData: (data: Partial<SetoranState>) => void;
  setPageConclusionsAndNotes: (pageKey: string, conclusion: string, notes: string) => void;
};

export const useSetoranStore = create<SetoranState>()(
  persist(
    (set) => ({
      type: "group",
      group_id: null,
      recitation_type: "tahsin",
      memorization_type: "surah",
      selectedItem: null,
      selectedMember: null,
      selectedMemberName: null,
      address: null,
      mistakes: [],
      startSurah: null,
      endSurah: null,
      startVerse: null,
      endVerse: null,
      pageConclusionsAndNotes: {},
      verse_number: [],
      chapters: [],
      qurani_settings: {
        layout_type: "",
        font_type: "",
        font_size: "",
        page_mode: "",
      },
      selectedItemId: null,
      is_praquran: false,
      resetStore: () =>
        set({
          type: "group",
          group_id: null,
          recitation_type: "tahsin",
          memorization_type: "surah",
          selectedItem: null,
          selectedMember: null,
          selectedMemberName: null,
          address: null,
          mistakes: [],
          startSurah: null,
          endSurah: null,
          startVerse: null,
          endVerse: null,
          pageConclusionsAndNotes: {},
          verse_number: [],
          chapters: [],
          qurani_settings: {
            layout_type: undefined,
            font_type: undefined,
            font_size: undefined,
            page_mode: undefined,
          },
          is_praquran: false
        }),
      setData: (data) => set(data),
      setPageConclusionsAndNotes: (pageKey: string, conclusion: string, notes: string) =>
        set((state) => ({
          pageConclusionsAndNotes: {
            ...state.pageConclusionsAndNotes,
            [pageKey]: { conclusion, notes }
          }
        })),
    }),
    {
      name: "setoran-storage", // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage for persistence
      // Optional: You can specify which fields to persist
      partialize: (state) => ({
        type: state.type,
        group_id: state.group_id,
        recitation_type: state.recitation_type,
        memorization_type: state.memorization_type,
        selectedItem: state.selectedItem,
        selectedMember: state.selectedMember,
        selectedMemberName: state.selectedMemberName,
        address: state.address,
        startSurah: state.startSurah,
        endSurah: state.endSurah,
        startVerse: state.startVerse,
        endVerse: state.endVerse,
        // mistakes akan di-persist juga, tetapi mungkin Anda ingin mengecualikannya
        mistakes: state.mistakes,
        pageConclusionsAndNotes: state.pageConclusionsAndNotes,
        verse_number: state.verse_number,
        chapters: state.chapters,
        qurani_settings: state.qurani_settings,
        selectedItemId: state.selectedItemId,
        is_praquran: state.is_praquran,
      }),
    }
  )
);
