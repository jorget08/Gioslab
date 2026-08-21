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
          abdominal_mm: number | null
          athlete_id: string
          bmi: number | null
          body_density: number | null
          body_fat_pct: number | null
          body_fat_pct_source: string
          calf_mm: number | null
          chest_mm: number | null
          created_at: string
          created_by: string | null
          extra_measures: Json
          fat_mass_kg: number | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          lean_mass_kg: number | null
          measured_at: string
          measured_by: string | null
          notes: string | null
          subscapular_mm: number | null
          sum_6_skinfolds_mm: number | null
          sum_7_skinfolds_mm: number | null
          suprailiac_mm: number | null
          tenant_id: string
          thigh_mm: number | null
          triceps_mm: number | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
          waist_cm: number | null
          waist_hip_ratio: number | null
          weight_kg: number | null
        }
        Insert: {
          abdominal_mm?: number | null
          athlete_id: string
          bmi?: number | null
          body_density?: number | null
          body_fat_pct?: number | null
          body_fat_pct_source?: string
          calf_mm?: number | null
          chest_mm?: number | null
          created_at?: string
          created_by?: string | null
          extra_measures?: Json
          fat_mass_kg?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          measured_by?: string | null
          notes?: string | null
          subscapular_mm?: number | null
          sum_6_skinfolds_mm?: number | null
          sum_7_skinfolds_mm?: number | null
          suprailiac_mm?: number | null
          tenant_id: string
          thigh_mm?: number | null
          triceps_mm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdominal_mm?: number | null
          athlete_id?: string
          bmi?: number | null
          body_density?: number | null
          body_fat_pct?: number | null
          body_fat_pct_source?: string
          calf_mm?: number | null
          chest_mm?: number | null
          created_at?: string
          created_by?: string | null
          extra_measures?: Json
          fat_mass_kg?: number | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          measured_by?: string | null
          notes?: string | null
          subscapular_mm?: number | null
          sum_6_skinfolds_mm?: number | null
          sum_7_skinfolds_mm?: number | null
          suprailiac_mm?: number | null
          tenant_id?: string
          thigh_mm?: number | null
          triceps_mm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
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
            foreignKeyName: "anthropometric_measurements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
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
            foreignKeyName: "athlete_consents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
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
            foreignKeyName: "athlete_injuries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
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
          experience_level: string | null
          full_name: string
          goals: Json
          id: string
          notes: string | null
          sex: string
          tenant_id: string
          trainer_id: string
          training_goal: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          archived_at?: string | null
          birth_date: string
          created_at?: string
          created_by?: string | null
          experience_level?: string | null
          full_name: string
          goals?: Json
          id?: string
          notes?: string | null
          sex: string
          tenant_id: string
          trainer_id: string
          training_goal?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          archived_at?: string | null
          birth_date?: string
          created_at?: string
          created_by?: string | null
          experience_level?: string | null
          full_name?: string
          goals?: Json
          id?: string
          notes?: string | null
          sex?: string
          tenant_id?: string
          trainer_id?: string
          training_goal?: string | null
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
          axial_load_tolerance: string | null
          back_dominance: string | null
          created_at: string
          created_by: string | null
          evaluated_at: string
          evaluated_by: string | null
          femur_class: string | null
          femur_length_cm: number | null
          femur_torso_ratio: string | null
          glute_vector: string | null
          hip_internal_rotation: string | null
          hip_mobility: string | null
          humerus_length_cm: number | null
          id: string
          notes: string | null
          pattern_classifications: Json
          shoulder_mobility: string | null
          shoulder_overhead: string | null
          squat_dominance: string | null
          tenant_id: string
          thoracic_extension: string | null
          torso_class: string | null
          torso_length_cm: number | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          ankle_dorsiflexion?: string | null
          athlete_id: string
          axial_load_tolerance?: string | null
          back_dominance?: string | null
          created_at?: string
          created_by?: string | null
          evaluated_at?: string
          evaluated_by?: string | null
          femur_class?: string | null
          femur_length_cm?: number | null
          femur_torso_ratio?: string | null
          glute_vector?: string | null
          hip_internal_rotation?: string | null
          hip_mobility?: string | null
          humerus_length_cm?: number | null
          id?: string
          notes?: string | null
          pattern_classifications?: Json
          shoulder_mobility?: string | null
          shoulder_overhead?: string | null
          squat_dominance?: string | null
          tenant_id: string
          thoracic_extension?: string | null
          torso_class?: string | null
          torso_length_cm?: number | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          ankle_dorsiflexion?: string | null
          athlete_id?: string
          axial_load_tolerance?: string | null
          back_dominance?: string | null
          created_at?: string
          created_by?: string | null
          evaluated_at?: string
          evaluated_by?: string | null
          femur_class?: string | null
          femur_length_cm?: number | null
          femur_torso_ratio?: string | null
          glute_vector?: string | null
          hip_internal_rotation?: string | null
          hip_mobility?: string | null
          humerus_length_cm?: number | null
          id?: string
          notes?: string | null
          pattern_classifications?: Json
          shoulder_mobility?: string | null
          shoulder_overhead?: string | null
          squat_dominance?: string | null
          tenant_id?: string
          thoracic_extension?: string | null
          torso_class?: string | null
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
            foreignKeyName: "biomech_evaluations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
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
      engine_runs: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          evaluation_id: string | null
          id: string
          measurement_id: string | null
          output: Json
          rules_fired: Json
          tenant_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          id?: string
          measurement_id?: string | null
          output?: Json
          rules_fired?: Json
          tenant_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          id?: string
          measurement_id?: string | null
          output?: Json
          rules_fired?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_runs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_runs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_runs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "biomech_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_runs_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "anthropometric_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          biomechanical_type: string | null
          contraindications: Json
          created_at: string
          created_by: string | null
          description: string | null
          equipment: string | null
          id: string
          is_active: boolean
          media_urls: Json
          movement_pattern: string | null
          name: string
          target_muscle: string | null
          updated_at: string
        }
        Insert: {
          biomechanical_type?: string | null
          contraindications?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          media_urls?: Json
          movement_pattern?: string | null
          name: string
          target_muscle?: string | null
          updated_at?: string
        }
        Update: {
          biomechanical_type?: string | null
          contraindications?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          media_urls?: Json
          movement_pattern?: string | null
          name?: string
          target_muscle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_variants: {
        Row: {
          created_at: string
          created_by: string | null
          exercise_id: string
          notes: string | null
          relation_type: string
          variant_exercise_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exercise_id: string
          notes?: string | null
          relation_type: string
          variant_exercise_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exercise_id?: string
          notes?: string | null
          relation_type?: string
          variant_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_variants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_variants_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_variants_variant_exercise_id_fkey"
            columns: ["variant_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menstrual_cycle_logs: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          cycle_length_days: number
          id: string
          last_period_start: string
          notes: string | null
          recorded_at: string
          tenant_id: string
          uses_hormonal_contraception: boolean
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          cycle_length_days?: number
          id?: string
          last_period_start: string
          notes?: string | null
          recorded_at?: string
          tenant_id: string
          uses_hormonal_contraception?: boolean
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          cycle_length_days?: number
          id?: string
          last_period_start?: string
          notes?: string | null
          recorded_at?: string
          tenant_id?: string
          uses_hormonal_contraception?: boolean
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menstrual_cycle_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycle_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycle_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycle_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycle_logs_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_activations: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          rule_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          rule_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_activations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_activations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          actions: Json
          condition: Json
          created_at: string
          created_by: string | null
          evidence_level: string
          id: string
          is_active: boolean
          justification: string
          rule_key: string
          version: number
        }
        Insert: {
          actions: Json
          condition: Json
          created_at?: string
          created_by?: string | null
          evidence_level: string
          id?: string
          is_active?: boolean
          justification: string
          rule_key: string
          version: number
        }
        Update: {
          actions?: Json
          condition?: Json
          created_at?: string
          created_by?: string | null
          evidence_level?: string
          id?: string
          is_active?: boolean
          justification?: string
          rule_key?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rules_created_by_fkey"
            columns: ["created_by"]
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
          active_tenant_id: string | null
          archived_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          updated_at: string
        }
        Insert: {
          active_tenant_id?: string | null
          archived_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Update: {
          active_tenant_id?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          duration_weeks: number | null
          engine_run_id: string | null
          generated_pdf_url: string | null
          id: string
          periodization_type: string | null
          plan_data: Json
          status: string
          tenant_id: string
          title: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          duration_weeks?: number | null
          engine_run_id?: string | null
          generated_pdf_url?: string | null
          id?: string
          periodization_type?: string | null
          plan_data?: Json
          status?: string
          tenant_id: string
          title?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          duration_weeks?: number | null
          engine_run_id?: string | null
          generated_pdf_url?: string | null
          id?: string
          periodization_type?: string | null
          plan_data?: Json
          status?: string
          tenant_id?: string
          title?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_engine_run_id_fkey"
            columns: ["engine_run_id"]
            isOneToOne: false
            referencedRelation: "engine_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      athletes_listado: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          experience_level: string | null
          full_name: string | null
          id: string | null
          sex: string | null
          tenant_id: string | null
          trainer_id: string | null
          training_goal: string | null
          ultima_evaluacion: string | null
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          sex?: string | null
          tenant_id?: string | null
          trainer_id?: string | null
          training_goal?: string | null
          ultima_evaluacion?: never
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          sex?: string | null
          tenant_id?: string | null
          trainer_id?: string | null
          training_goal?: string | null
          ultima_evaluacion?: never
        }
        Relationships: [
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
    }
    Functions: {
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
      cambiar_tenant: { Args: { nuevo_tenant: string }; Returns: undefined }
      crear_atleta: {
        Args: {
          p_consiente_ciclo?: boolean
          p_fecha_nacimiento: string
          p_lesiones?: Json
          p_nivel?: string
          p_nombre: string
          p_notas?: string
          p_objetivo?: string
          p_objetivos?: Json
          p_sexo: string
          p_version_politica?: string
        }
        Returns: string
      }
      crear_invitacion: {
        Args: {
          p_dias_validez?: number
          p_email: string
          p_rol: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      mi_rol: { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
      mi_tenant: { Args: never; Returns: string }
      ver_invitacion: {
        Args: { p_token: string }
        Returns: {
          correo: string
          nombre_tenant: string
          rol: Database["public"]["Enums"]["user_role"]
          valida: boolean
        }[]
      }
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
