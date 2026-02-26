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
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "awards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          amount: number
          budget_id: string
          category: Database["public"]["Enums"]["budget_category"] | null
          created_at: string | null
          description: string
          id: string
          justification: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          category?: Database["public"]["Enums"]["budget_category"] | null
          created_at?: string | null
          description: string
          id?: string
          justification?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          category?: Database["public"]["Enums"]["budget_category"] | null
          created_at?: string | null
          description?: string
          id?: string
          justification?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          grant_id: string | null
          id: string
          is_template: boolean | null
          metadata: Json | null
          name: string
          narrative: string | null
          org_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grant_id?: string | null
          id?: string
          is_template?: boolean | null
          metadata?: Json | null
          name: string
          narrative?: string | null
          org_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grant_id?: string | null
          id?: string
          is_template?: boolean | null
          metadata?: Json | null
          name?: string
          narrative?: string | null
          org_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      grants: {
        Row: {
          amount: string | null
          categories: Json | null
          concerns: string[] | null
          created_at: string | null
          deadline: string | null
          description: string | null
          eligibility: Json | null
          funder_name: string | null
          id: string
          metadata: Json | null
          org_id: string
          organization: string | null
          recommendations: Json | null
          screening_notes: string | null
          screening_score: number | null
          source: string | null
          source_id: string | null
          source_url: string | null
          stage: Database["public"]["Enums"]["grant_stage"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: string | null
          categories?: Json | null
          concerns?: string[] | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          funder_name?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          organization?: string | null
          recommendations?: Json | null
          screening_notes?: string | null
          screening_score?: number | null
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          stage?: Database["public"]["Enums"]["grant_stage"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: string | null
          categories?: Json | null
          concerns?: string[] | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: Json | null
          funder_name?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          organization?: string | null
          recommendations?: Json | null
          screening_notes?: string | null
          screening_score?: number | null
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          stage?: Database["public"]["Enums"]["grant_stage"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grants_org_id_fkey"
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
      organizations: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          ein: string | null
          email: string | null
          founding_year: number | null
          id: string
          mission: string | null
          name: string
          phone: string | null
          sector: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          ein?: string | null
          email?: string | null
          founding_year?: number | null
          id?: string
          mission?: string | null
          name: string
          phone?: string | null
          sector?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          ein?: string | null
          email?: string | null
          founding_year?: number | null
          id?: string
          mission?: string | null
          name?: string
          phone?: string | null
          sector?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
          preferences: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          id: string
          proposal_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          proposal_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          proposal_id?: string
          sort_order?: number | null
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
          created_at: string | null
          grant_id: string
          id: string
          metadata: Json | null
          org_id: string
          quality_review: Json | null
          quality_score: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grant_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          quality_review?: Json | null
          quality_score?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grant_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
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
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      budget_category:
        | "personnel"
        | "fringe"
        | "travel"
        | "equipment"
        | "supplies"
        | "contractual"
        | "other"
        | "indirect"
      grant_stage:
        | "discovery"
        | "screening"
        | "drafting"
        | "submission"
        | "awarded"
        | "reporting"
        | "closed"
      narrative_category:
        | "mission"
        | "impact"
        | "methods"
        | "evaluation"
        | "sustainability"
        | "capacity"
        | "budget_narrative"
        | "other"
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
