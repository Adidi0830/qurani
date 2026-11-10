import { UserProfile } from "../database.types";
import { Group } from "../grup";

// Type for memorization types
export type MemorizationType = 'surah' | 'juz' | 'page' | 'praquran';

// Type for error categories
export type ErrorCategory = 'word' | 'verse';

export interface IRecap {
  id?: string;
  type: string;
  reciter_id: string;
  recitation_type: string;
  memorization_type: MemorizationType;
  memorization: string;
  conclusion?: string;
  notes?: string;
  mistakes?: {
    color?: string;
    text_uthman: string;
    type: string;
    word: string;
    key?: string;
    error_category?: ErrorCategory;
    page_number?: number;
    juz_number?: number;
    verse_number?: number;
    ayah_number?: number;
  }[];
  group_id?: string | null;
  examiner_id: string;
  created_at?: string;
  paraf?: boolean;
  page_conclusions_and_notes?: Record<string, { conclusion: string; notes: string }>;
  is_praquran: boolean;
  sketch_img_url?: string | null;
  signed_by?: UserProfile | null,
  signed_at?: string | null,
  qurani_settings?: {
    layout_type: string;
    font_type: string;
    font_size: string;
    page_mode: string;
  };

  group?: Group;
  examiner?: UserProfile;
  reciter?: UserProfile;
}

export interface MonthRecap {
  value: string;
  label: string;
}

export interface MonthUser {
  value: string;
  label: string;
}