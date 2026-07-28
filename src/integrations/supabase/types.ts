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
      activities: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          code: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          name: string
          owner: string | null
          planned_end: string | null
          planned_start: string | null
          progress_pct: number
          sort_order: number
          status: Database["public"]["Enums"]["work_status"]
          updated_at: string
          wbs_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          code: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name: string
          owner?: string | null
          planned_end?: string | null
          planned_start?: string | null
          progress_pct?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          wbs_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          code?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name?: string
          owner?: string | null
          planned_end?: string | null
          planned_start?: string | null
          progress_pct?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          wbs_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_rollup"
            referencedColumns: ["wbs_id"]
          },
        ]
      }
      milestones: {
        Row: {
          activity_id: string
          actual_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_critical: boolean
          name: string
          owner: string | null
          sort_order: number
          status: Database["public"]["Enums"]["work_status"]
          updated_at: string
        }
        Insert: {
          activity_id: string
          actual_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_critical?: boolean
          name: string
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
        }
        Update: {
          activity_id?: string
          actual_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_critical?: boolean
          name?: string
          owner?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_rollup"
            referencedColumns: ["activity_id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          client: string | null
          code: string
          created_at: string
          currency: string
          description: string | null
          id: string
          manager: string | null
          name: string
          planned_end: string | null
          planned_start: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["work_status"]
          updated_at: string
        }
        Insert: {
          budget?: number
          client?: string | null
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          manager?: string | null
          name: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          client?: string | null
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          manager?: string | null
          name?: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
        }
        Relationships: []
      }
      wbs_items: {
        Row: {
          budget: number
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["work_status"]
          updated_at: string
          weight: number
        }
        Insert: {
          budget?: number
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          weight?: number
        }
        Update: {
          budget?: number
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["work_status"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "wbs_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wbs_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_rollup: {
        Row: {
          activity_id: string | null
          milestone_count: number | null
          rollup_end: string | null
          rollup_start: string | null
          wbs_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "wbs_rollup"
            referencedColumns: ["wbs_id"]
          },
        ]
      }
      project_rollup: {
        Row: {
          project_id: string | null
          rollup_end: string | null
          rollup_start: string | null
          wbs_count: number | null
        }
        Relationships: []
      }
      wbs_rollup: {
        Row: {
          activity_count: number | null
          project_id: string | null
          rollup_end: string | null
          rollup_start: string | null
          wbs_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wbs_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wbs_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      priority_level: "low" | "medium" | "high" | "critical"
      work_status:
        | "not_started"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
      priority_level: ["low", "medium", "high", "critical"],
      work_status: [
        "not_started",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
