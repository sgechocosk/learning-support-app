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
      point_events: {
        Row: {
          id: string;
          pair_id: string;
          learner_id: string;
          source: string;
          task_id: string | null;
          amount: number;
          created_at: string;
          jst_date: string;
        };
        Insert: {
          id?: string;
          pair_id: string;
          learner_id: string;
          source: string;
          task_id?: string | null;
          amount: number;
          created_at?: string;
          jst_date?: string;
        };
        Update: {
          id?: string;
          pair_id?: string;
          learner_id?: string;
          source?: string;
          task_id?: string | null;
          amount?: number;
          created_at?: string;
          jst_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_events_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_events_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      timer_sessions: {
        Row: {
          learner_id: string;
          pair_id: string;
          started_at: string | null;
          accumulated_ms: number;
          awarded_count: number;
          updated_at: string;
        };
        Insert: {
          learner_id: string;
          pair_id: string;
          started_at?: string | null;
          accumulated_ms?: number;
          awarded_count?: number;
          updated_at?: string;
        };
        Update: {
          learner_id?: string;
          pair_id?: string;
          started_at?: string | null;
          accumulated_ms?: number;
          awarded_count?: number;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // 学習者本人のサーバー権威タイマー状態（実行中かどうか・経過時間・
      // 付与済みいちご数）を取得する。付与処理は行わない読み取り専用API。
      get_timer_session_state: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_running: boolean;
          started_at: string | null;
          accumulated_ms: number;
          awarded_count: number;
          interval_minutes: number;
          elapsed_ms: number;
          strawberry_count: number;
          server_now: string;
        }[];
      };
      // タイマー開始。既に(他タブ/他デバイスで)実行中のセッションがあれば、
      // 新規セッションは作らずその既存セッションにそのまま乗る。
      start_timer_session: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_running: boolean;
          started_at: string | null;
          accumulated_ms: number;
          awarded_count: number;
          interval_minutes: number;
          elapsed_ms: number;
          strawberry_count: number;
          server_now: string;
        }[];
      };
      // タイマー停止（経過時間を確定させる）。
      stop_timer_session: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_running: boolean;
          started_at: string | null;
          accumulated_ms: number;
          awarded_count: number;
          interval_minutes: number;
          elapsed_ms: number;
          strawberry_count: number;
          server_now: string;
        }[];
      };
      // 未付与分のいちごをサーバー計算で確定付与する。
      // クライアントは付与量を渡さない（渡せない）ため、複数タブ/デバイスから
      // 同時に呼ばれても二重付与されない（行ロックにより直列化される）。
      sync_timer_points: {
        Args: Record<PropertyKey, never>;
        Returns: {
          awarded_delta: number;
          awarded_count: number;
          strawberry_count: number;
          elapsed_ms: number;
          points: number;
          total_points: number;
        }[];
      };
      // 未付与分を確定付与した上で、セッションをアトミックに0へリセットする。
      complete_timer_session: {
        Args: Record<PropertyKey, never>;
        Returns: {
          awarded_delta: number;
          awarded_count: number;
          strawberry_count: number;
          elapsed_ms: number;
          points: number;
          total_points: number;
        }[];
      };
      get_current_streak: { Args: { p_pair_id: string }; Returns: number };
      claim_task_points: { Args: { task_id: string }; Returns: undefined };
      complete_task: { Args: { task_id: string }; Returns: undefined };
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
      redeem_reward: { Args: { reward_id: string }; Returns: undefined };
      uncomplete_task: { Args: { task_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
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
