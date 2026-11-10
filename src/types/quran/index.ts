interface Chapters {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: string;
  name_simple: string;
  nama_alt: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  // pages: Record<string, any>;
  // translated_name: Record<string, any>;
}

interface ChapterInfos {
  id: number;
  chapter_id: number;
  en_us: string;
  id_id: string;
}

interface Words {
  id: number;
  original_id: number;
  position: number;
  char_type_name: string;
  location: string;
  text_uthmani: string;
  page_number: number;
  page_number_indopak: number; // ada field duplikat (mungkin typo di DB)
  line_number: number;
  line_number_indopak: number;
  text: string;
  translation: string; // jsonb
  transliteration: string; // jsonb
  created_at: string;
  updated_at: string;
}

interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null | "NULL";
  page_number: number;
  page_number_indopak: number;
  juz_number: number;
  text_uthmani: string;
  translations: Translation[];
  words: Words[];
}

interface Translation {
  id: number;
  text: string;
  language_id: number;
  resource_id: number;
}

interface WordIndopak {
  [key: string]: {
    id: number;
    surah: number;
    ayah: string;
    word: string;
    location: string;
    text: string;
  };
}

export type { ChapterInfos, Chapters, Words, Verse, WordIndopak };
