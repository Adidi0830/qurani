import type { Database } from "@/types/database";

// Use database types as base
type GrupRow = Database["public"]["Tables"]["grup"]["Row"];
type GrupMemberRow = Database["public"]["Tables"]["grup_members"]["Row"];

interface UserProfiles {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  nickname: string | null;
  hp: string | null;
  avatar: string | null;
  countryName: string | null;
  stateName: string | null;
  cityName: string | null;
  created: string;
}

// Extended types for components
interface Grup extends GrupRow {
  grup_members: GrupMemberRow[];
  is_member?: boolean;
}

interface GroupMember {
  id: string;
  role: "admin" | "member" | "owner";
  user_id: string;
  grup_id: string;
  created_at: string;
  user: UserProfiles;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  photo_path?: string;
  is_private: boolean;
  created_at: string;
  grup_members: { count: number }[];
}

interface MyGroup {
  role: "admin" | "member";
  grup: Group;
  user_id: string;
}

interface MappedGroup {
  id: string;
  name: string;
  description: string | null;
  avatar?: string;
  memberCount: number;
  isPrivate: boolean;
  role: "admin" | "member" | "owner" | null;
  createdAt: string;
  total_members: number;
  category?: number; // Changed from string to number to match database
  deleted_at?: string | null;
  countryId?: number | null; // Changed from string to number  
  countryName?: string | null;
  stateId?: number | null; // Fixed: changed from provinceId to stateId
  stateName?: string | null; // Fixed: changed from provinceName to stateName
  cityId?: number | null; // Changed from string to number
  cityName?: string | null;
  // New fields for all groups view
  is_member?: boolean;
  user_role?: "admin" | "member" | "owner" | null;
  type?: "public" | "private" | "secret" | null;
  isVerified?: boolean; // Group verification status
}

interface GroupCardProps {
  group: MappedGroup;
  status: "admin" | "member" | "owner";
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
}

interface Chapters {
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: string;
  name_simple: string;
  nama_alt: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: Record<string, unknown>;
  translated_name: Record<string, unknown>;
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
  char_type_nar: string;
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

interface SearchGroupResult {
  id: string;
  name: string;
  description: string;
  photo_path: string | null;
  owner_id: string;
  is_private: boolean;
  created_at: string;
  grup_members: {
    user_id: string;
    grup: {
      category: {
        id: string;
        name: string;
      };
    };
  }[];
  is_member: boolean;
  category: string;
  type: string;
  province_name?: string;
  city_name?: string;
  country_id?: number | null;
  country_name?: string | null;
  state_id?: number | null;
  city_id?: number | null;
  has_requested_join?: boolean;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  photo_path: string | null;
  is_private: boolean;
  created_at: string;
  owner_id: string;
  is_member?: boolean;
  type: string;
  status: string;
  deleted_at?: string | null;
  city_name?: string | null;
  province_name: string | null;
  category?: {
    id: string;
    name: string;
  };
  grup_members: GroupMember[];
}

// Invitation link types
interface InvitationLink {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

interface InvitationLinkWithGroup extends InvitationLink {
  grup: {
    id: string;
    name: string;
    description: string | null;
    photo_path: string | null;
    is_private: boolean;
    owner_id: string;
  };
}

// Group Settings types for SPA implementation
interface GroupSettings {
  id: number;
  key: string;
  value: string;
  color: string | null;
  status: number;
}

interface GroupMemberWithUser {
  id: string;
  role: "owner" | "admin" | "member";
  user_id: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar: string | null;
    profile_user: string | null;
  };
}

interface SettingsMutationData {
  layoutType?: string;
  fontType?: string;
  fontSize?: number;
  pageMode?: string;
  labels?: Array<{
    id: number;
    value: string;
    color: string;
    status: number;
  }>;
}

interface Categories {
  id: string;
}

export type {
  UserProfiles,
  Grup,
  Group,
  Chapters,
  ChapterInfos,
  Words,
  SearchGroupResult,
  GroupMember,
  MyGroup,
  MappedGroup,
  GroupCardProps,
  GroupDetail,
  InvitationLink,
  InvitationLinkWithGroup,
  GroupSettings,
  GroupMemberWithUser,
  SettingsMutationData,
  Categories,
};
