export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null;
          created_at: string | null;
          id: string;
          name: string;
          pair_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          pair_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          pair_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_notification_stats: {
        Row: {
          bins: number[];
          candidate_bins: number[];
          computed_for_jst_date: string;
          pair_id: string;
          updated_at: string;
        };
        Insert: {
          bins: number[];
          candidate_bins?: number[];
          computed_for_jst_date: string;
          pair_id: string;
          updated_at?: string;
        };
        Update: {
          bins?: number[];
          candidate_bins?: number[];
          computed_for_jst_date?: string;
          pair_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_notification_stats_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: true;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_notification_times: {
        Row: {
          bin_index: number;
          created_at: string;
          is_enabled: boolean;
          last_sent_jst_date: string | null;
          pair_id: string;
          updated_at: string;
        };
        Insert: {
          bin_index: number;
          created_at?: string;
          is_enabled?: boolean;
          last_sent_jst_date?: string | null;
          pair_id: string;
          updated_at?: string;
        };
        Update: {
          bin_index?: number;
          created_at?: string;
          is_enabled?: boolean;
          last_sent_jst_date?: string | null;
          pair_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_notification_times_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          pair_id: string;
          read_at: string | null;
          task_id: string | null;
          title: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          pair_id: string;
          read_at?: string | null;
          task_id?: string | null;
          title: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          pair_id?: string;
          read_at?: string | null;
          task_id?: string | null;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      pair_invitations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          invitee_email: string;
          status: string;
          supporter_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invitee_email: string;
          status?: string;
          supporter_id: string;
          token?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invitee_email?: string;
          status?: string;
          supporter_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pair_invitations_supporter_id_fkey";
            columns: ["supporter_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pairs: {
        Row: {
          created_at: string | null;
          id: string;
          learner_id: string;
          name: string;
          supporter_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          learner_id: string;
          name?: string;
          supporter_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          learner_id?: string;
          name?: string;
          supporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pairs_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairs_supporter_id_fkey";
            columns: ["supporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      point_events: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          jst_date: string;
          learner_id: string;
          pair_id: string;
          source: string;
          task_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          jst_date: string;
          learner_id: string;
          pair_id: string;
          source: string;
          task_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          jst_date?: string;
          learner_id?: string;
          pair_id?: string;
          source?: string;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "point_events_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_events_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_events_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          points: number | null;
          role: string;
          total_completed_tasks: number | null;
          total_points: number | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          name: string;
          points?: number | null;
          role: string;
          total_completed_tasks?: number | null;
          total_points?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          points?: number | null;
          role?: string;
          total_completed_tasks?: number | null;
          total_points?: number | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          pair_id: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          pair_id: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          pair_id?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_redemptions: {
        Row: {
          id: string;
          learner_id: string;
          pair_id: string;
          redeemed_at: string;
          required_points: number;
          reward_id: string | null;
          reward_title: string;
        };
        Insert: {
          id?: string;
          learner_id: string;
          pair_id: string;
          redeemed_at?: string;
          required_points: number;
          reward_id?: string | null;
          reward_title: string;
        };
        Update: {
          id?: string;
          learner_id?: string;
          pair_id?: string;
          redeemed_at?: string;
          required_points?: number;
          reward_id?: string | null;
          reward_title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reward_redemptions_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "rewards";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          pair_id: string;
          remaining_quantity: number | null;
          required_points: number;
          sort_order: number;
          title: string;
          total_quantity: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          pair_id: string;
          remaining_quantity?: number | null;
          required_points: number;
          sort_order?: number;
          title: string;
          total_quantity?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          pair_id?: string;
          remaining_quantity?: number | null;
          required_points?: number;
          sort_order?: number;
          title?: string;
          total_quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "rewards_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          category_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_completed: boolean | null;
          is_daily: boolean;
          pair_id: string;
          points_awarded_at: string | null;
          reward_points: number | null;
          scheduled_at: string | null;
          title: string;
        };
        Insert: {
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_daily?: boolean;
          pair_id: string;
          points_awarded_at?: string | null;
          reward_points?: number | null;
          scheduled_at?: string | null;
          title: string;
        };
        Update: {
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_daily?: boolean;
          pair_id?: string;
          points_awarded_at?: string | null;
          reward_points?: number | null;
          scheduled_at?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      timer_sessions: {
        Row: {
          accumulated_ms: number;
          awarded_count: number;
          learner_id: string;
          pair_id: string;
          started_at: string | null;
          updated_at: string;
        };
        Insert: {
          accumulated_ms?: number;
          awarded_count?: number;
          learner_id: string;
          pair_id: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Update: {
          accumulated_ms?: number;
          awarded_count?: number;
          learner_id?: string;
          pair_id?: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timer_sessions_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timer_sessions_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
      timer_settings: {
        Row: {
          continue_in_background: boolean;
          interval_minutes: number;
          pair_id: string;
          points_timing: string;
          updated_at: string;
        };
        Insert: {
          continue_in_background?: boolean;
          interval_minutes?: number;
          pair_id: string;
          points_timing?: string;
          updated_at?: string;
        };
        Update: {
          continue_in_background?: boolean;
          interval_minutes?: number;
          pair_id?: string;
          points_timing?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timer_settings_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: true;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _timer_compute_state: {
        Args: {
          p_accumulated_ms: number;
          p_interval_minutes: number;
          p_started_at: string;
        };
        Returns: {
          elapsed_ms: number;
          strawberry_count: number;
        }[];
      };
      _timer_learner_pair_id: { Args: never; Returns: string };
      claim_push_subscription: {
        Args: {
          p_auth_key: string;
          p_endpoint: string;
          p_p256dh: string;
          p_pair_id: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      claim_task_points: { Args: { task_id: string }; Returns: undefined };
      complete_task: { Args: { task_id: string }; Returns: undefined };
      complete_timer_session: {
        Args: { p_award_count?: number };
        Returns: {
          awarded_count: number;
          awarded_delta: number;
          discarded_count: number;
          elapsed_ms: number;
          points: number;
          strawberry_count: number;
          total_points: number;
        }[];
      };
      get_current_streak: { Args: { p_pair_id: string }; Returns: number };
      get_invitation_by_token: {
        Args: { p_token: string };
        Returns: {
          expires_at: string;
          invitee_email: string;
          status: string;
          supporter_id: string;
          supporter_name: string;
        }[];
      };
      get_timer_session_state: {
        Args: never;
        Returns: Database["public"]["CompositeTypes"]["timer_session_state"][];
        SetofOptions: {
          from: "*";
          to: "timer_session_state";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      redeem_reward: { Args: { reward_id: string }; Returns: undefined };
      reset_daily_tasks: { Args: never; Returns: undefined };
      start_timer_session: {
        Args: never;
        Returns: Database["public"]["CompositeTypes"]["timer_session_state"][];
        SetofOptions: {
          from: "*";
          to: "timer_session_state";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      stop_timer_session: {
        Args: never;
        Returns: Database["public"]["CompositeTypes"]["timer_session_state"][];
        SetofOptions: {
          from: "*";
          to: "timer_session_state";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      sync_timer_points: {
        Args: never;
        Returns: {
          awarded_count: number;
          awarded_delta: number;
          elapsed_ms: number;
          points: number;
          strawberry_count: number;
          total_points: number;
        }[];
      };
      uncomplete_task: { Args: { task_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      timer_session_state: {
        is_running: boolean | null;
        started_at: string | null;
        accumulated_ms: number | null;
        awarded_count: number | null;
        interval_minutes: number | null;
        elapsed_ms: number | null;
        strawberry_count: number | null;
        server_now: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
