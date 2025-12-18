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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_clients: {
        Row: {
          client_url: string | null
          created_at: string | null
          credits_balance: number | null
          credits_used_this_month: number | null
          current_plan: Database["public"]["Enums"]["plan_type"] | null
          email: string
          heygen_api_key: string | null
          heygen_api_key_valid: boolean | null
          id: string
          last_credit_reload_at: string | null
          last_payment_at: string | null
          last_payment_status: string | null
          modality: Database["public"]["Enums"]["client_modality"] | null
          name: string
          password_hash: string
          plan_expiration_date: string | null
          plan_start_date: string | null
          setup_paid: boolean | null
          setup_paid_at: string | null
          setup_stripe_link: string | null
          updated_at: string | null
        }
        Insert: {
          client_url?: string | null
          created_at?: string | null
          credits_balance?: number | null
          credits_used_this_month?: number | null
          current_plan?: Database["public"]["Enums"]["plan_type"] | null
          email: string
          heygen_api_key?: string | null
          heygen_api_key_valid?: boolean | null
          id?: string
          last_credit_reload_at?: string | null
          last_payment_at?: string | null
          last_payment_status?: string | null
          modality?: Database["public"]["Enums"]["client_modality"] | null
          name: string
          password_hash: string
          plan_expiration_date?: string | null
          plan_start_date?: string | null
          setup_paid?: boolean | null
          setup_paid_at?: string | null
          setup_stripe_link?: string | null
          updated_at?: string | null
        }
        Update: {
          client_url?: string | null
          created_at?: string | null
          credits_balance?: number | null
          credits_used_this_month?: number | null
          current_plan?: Database["public"]["Enums"]["plan_type"] | null
          email?: string
          heygen_api_key?: string | null
          heygen_api_key_valid?: boolean | null
          id?: string
          last_credit_reload_at?: string | null
          last_payment_at?: string | null
          last_payment_status?: string | null
          modality?: Database["public"]["Enums"]["client_modality"] | null
          name?: string
          password_hash?: string
          plan_expiration_date?: string | null
          plan_start_date?: string | null
          setup_paid?: boolean | null
          setup_paid_at?: string | null
          setup_stripe_link?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      avatar_ads: {
        Row: {
          avatar_id: string
          created_at: string
          display_order: number
          duration: number
          id: string
          media_url: string
          name: string | null
        }
        Insert: {
          avatar_id: string
          created_at?: string
          display_order?: number
          duration?: number
          id?: string
          media_url: string
          name?: string | null
        }
        Update: {
          avatar_id?: string
          created_at?: string
          display_order?: number
          duration?: number
          id?: string
          media_url?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_ads_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_buttons: {
        Row: {
          action_type: string
          avatar_id: string
          border_style: string
          color: string
          created_at: string
          display_order: number
          enabled: boolean
          external_url: string | null
          font_family: string
          font_size: number
          id: string
          label: string
          position_x: number
          position_y: number
          size: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          action_type: string
          avatar_id: string
          border_style?: string
          color?: string
          created_at?: string
          display_order?: number
          enabled?: boolean
          external_url?: string | null
          font_family?: string
          font_size?: number
          id?: string
          label: string
          position_x?: number
          position_y?: number
          size?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          action_type?: string
          avatar_id?: string
          border_style?: string
          color?: string
          created_at?: string
          display_order?: number
          enabled?: boolean
          external_url?: string | null
          font_family?: string
          font_size?: number
          id?: string
          label?: string
          position_x?: number
          position_y?: number
          size?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_buttons_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_credentials: {
        Row: {
          account_id: string
          api_key: string
          avatar_external_id: string
          avatar_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          api_key: string
          avatar_external_id: string
          avatar_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          api_key?: string
          avatar_external_id?: string
          avatar_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatar_credentials_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: true
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_sessions: {
        Row: {
          avatar_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          ip_address: string | null
          messages_count: number | null
          metadata: Json | null
          platform: string | null
          session_id: string
          started_at: string
          summary: string | null
          topics: string[] | null
          user_agent: string | null
        }
        Insert: {
          avatar_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          messages_count?: number | null
          metadata?: Json | null
          platform?: string | null
          session_id: string
          started_at?: string
          summary?: string | null
          topics?: string[] | null
          user_agent?: string | null
        }
        Update: {
          avatar_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          messages_count?: number | null
          metadata?: Json | null
          platform?: string | null
          session_id?: string
          started_at?: string
          summary?: string | null
          topics?: string[] | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_sessions_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          ai_model: string
          avatar_orientation: string | null
          backstory: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          idle_media_url: string | null
          language: string
          name: string
          slug: string | null
          updated_at: string
          user_id: string
          voice_model: string
        }
        Insert: {
          ai_model?: string
          avatar_orientation?: string | null
          backstory?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          idle_media_url?: string | null
          language?: string
          name: string
          slug?: string | null
          updated_at?: string
          user_id: string
          voice_model?: string
        }
        Update: {
          ai_model?: string
          avatar_orientation?: string | null
          backstory?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          idle_media_url?: string | null
          language?: string
          name?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
          voice_model?: string
        }
        Relationships: []
      }
      client_avatars: {
        Row: {
          avatar_url: string | null
          client_id: string
          created_at: string | null
          credits_used: number | null
          heygen_avatar_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id: string
          created_at?: string | null
          credits_used?: number | null
          heygen_avatar_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          created_at?: string | null
          credits_used?: number | null
          heygen_avatar_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_avatars_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_consumption_log: {
        Row: {
          avatar_id: string | null
          client_id: string
          created_at: string | null
          credits_used: number
          description: string | null
          heygen_credits_used: number | null
          id: string
          session_duration_seconds: number | null
        }
        Insert: {
          avatar_id?: string | null
          client_id: string
          created_at?: string | null
          credits_used: number
          description?: string | null
          heygen_credits_used?: number | null
          id?: string
          session_duration_seconds?: number | null
        }
        Update: {
          avatar_id?: string | null
          client_id?: string
          created_at?: string | null
          credits_used?: number
          description?: string | null
          heygen_credits_used?: number | null
          id?: string
          session_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_consumption_log_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "client_avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_consumption_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_event_additions: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string | null
          credits: number | null
          hours: number | null
          id: string
          paid_at: string | null
          status: string | null
          stripe_link: string | null
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string | null
          credits?: number | null
          hours?: number | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_link?: string | null
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string | null
          credits?: number | null
          hours?: number | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_event_additions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string | null
          credits_to_add: number | null
          description: string | null
          id: string
          paid_at: string | null
          payment_type: string
          status: string | null
          stripe_link: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string | null
          credits_to_add?: number | null
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_type: string
          status?: string | null
          stripe_link?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string | null
          credits_to_add?: number | null
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_type?: string
          status?: string | null
          stripe_link?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_url_history: {
        Row: {
          changed_by: string | null
          client_id: string
          created_at: string | null
          id: string
          new_url: string | null
          old_url: string | null
        }
        Insert: {
          changed_by?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          new_url?: string | null
          old_url?: string | null
        }
        Update: {
          changed_by?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          new_url?: string | null
          old_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_url_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contexts: {
        Row: {
          avatar_id: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          keywords_text: string | null
          media_type: string
          media_url: string
          name: string
          placement: string
          size: string
          updated_at: string
        }
        Insert: {
          avatar_id: string
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          keywords_text?: string | null
          media_type?: string
          media_url: string
          name: string
          placement?: string
          size?: string
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          keywords_text?: string | null
          media_type?: string
          media_url?: string
          name?: string
          placement?: string
          size?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contexts_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_id: string
          created_at: string
          credits_used: number
          duration: number
          id: string
          platform: string
          topics: string[] | null
          user_id: string
        }
        Insert: {
          avatar_id: string
          created_at?: string
          credits_used?: number
          duration?: number
          id?: string
          platform: string
          topics?: string[] | null
          user_id: string
        }
        Update: {
          avatar_id?: string
          created_at?: string
          credits_used?: number
          duration?: number
          id?: string
          platform?: string
          topics?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_audit_logs: {
        Row: {
          action: string
          avatar_id: string
          details: Json | null
          id: string
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          avatar_id: string
          details?: Json | null
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          avatar_id?: string
          details?: Json | null
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_audit_logs_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      media_triggers: {
        Row: {
          avatar_id: string
          created_at: string
          description: string | null
          id: string
          keywords_text: string | null
          media_url: string
          trigger_phrase: string
        }
        Insert: {
          avatar_id: string
          created_at?: string
          description?: string | null
          id?: string
          keywords_text?: string | null
          media_url: string
          trigger_phrase: string
        }
        Update: {
          avatar_id?: string
          created_at?: string
          description?: string | null
          id?: string
          keywords_text?: string | null
          media_url?: string
          trigger_phrase?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_triggers_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_docs: {
        Row: {
          avatar_id: string | null
          created_at: string | null
          enabled: boolean | null
          excerpt: string | null
          id: string
          keywords: string | null
          media_type: string | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          avatar_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          excerpt?: string | null
          id?: string
          keywords?: string | null
          media_type?: string | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          avatar_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          excerpt?: string | null
          id?: string
          keywords?: string | null
          media_type?: string | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_docs_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      training_documents: {
        Row: {
          avatar_id: string
          created_at: string
          document_name: string
          document_url: string
          id: string
        }
        Insert: {
          avatar_id: string
          created_at?: string
          document_name: string
          document_url: string
          id?: string
        }
        Update: {
          avatar_id?: string
          created_at?: string
          document_name?: string
          document_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_documents_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          id: string
          total_credits: number
          updated_at: string
          used_credits: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id?: string
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
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_organization_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_manage_organization: {
        Args: { _org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      client_modality: "evento" | "plano_trimestral"
      client_status:
        | "ativo"
        | "pendente_setup"
        | "pendente_pagamento"
        | "pendente_integracao"
        | "sem_creditos"
        | "pendente_avatar"
        | "expirado"
        | "suspenso"
      plan_type: "plano_4h" | "plano_7h" | "plano_20h"
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
      app_role: ["admin", "user"],
      client_modality: ["evento", "plano_trimestral"],
      client_status: [
        "ativo",
        "pendente_setup",
        "pendente_pagamento",
        "pendente_integracao",
        "sem_creditos",
        "pendente_avatar",
        "expirado",
        "suspenso",
      ],
      plan_type: ["plano_4h", "plano_7h", "plano_20h"],
    },
  },
} as const
