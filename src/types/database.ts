export interface Database {
  public: {
    Tables: {
      // User related tables
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string | null;
          full_name: string | null;
          email: string | null;
          no_hp: string | null;
          avatar: string | null;
          cover_img_url: string | null;
          country: string | null;
          province_id: number | null;
          city_id: number | null;
          nickname: string | null;
          gender: number | null;
          date_of_birth: string | null;
          job: string | null;
          bio: string | null;
          profile_user: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          email?: string | null;
          no_hp?: string | null;
          avatar?: string | null;
          cover_img_url?: string | null;
          country?: string | null;
          province_id?: number | null;
          city_id?: number | null;
          nickname?: string | null;
          gender?: number | null;
          date_of_birth?: string | null;
          job?: string | null;
          bio?: string | null;
          profile_user?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          email?: string | null;
          no_hp?: string | null;
          avatar?: string | null;
          cover_img_url?: string | null;
          country?: string | null;
          province_id?: number | null;
          city_id?: number | null;
          nickname?: string | null;
          gender?: number | null;
          date_of_birth?: string | null;
          job?: string | null;
          bio?: string | null;
          profile_user?: string | null;
        };
      };

      // Group related tables
      grup: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          is_private: boolean;
          code: string | null;
          owner_id: string | null;
          photo_path: string | null;
          deleted_at: string | null
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          is_private?: boolean;
          code?: string | null;
          owner_id?: string | null;
          photo_path?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string | null;
          is_private?: boolean;
          code?: string | null;
          owner_id?: string | null;
          photo_path?: string | null;
        };
      };

      grup_members: {
        Row: {
          id: number;
          created_at: string;
          grup_id: string | null;
          user_id: string | null;
          role: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          grup_id?: string | null;
          user_id?: string | null;
          role?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          grup_id?: string | null;
          user_id?: string | null;
          role?: string | null;
        };
      };

      grup_invitation_links: {
        Row: {
          id: number;
          created_at: string;
          token: string | null;
          expires_at: string | null;
          created_by: string | null;
          group_id: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          token?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          group_id?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          token?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          group_id?: string | null;
        };
      };

      // Friend system tables
      friend_requests: {
        Row: {
          id: string;
          requester_id: string;
          recipient_id: string;
          message: string | null;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          recipient_id: string;
          message?: string | null;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          recipient_id?: string;
          message?: string | null;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };

      // user_friendships: {
      //   Row: {
      //     id: string
      //     user_id: string
      //     friend_id: string
      //     friendship_date: string
      //   }
      //   Insert: {
      //     id?: string
      //     user_id: string
      //     friend_id: string
      //     friendship_date?: string
      //   }
      //   Update: {
      //     id?: string
      //     user_id?: string
      //     friend_id?: string
      //     friendship_date?: string
      //   }
      // }

      user_activity: {
        Row: {
          id: string;
          user_id: string;
          last_active: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          last_active?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          last_active?: string;
          updated_at?: string;
        };
      };

      // Notification system
      notifications: {
        Row: {
          id: string;
          user_id: string;
          from_user_id: string;
          type: string;
          group_id: string;
          is_read: boolean | null;
          is_action_taken: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          ticket_id: number | null;
          dedup_key: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_user_id: string;
          type: string;
          group_id: string;
          is_read?: boolean | null;
          is_action_taken?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          ticket_id?: number | null;
          dedup_key?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_user_id?: string;
          type?: string;
          group_id?: string;
          is_read?: boolean | null;
          is_action_taken?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          ticket_id?: number | null;
          dedup_key?: string | null;
        };
      };
    };

    Views: {
      grup_with_membership: {
        Row: {
          id: string | null;
          created_at: string | null;
          name: string | null;
          description: string | null;
          is_private: boolean | null;
          code: string | null;
          owner_id: string | null;
          photo_path: string | null;
          is_member: boolean | null;
        };
      };
    };

    Functions: {
      send_friend_request: {
        Args: {
          p_requester_id: string;
          p_recipient_id: string;
          p_message?: string;
        };
        Returns: boolean;
      };
      accept_friend_request: {
        Args: {
          p_requester_id: string;
          p_recipient_id: string;
        };
        Returns: boolean;
      };
      reject_friend_request: {
        Args: {
          p_requester_id: string;
          p_recipient_id: string;
        };
        Returns: boolean;
      };
    };
  };
}
