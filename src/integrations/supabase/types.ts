export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      equipment: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      lore: {
        Row: {
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mission_reports: {
        Row: {
          approved_by: string | null
          classification: Database["public"]["Enums"]["report_classification"]
          created_at: string
          id: string
          mission_id: string | null
          money_awarded: number
          raw_text: string | null
          reputation_awarded: number
          stalker_id: string
          summary: string
          tags: string[] | null
        }
        Insert: {
          approved_by?: string | null
          classification?: Database["public"]["Enums"]["report_classification"]
          created_at?: string
          id?: string
          mission_id?: string | null
          money_awarded?: number
          raw_text?: string | null
          reputation_awarded?: number
          stalker_id: string
          summary: string
          tags?: string[] | null
        }
        Update: {
          approved_by?: string | null
          classification?: Database["public"]["Enums"]["report_classification"]
          created_at?: string
          id?: string
          mission_id?: string | null
          money_awarded?: number
          raw_text?: string | null
          reputation_awarded?: number
          stalker_id?: string
          summary?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_reports_stalker_id_fkey"
            columns: ["stalker_id"]
            isOneToOne: false
            referencedRelation: "stalkers"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          assigned_stalker_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["mission_difficulty"]
          id: string
          name: string
          reward_money: number
          reward_reputation: number
          status: Database["public"]["Enums"]["mission_status"]
          updated_at: string
        }
        Insert: {
          assigned_stalker_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mission_difficulty"]
          id?: string
          name: string
          reward_money?: number
          reward_reputation?: number
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
        }
        Update: {
          assigned_stalker_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mission_difficulty"]
          id?: string
          name?: string
          reward_money?: number
          reward_reputation?: number
          status?: Database["public"]["Enums"]["mission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_assigned_stalker_id_fkey"
            columns: ["assigned_stalker_id"]
            isOneToOne: false
            referencedRelation: "stalkers"
            referencedColumns: ["id"]
          },
        ]
      }
      mutant_prices: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_reports: {
        Row: {
          ai_analysis: Json | null
          attachments: Json
          created_at: string
          discord_channel_id: string | null
          discord_user_id: string | null
          discord_username: string | null
          id: string
          mission_id: string | null
          raw_text: string
          source: string
          stalker_id: string | null
          stalker_steam_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          attachments?: Json
          created_at?: string
          discord_channel_id?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          id?: string
          mission_id?: string | null
          raw_text: string
          source?: string
          stalker_id?: string | null
          stalker_steam_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          attachments?: Json
          created_at?: string
          discord_channel_id?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          id?: string
          mission_id?: string | null
          raw_text?: string
          source?: string
          stalker_id?: string | null
          stalker_steam_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_reports_stalker_id_fkey"
            columns: ["stalker_id"]
            isOneToOne: false
            referencedRelation: "stalkers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      stalkers: {
        Row: {
          badge_tier: number
          created_at: string
          discord_user_id: string | null
          id: string
          missions_completed: number
          name: string
          notes: string | null
          photo_url: string | null
          reputation: number
          steam_id: string
          updated_at: string
        }
        Insert: {
          badge_tier?: number
          created_at?: string
          discord_user_id?: string | null
          id?: string
          missions_completed?: number
          name: string
          notes?: string | null
          photo_url?: string | null
          reputation?: number
          steam_id: string
          updated_at?: string
        }
        Update: {
          badge_tier?: number
          created_at?: string
          discord_user_id?: string | null
          id?: string
          missions_completed?: number
          name?: string
          notes?: string | null
          photo_url?: string | null
          reputation?: number
          steam_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_min_role: {
        Args: {
          _min: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "high" | "medio" | "iniciado"
      mission_difficulty: "low" | "medium" | "high" | "extreme"
      mission_status: "active" | "completed" | "archived"
      profile_status: "pending" | "approved" | "rejected"
      report_classification: "success" | "partial" | "failure"
      report_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "high", "medio", "iniciado"],
      mission_difficulty: ["low", "medium", "high", "extreme"],
      mission_status: ["active", "completed", "archived"],
      profile_status: ["pending", "approved", "rejected"],
      report_classification: ["success", "partial", "failure"],
      report_status: ["pending", "approved", "rejected"],
    },
  },
} as const
