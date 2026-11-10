export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          created: string | null;
          name: string | null;
          nickname: string | null;
          gender: number | null;
          dob: string | null;
          job: string | null;
          bio: string | null;
          email: string | null;
          hp: string | null;
          avatar: string | null;
          countryName: string | null;
          stateName: string | null;
          cityName: string | null;
          countryId: number | null;
          stateId: number | null;
          cityId: number | null;
          role: string | null;
          isBlocked: boolean | null;
          isVerify: boolean;
          timezone: string | null;
          auth: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          created?: string | null;
          name?: string | null;
          nickname?: string | null;
          gender?: number | null;
          dob?: string | null;
          job?: string | null;
          bio?: string | null;
          email?: string | null;
          hp?: string | null;
          avatar?: string | null;
          countryName?: string | null;
          stateName?: string | null;
          cityName?: string | null;
          countryId?: number | null;
          stateId?: number | null;
          cityId?: number | null;
          role?: string | null;
          isBlocked?: boolean | null;
          isVerify?: boolean;
          timezone?: string | null;
          auth: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          created?: string | null;
          name?: string | null;
          nickname?: string | null;
          gender?: number | null;
          dob?: string | null;
          job?: string | null;
          bio?: string | null;
          email?: string | null;
          hp?: string | null;
          avatar?: string | null;
          countryName?: string | null;
          stateName?: string | null;
          cityName?: string | null;
          countryId?: number | null;
          stateId?: number | null;
          cityId?: number | null;
          role?: string | null;
          isBlocked?: boolean | null;
          isVerify?: boolean;
          timezone?: string | null;
          auth?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type UserProfileInsert =
  Database["public"]["Tables"]["user_profiles"]["Insert"];
export type UserProfileUpdate =
  Database["public"]["Tables"]["user_profiles"]["Update"];

// Extended UserProfile with Gmail avatar fallback for frontend use
export type UserProfileWithGmailAvatar = UserProfile & {
  gmail_avatar?: string | null;
};
