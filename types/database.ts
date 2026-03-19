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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          declared_value_eur: number | null
          driver_notes: string | null
          dropoff_address: string | null
          dropoff_type: string
          id: string
          package_category: string
          package_photos: string[] | null
          package_weight_kg: number
          payment_status: string
          pickup_address: string | null
          pickup_type: string
          price_eur: number
          recipient_name: string | null
          recipient_phone: string | null
          route_id: string
          sender_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          declared_value_eur?: number | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_type: string
          id?: string
          package_category: string
          package_photos?: string[] | null
          package_weight_kg: number
          payment_status?: string
          pickup_address?: string | null
          pickup_type: string
          price_eur: number
          recipient_name?: string | null
          recipient_phone?: string | null
          route_id: string
          sender_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          declared_value_eur?: number | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_type?: string
          id?: string
          package_category?: string
          package_photos?: string[] | null
          package_weight_kg?: number
          payment_status?: string
          pickup_address?: string | null
          pickup_type?: string
          price_eur?: number
          recipient_name?: string | null
          recipient_phone?: string | null
          route_id?: string
          sender_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          evidence_urls: string[] | null
          id: string
          reason: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          reason: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          reason?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          notification_email: string | null
          phone: string | null
          phone_verified: boolean
          push_token: string | null
          role: string
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          notification_email?: string | null
          phone?: string | null
          phone_verified?: boolean
          push_token?: string | null
          role?: string
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notification_email?: string | null
          phone?: string | null
          phone_verified?: boolean
          push_token?: string | null
          role?: string
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          score: number
          sender_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          score: number
          sender_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          score?: number
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          arrival_date: string | null
          city: string
          country: string
          id: string
          is_dropoff_available: boolean
          is_pickup_available: boolean
          meeting_point_url: string | null
          route_id: string
          stop_order: number
          stop_type: string
        }
        Insert: {
          arrival_date?: string | null
          city: string
          country: string
          id?: string
          is_dropoff_available?: boolean
          is_pickup_available?: boolean
          meeting_point_url?: string | null
          route_id: string
          stop_order: number
          stop_type?: string
        }
        Update: {
          arrival_date?: string | null
          city?: string
          country?: string
          id?: string
          is_dropoff_available?: boolean
          is_pickup_available?: boolean
          meeting_point_url?: string | null
          route_id?: string
          stop_order?: number
          stop_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_templates: {
        Row: {
          available_weight_kg: number
          created_at: string | null
          destination_city: string
          destination_country: string
          driver_id: string
          id: string
          name: string
          notes: string | null
          origin_city: string
          origin_country: string
          payment_methods: string[]
          price_per_kg_eur: number
        }
        Insert: {
          available_weight_kg: number
          created_at?: string | null
          destination_city: string
          destination_country: string
          driver_id: string
          id?: string
          name: string
          notes?: string | null
          origin_city: string
          origin_country: string
          payment_methods?: string[]
          price_per_kg_eur: number
        }
        Update: {
          available_weight_kg?: number
          created_at?: string | null
          destination_city?: string
          destination_country?: string
          driver_id?: string
          id?: string
          name?: string
          notes?: string | null
          origin_city?: string
          origin_country?: string
          payment_methods?: string[]
          price_per_kg_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          available_weight_kg: number
          created_at: string
          departure_date: string
          destination_city: string
          destination_country: string
          driver_id: string
          estimated_arrival_date: string | null
          id: string
          logistics_options: Json
          min_weight_kg: number | null
          notes: string | null
          origin_city: string
          origin_country: string
          payment_methods: string[]
          price_per_kg_eur: number
          prohibited_items: string[]
          promo_discount_pct: number | null
          promo_expires_at: string | null
          promo_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          available_weight_kg: number
          created_at?: string
          departure_date: string
          destination_city: string
          destination_country: string
          driver_id: string
          estimated_arrival_date?: string | null
          id?: string
          logistics_options?: Json
          min_weight_kg?: number | null
          notes?: string | null
          origin_city: string
          origin_country: string
          payment_methods?: string[]
          price_per_kg_eur: number
          prohibited_items?: string[]
          promo_discount_pct?: number | null
          promo_expires_at?: string | null
          promo_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          available_weight_kg?: number
          created_at?: string
          departure_date?: string
          destination_city?: string
          destination_country?: string
          driver_id?: string
          estimated_arrival_date?: string | null
          id?: string
          logistics_options?: Json
          min_weight_kg?: number | null
          notes?: string | null
          origin_city?: string
          origin_country?: string
          payment_methods?: string[]
          price_per_kg_eur?: number
          prohibited_items?: string[]
          promo_discount_pct?: number | null
          promo_expires_at?: string | null
          promo_label?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          postal_code: string | null
          street: string
          user_id: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          postal_code?: string | null
          street: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          postal_code?: string | null
          street?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_request_offers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          message: string | null
          proposed_pickup_date: string | null
          proposed_price_eur: number
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          message?: string | null
          proposed_pickup_date?: string | null
          proposed_price_eur: number
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          message?: string | null
          proposed_pickup_date?: string | null
          proposed_price_eur?: number
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_request_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_request_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipping_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_requests: {
        Row: {
          created_at: string
          desired_date_from: string | null
          desired_date_to: string | null
          destination_city: string
          destination_country: string
          expires_at: string
          id: string
          max_budget_eur: number | null
          origin_city: string
          origin_country: string
          package_category: string
          package_weight_kg: number
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          desired_date_from?: string | null
          desired_date_to?: string | null
          destination_city: string
          destination_country: string
          expires_at?: string
          id?: string
          max_budget_eur?: number | null
          origin_city: string
          origin_country: string
          package_category: string
          package_weight_kg: number
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          desired_date_from?: string | null
          desired_date_to?: string | null
          destination_city?: string
          destination_country?: string
          expires_at?: string
          id?: string
          max_budget_eur?: number | null
          origin_city?: string
          origin_country?: string
          package_category?: string
          package_weight_kg?: number
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_route_capacity: {
        Args: { p_route_id: string; p_weight_kg: number }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
