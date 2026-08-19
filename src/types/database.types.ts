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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      anthropometric_measurements: {
        Row: {
          arm_flexed_cm: number | null
          athlete_id: string
          calf_cm: number | null
          created_at: string
          created_by: string | null
          extra_measures: Json
          femur_breadth_cm: number | null
          height_cm: number | null
          humerus_breadth_cm: number | null
          id: string
          measured_at: string
          measured_by: string | null
          medial_calf_mm: number | null
          notes: string | null
          somatotype_ecto: number | null
          somatotype_endo: number | null
          somatotype_meso: number | null
          subscapular_mm: number | null
          supraspinale_mm: number | null
          tenant_id: string
          triceps_mm: number | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
          weight_kg: number | null
        }
        Insert: {
          arm_flexed_cm?: number | null
          athlete_id: string
          calf_cm?: number | null
          created_at?: string
          created_by?: string | null
          extra_measures?: Json
          femur_breadth_cm?: number | null
          height_cm?: number | null
          humerus_breadth_cm?: number | null
          id?: string
          measured_at?: string
          measured_by?: string | null
          medial_calf_mm?: number | null
          notes?: string | null
          somatotype_ecto?: number | null
          somatotype_endo?: number | null
          somatotype_meso?: number | null
          subscapular_mm?: number | null
          supraspinale_mm?: number | null
          tenant_id: string
          triceps_mm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          weight_kg?: number | null
        }
        Update: {
          arm_flexed_cm?: number | null
          athlete_id?: string
          calf_cm?: number | null
          created_at?: string
          created_by?: string | null
          extra_measures?: Json
          femur_breadth_cm?: number | null
          height_cm?: number | null
          humerus_breadth_cm?: number | null
          id?: string
          measured_at?: string
          measured_by?: string | null
          medial_calf_mm?: number | null
          notes?: string | null
          somatotype_ecto?: number | null
          somatotype_endo?: number | null
          somatotype_meso?: number | null
          subscapular_mm?: number | null
          supraspinale_mm?: number | null
          tenant_id?: string
          triceps_mm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anthropometric_measurements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometric_measurements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometric_measurements_measured_by_fkey"
            columns: ["measured_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometric_measurements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometric_measurements_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_consents: {
        Row: {
          athlete_id: string
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          method: string | null
          policy_version: string
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          method?: string | null
          policy_version: string
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          method?: string | null
          policy_version?: string
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_consents_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_injuries: {
        Row: {
          athlete_id: string
          body_region: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          occurred_on: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          body_region: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_on?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          body_region?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_on?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_injuries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_injuries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_injuries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          activity_level: string | null
          archived_at: string | null
          birth_date: string
          created_at: string
          created_by: string | null
          full_name: string
          goals: Json
          id: string
          notes: string | null
          sex: string
          tenant_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          archived_at?: string | null
          birth_date: string
          created_at?: string
          created_by?: string | null
          full_name: string
          goals?: Json
          id?: string
          notes?: string | null
          sex: string
          tenant_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          archived_at?: string | null
          birth_date?: string
          created_at?: string
          created_by?: string | null
          full_name?: string
          goals?: Json
          id?: string
          notes?: string | null
          sex?: string
          tenant_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      biomech_evaluations: {
        Row: {
          ankle_dorsiflexion: string | null
          athlete_id: string
          created_at: string
          created_by: string | null
          evaluated_at: string
          evaluated_by: string | null
          femur_class: string | null
          femur_length_cm: number | null
          hip_mobility: string | null
          humerus_length_cm: number | null
          id: string
          notes: string | null
          pattern_classifications: Json
          shoulder_mobility: string | null
          tenant_id: string
          torso_length_cm: number | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          ankle_dorsiflexion?: string | null
          athlete_id: string
          created_at?: string
          created_by?: string | null
          evaluated_at?: string
          evaluated_by?: string | null
          femur_class?: string | null
          femur_length_cm?: number | null
          hip_mobility?: string | null
          humerus_length_cm?: number | null
          id?: string
          notes?: string | null
          pattern_classifications?: Json
          shoulder_mobility?: string | null
          tenant_id: string
          torso_length_cm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          ankle_dorsiflexion?: string | null
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          evaluated_at?: string
          evaluated_by?: string | null
          femur_class?: string | null
          femur_length_cm?: number | null
          hip_mobility?: string | null
          humerus_length_cm?: number | null
          id?: string
          notes?: string | null
          pattern_classifications?: Json
          shoulder_mobility?: string | null
          tenant_id?: string
          torso_length_cm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomech_evaluations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomech_evaluations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomech_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomech_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biomech_evaluations_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          plan: string
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: string
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mi_rol: { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
      mi_tenant: { Args: never; Returns: string }
    }
    Enums: {
      tenant_type: "gym" | "solo"
      user_role: "super_admin" | "gym" | "trainer" | "client"
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
      tenant_type: ["gym", "solo"],
      user_role: ["super_admin", "gym", "trainer", "client"],
    },
  },
} as const
