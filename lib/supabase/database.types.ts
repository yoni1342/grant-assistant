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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          grant_id: string | null
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          grant_id?: string | null
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          grant_id?: string | null
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          setup_complete: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          setup_complete?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          setup_complete?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      awards: {
        Row: {
          amount: number
          award_date: string | null
          created_at: string | null
          end_date: string | null
          grant_id: string
          id: string
          metadata: Json | null
          org_id: string
          requirements: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          award_date?: string | null
          created_at?: string | null
          end_date?: string | null
          grant_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          requirements?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          award_date?: string | null
          created_at?: string | null
          end_date?: string | null
          grant_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          requirements?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      central_grants: {
        Row: {
          amount: string | null
          categories: Json | null
          created_at: string
          deadline: string | null
          description: string | null
          eligibility: Json | null
          first_seen_at: string
          funder_name: string | null
          id: string
          last_seen_at: string
          metadata: Json | null
          organization: string | null
          source: string
          source_id: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: string | null
          categories?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          first_seen_at?: string
          funder_name?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          organization?: string | null
          source: string
          source_id?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: string | null
          categories?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          first_seen_at?: string
          funder_name?: string | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          organization?: string | null
          source?: string
          source_id?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_category: string | null
          category: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          extracted_text: string | null
          extraction_status: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          grant_id: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string | null
          org_id: string
          source_file_id: string | null
          source_url: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          ai_category?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          extracted_text?: string | null
          extraction_status?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string | null
          org_id: string
          source_file_id?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          ai_category?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          extracted_text?: string | null
          extraction_status?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string | null
          org_id?: string
          source_file_id?: string | null
          source_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      funders: {
        Row: {
          created_at: string | null
          ein: string | null
          giving_patterns: Json | null
          id: string
          metadata: Json | null
          name: string
          org_id: string
          priorities: Json | null
          propublica_data: Json | null
          strategy_brief: string | null
          submission_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ein?: string | null
          giving_patterns?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          org_id: string
          priorities?: Json | null
          propublica_data?: Json | null
          strategy_brief?: string | null
          submission_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ein?: string | null
          giving_patterns?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string
          priorities?: Json | null
          propublica_data?: Json | null
          strategy_brief?: string | null
          submission_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_email_log: {
        Row: {
          created_at: string | null
          grant_id: string
          id: string
          notification_id: string
          org_id: string
          sent_to: string
        }
        Insert: {
          created_at?: string | null
          grant_id: string
          id?: string
          notification_id: string
          org_id: string
          sent_to: string
        }
        Update: {
          created_at?: string | null
          grant_id?: string
          id?: string
          notification_id?: string
          org_id?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_email_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_fetch_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          org_id: string
          stage_message: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          org_id: string
          stage_message?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          org_id?: string
          stage_message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_fetch_status_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_source_stats: {
        Row: {
          created_at: string
          fetch_date: string
          id: string
          org_id: string
          raw_count: number
          source: string
        }
        Insert: {
          created_at?: string
          fetch_date?: string
          id?: string
          org_id: string
          raw_count?: number
          source: string
        }
        Update: {
          created_at?: string
          fetch_date?: string
          id?: string
          org_id?: string
          raw_count?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_source_stats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_usage_log: {
        Row: {
          created_at: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_usage_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          central_grant_id: string | null
          concerns: string[] | null
          created_at: string | null
          id: string
          manual_grant_id: string | null
          metadata: Json | null
          org_id: string
          recommendations: Json | null
          screening_notes: string | null
          screening_result: Json | null
          screening_score: number | null
          stage: Database["public"]["Enums"]["grant_stage"] | null
          updated_at: string | null
        }
        Insert: {
          central_grant_id?: string | null
          concerns?: string[] | null
          created_at?: string | null
          id?: string
          manual_grant_id?: string | null
          metadata?: Json | null
          org_id: string
          recommendations?: Json | null
          screening_notes?: string | null
          screening_result?: Json | null
          screening_score?: number | null
          stage?: Database["public"]["Enums"]["grant_stage"] | null
          updated_at?: string | null
        }
        Update: {
          central_grant_id?: string | null
          concerns?: string[] | null
          created_at?: string | null
          id?: string
          manual_grant_id?: string | null
          metadata?: Json | null
          org_id?: string
          recommendations?: Json | null
          screening_notes?: string | null
          screening_result?: Json | null
          screening_score?: number | null
          stage?: Database["public"]["Enums"]["grant_stage"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grants_central_grant_id_fkey"
            columns: ["central_grant_id"]
            isOneToOne: false
            referencedRelation: "central_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_manual_grant_id_fkey"
            columns: ["manual_grant_id"]
            isOneToOne: false
            referencedRelation: "manual_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_grants: {
        Row: {
          amount: string | null
          categories: Json | null
          created_at: string
          deadline: string | null
          description: string | null
          eligibility: Json | null
          funder_name: string | null
          id: string
          metadata: Json | null
          org_id: string
          organization: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: string | null
          categories?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          funder_name?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          organization?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: string | null
          categories?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          funder_name?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          organization?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflow_errors: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_id: string | null
          execution_mode: string | null
          execution_url: string | null
          failed_node: string | null
          id: string
          workflow_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_id?: string | null
          execution_mode?: string | null
          execution_url?: string | null
          failed_node?: string | null
          id?: string
          workflow_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_id?: string | null
          execution_mode?: string | null
          execution_url?: string | null
          failed_node?: string | null
          id?: string
          workflow_name?: string | null
        }
        Relationships: []
      }
      narrative_versions: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          document_id: string
          id: string
          org_id: string
          tags: Json | null
          title: string
          version_number: number
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          org_id: string
          tags?: Json | null
          title: string
          version_number?: number
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          org_id?: string
          tags?: Json | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "narrative_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narrative_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      narratives: {
        Row: {
          category: Database["public"]["Enums"]["narrative_category"] | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          org_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["narrative_category"] | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["narrative_category"] | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narratives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          grant_id: string | null
          id: string
          is_read: boolean
          message: string | null
          org_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          grant_id?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          org_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          grant_id?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          org_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_knowledge_base: {
        Row: {
          category: string | null
          content: string
          content_type: string
          created_at: string | null
          embedding: string | null
          grant_id: string | null
          id: string
          metadata: Json | null
          org_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          content_type?: string
          created_at?: string | null
          embedding?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          content_type?: string
          created_at?: string | null
          embedding?: string | null
          grant_id?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_knowledge_base_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_base_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_base_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          agency_id: string | null
          annual_budget: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          description: string | null
          ein: string | null
          email: string | null
          executive_summary: string | null
          founding_year: number | null
          geographic_focus: string[] | null
          id: string
          is_tester: boolean
          metadata: Json | null
          mission: string | null
          name: string
          phone: string | null
          plan: string
          programs: Json | null
          rejection_reason: string | null
          sector: string | null
          staff_count: number | null
          status: Database["public"]["Enums"]["org_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          voice_profile: Json | null
          website: string | null
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          annual_budget?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          ein?: string | null
          email?: string | null
          executive_summary?: string | null
          founding_year?: number | null
          geographic_focus?: string[] | null
          id?: string
          is_tester?: boolean
          metadata?: Json | null
          mission?: string | null
          name: string
          phone?: string | null
          plan?: string
          programs?: Json | null
          rejection_reason?: string | null
          sector?: string | null
          staff_count?: number | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          voice_profile?: Json | null
          website?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          annual_budget?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          ein?: string | null
          email?: string | null
          executive_summary?: string | null
          founding_year?: number | null
          geographic_focus?: string[] | null
          id?: string
          is_tester?: boolean
          metadata?: Json | null
          mission?: string | null
          name?: string
          phone?: string | null
          plan?: string
          programs?: Json | null
          rejection_reason?: string | null
          sector?: string | null
          staff_count?: number | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          voice_profile?: Json | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_reminder_log: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          reminder_day: number
          sent_to: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          reminder_day: number
          sent_to: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          reminder_day?: number
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_reminder_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          org_id: string | null
          preferences: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_sections: {
        Row: {
          content: Json | null
          created_at: string | null
          header1: Json | null
          header2: Json | null
          id: string
          proposal_id: string
          sort_order: number | null
          tabulation: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          header1?: Json | null
          header2?: Json | null
          id?: string
          proposal_id: string
          sort_order?: number | null
          tabulation?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          header1?: Json | null
          header2?: Json | null
          id?: string
          proposal_id?: string
          sort_order?: number | null
          tabulation?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sections_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          grant_id: string
          id: string
          metadata: Json | null
          org_id: string
          outcome: string | null
          outcome_at: string | null
          outcome_notes: string | null
          quality_review: Json | null
          quality_score: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          grant_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          outcome?: string | null
          outcome_at?: string | null
          outcome_notes?: string | null
          quality_review?: Json | null
          quality_score?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          grant_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          outcome?: string | null
          outcome_at?: string | null
          outcome_notes?: string | null
          quality_review?: Json | null
          quality_score?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          award_id: string
          content: string | null
          created_at: string | null
          due_date: string | null
          grant_id: string
          id: string
          metadata: Json | null
          org_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          status: string | null
          submitted_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          award_id: string
          content?: string | null
          created_at?: string | null
          due_date?: string | null
          grant_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          award_id?: string
          content?: string | null
          created_at?: string | null
          due_date?: string | null
          grant_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          org_id: string
          query: string
          search_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          query: string
          search_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          query?: string
          search_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          created_at: string
          grant_data: Json
          id: string
          is_complete: boolean
          org_id: string
          search_id: string
          source_group: string | null
        }
        Insert: {
          created_at?: string
          grant_data?: Json
          id?: string
          is_complete?: boolean
          org_id: string
          search_id: string
          source_group?: string | null
        }
        Update: {
          created_at?: string
          grant_data?: Json
          id?: string
          is_complete?: boolean
          org_id?: string
          search_id?: string
          source_group?: string | null
        }
        Relationships: []
      }
      submission_checklists: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          grant_id: string
          id: string
          items: Json
          org_id: string
          updated_at: string | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          grant_id: string
          id?: string
          items?: Json
          org_id: string
          updated_at?: string | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          grant_id?: string
          id?: string
          items?: Json
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_checklists_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_checklists_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_checklists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          confirmation_number: string | null
          created_at: string | null
          grant_id: string
          id: string
          metadata: Json | null
          method: Database["public"]["Enums"]["submission_method"] | null
          notes: string | null
          org_id: string
          portal_url: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          confirmation_number?: string | null
          created_at?: string | null
          grant_id: string
          id?: string
          metadata?: Json | null
          method?: Database["public"]["Enums"]["submission_method"] | null
          notes?: string | null
          org_id: string
          portal_url?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmation_number?: string | null
          created_at?: string | null
          grant_id?: string
          id?: string
          metadata?: Json | null
          method?: Database["public"]["Enums"]["submission_method"] | null
          notes?: string | null
          org_id?: string
          portal_url?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          grant_id: string | null
          id: string
          org_id: string
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_status"] | null
          webhook_url: string | null
          workflow_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          grant_id?: string | null
          id?: string
          org_id: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"] | null
          webhook_url?: string | null
          workflow_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          grant_id?: string | null
          id?: string
          org_id?: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"] | null
          webhook_url?: string | null
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      grants_full: {
        Row: {
          amount: string | null
          categories: Json | null
          central_grant_id: string | null
          concerns: string[] | null
          created_at: string | null
          deadline: string | null
          description: string | null
          eligibility: Json | null
          funder_name: string | null
          id: string | null
          manual_grant_id: string | null
          metadata: Json | null
          org_id: string | null
          organization: string | null
          recommendations: Json | null
          screening_notes: string | null
          screening_result: Json | null
          screening_score: number | null
          source: string | null
          source_id: string | null
          source_type: string | null
          source_url: string | null
          stage: Database["public"]["Enums"]["grant_stage"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grants_central_grant_id_fkey"
            columns: ["central_grant_id"]
            isOneToOne: false
            referencedRelation: "central_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_manual_grant_id_fkey"
            columns: ["manual_grant_id"]
            isOneToOne: false
            referencedRelation: "manual_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_org_id: { Args: never; Returns: string }
      is_platform_admin: { Args: never; Returns: boolean }
      search_knowledge: {
        Args: {
          match_count?: number
          match_org_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_table: string
          title: string
        }[]
      }
    }
    Enums: {
      budget_item_type: "revenue" | "expense"
      grant_stage:
        | "discovery"
        | "screening"
        | "pending_approval"
        | "drafting"
        | "submission"
        | "awarded"
        | "reporting"
        | "closed"
        | "archived"
      narrative_category:
        | "mission"
        | "impact"
        | "methods"
        | "evaluation"
        | "sustainability"
        | "capacity"
        | "budget_narrative"
        | "other"
      org_status: "pending" | "approved" | "rejected" | "suspended"
      report_type: "interim" | "final"
      submission_method: "auto" | "manual"
      workflow_status: "pending" | "running" | "completed" | "failed"
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
      budget_item_type: ["revenue", "expense"],
      grant_stage: [
        "discovery",
        "screening",
        "pending_approval",
        "drafting",
        "submission",
        "awarded",
        "reporting",
        "closed",
        "archived",
      ],
      narrative_category: [
        "mission",
        "impact",
        "methods",
        "evaluation",
        "sustainability",
        "capacity",
        "budget_narrative",
        "other",
      ],
      org_status: ["pending", "approved", "rejected", "suspended"],
      report_type: ["interim", "final"],
      submission_method: ["auto", "manual"],
      workflow_status: ["pending", "running", "completed", "failed"],
    },
  },
} as const
