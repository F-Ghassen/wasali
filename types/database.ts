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
          cancellation_reason: string | null
          cancelled_at: string | null
          collection_service_id: string | null
          collection_stop_id: string | null
          created_at: string
          declared_value_eur: number | null
          delivery_service_id: string | null
          driver_notes: string | null
          dropoff_address: string | null
          dropoff_stop_id: string | null
          dropoff_type: string
          estimated_collection_date: string | null
          id: string
          package_category: string
          package_photos: string[] | null
          package_weight_kg: number
          payment_status: string
          payment_type: string | null
          pickup_address: string | null
          pickup_type: string
          price_eur: number
          recipient_address_city: string | null
          recipient_address_postal_code: string | null
          recipient_address_street: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_whatsapp: boolean
          route_id: string
          sender_address_city: string | null
          sender_address_postal_code: string | null
          sender_address_street: string | null
          sender_id: string
          sender_name: string | null
          sender_phone: string | null
          sender_whatsapp: boolean
          status: string
          stripe_payment_intent_id: string | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          collection_service_id?: string | null
          collection_stop_id?: string | null
          created_at?: string
          declared_value_eur?: number | null
          delivery_service_id?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_stop_id?: string | null
          dropoff_type: string
          estimated_collection_date?: string | null
          id?: string
          package_category: string
          package_photos?: string[] | null
          package_weight_kg: number
          payment_status?: string
          payment_type?: string | null
          pickup_address?: string | null
          pickup_type: string
          price_eur: number
          recipient_address_city?: string | null
          recipient_address_postal_code?: string | null
          recipient_address_street?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_whatsapp?: boolean
          route_id: string
          sender_address_city?: string | null
          sender_address_postal_code?: string | null
          sender_address_street?: string | null
          sender_id: string
          sender_name?: string | null
          sender_phone?: string | null
          sender_whatsapp?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          collection_service_id?: string | null
          collection_stop_id?: string | null
          created_at?: string
          declared_value_eur?: number | null
          delivery_service_id?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_stop_id?: string | null
          dropoff_type?: string
          estimated_collection_date?: string | null
          id?: string
          package_category?: string
          package_photos?: string[] | null
          package_weight_kg?: number
          payment_status?: string
          payment_type?: string | null
          pickup_address?: string | null
          pickup_type?: string
          price_eur?: number
          recipient_address_city?: string | null
          recipient_address_postal_code?: string | null
          recipient_address_street?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_whatsapp?: boolean
          route_id?: string
          sender_address_city?: string | null
          sender_address_postal_code?: string | null
          sender_address_street?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_phone?: string | null
          sender_whatsapp?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_collection_service_id_fkey"
            columns: ["collection_service_id"]
            isOneToOne: false
            referencedRelation: "route_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_collection_stop_id_fkey"
            columns: ["collection_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_delivery_service_id_fkey"
            columns: ["delivery_service_id"]
            isOneToOne: false
            referencedRelation: "route_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_dropoff_stop_id_fkey"
            columns: ["dropoff_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
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
      cities: {
        Row: {
          coming_soon: boolean
          country: string
          country_code: string
          created_at: string
          flag_emoji: string
          id: string
          is_active: boolean
          is_capital: boolean
          name: string
        }
        Insert: {
          coming_soon?: boolean
          country: string
          country_code: string
          created_at?: string
          flag_emoji?: string
          id?: string
          is_active?: boolean
          is_capital?: boolean
          name: string
        }
        Update: {
          coming_soon?: boolean
          country?: string
          country_code?: string
          created_at?: string
          flag_emoji?: string
          id?: string
          is_active?: boolean
          is_capital?: boolean
          name?: string
        }
        Relationships: []
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
          completed_trips: number
          created_at: string
          full_name: string | null
          id: string
          notification_email: string | null
          phone: string | null
          phone_verified: boolean
          push_token: string | null
          rating: number
          role: string
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          completed_trips?: number
          created_at?: string
          full_name?: string | null
          id: string
          notification_email?: string | null
          phone?: string | null
          phone_verified?: boolean
          push_token?: string | null
          rating?: number
          role?: string
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          completed_trips?: number
          created_at?: string
          full_name?: string | null
          id?: string
          notification_email?: string | null
          phone?: string | null
          phone_verified?: boolean
          push_token?: string | null
          rating?: number
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
      recipients: {
        Row: {
          address_city: string | null
          address_postal_code: string | null
          address_street: string | null
          created_at: string
          id: string
          name: string
          phone: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          address_city?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          address_city?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_alerts: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          destination_city_id: string | null
          id: string
          min_weight_kg: number | null
          origin_city_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          destination_city_id?: string | null
          id?: string
          min_weight_kg?: number | null
          origin_city_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          destination_city_id?: string | null
          id?: string
          min_weight_kg?: number | null
          origin_city_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_alerts_destination_city_id_fkey"
            columns: ["destination_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_alerts_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_payment_methods: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          payment_type: string
          route_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          payment_type: string
          route_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          payment_type?: string
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_payment_methods_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_services: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          location_address: string | null
          location_name: string | null
          price_eur: number
          route_id: string
          route_stop_id: string | null
          service_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          location_address?: string | null
          location_name?: string | null
          price_eur?: number
          route_id: string
          route_stop_id?: string | null
          service_type: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          location_address?: string | null
          location_name?: string | null
          price_eur?: number
          route_id?: string
          route_stop_id?: string | null
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_services_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_services_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          arrival_date: string | null
          city_id: string
          id: string
          is_dropoff_available: boolean
          is_pickup_available: boolean
          location_address: string | null
          location_name: string | null
          meeting_point_url: string | null
          route_id: string
          stop_order: number
          stop_type: string
        }
        Insert: {
          arrival_date?: string | null
          city_id: string
          id?: string
          is_dropoff_available?: boolean
          is_pickup_available?: boolean
          location_address?: string | null
          location_name?: string | null
          meeting_point_url?: string | null
          route_id: string
          stop_order: number
          stop_type?: string
        }
        Update: {
          arrival_date?: string | null
          city_id?: string
          id?: string
          is_dropoff_available?: boolean
          is_pickup_available?: boolean
          location_address?: string | null
          location_name?: string | null
          meeting_point_url?: string | null
          route_id?: string
          stop_order?: number
          stop_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
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
          destination_city_id: string | null
          driver_id: string
          id: string
          name: string
          notes: string | null
          origin_city_id: string | null
          payment_methods: string[]
          price_per_kg_eur: number
        }
        Insert: {
          available_weight_kg: number
          created_at?: string | null
          destination_city_id?: string | null
          driver_id: string
          id?: string
          name: string
          notes?: string | null
          origin_city_id?: string | null
          payment_methods?: string[]
          price_per_kg_eur: number
        }
        Update: {
          available_weight_kg?: number
          created_at?: string | null
          destination_city_id?: string | null
          driver_id?: string
          id?: string
          name?: string
          notes?: string | null
          origin_city_id?: string | null
          payment_methods?: string[]
          price_per_kg_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_destination_city_id_fkey"
            columns: ["destination_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_templates_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          available_weight_kg: number
          created_at: string
          departure_date: string
          destination_city_id: string | null
          driver_id: string
          estimated_arrival_date: string | null
          id: string
          is_featured: boolean | null
          logistics_options: Json
          max_single_package_kg: number | null
          min_weight_kg: number | null
          notes: string | null
          origin_city_id: string | null
          payment_methods: string[]
          price_per_kg_eur: number
          prohibited_items: string[]
          promo_discount_pct: number | null
          promo_expires_at: string | null
          promo_label: string | null
          promotion_active: boolean
          promotion_percentage: number | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          available_weight_kg: number
          created_at?: string
          departure_date: string
          destination_city_id?: string | null
          driver_id: string
          estimated_arrival_date?: string | null
          id?: string
          is_featured?: boolean | null
          logistics_options?: Json
          max_single_package_kg?: number | null
          min_weight_kg?: number | null
          notes?: string | null
          origin_city_id?: string | null
          payment_methods?: string[]
          price_per_kg_eur: number
          prohibited_items?: string[]
          promo_discount_pct?: number | null
          promo_expires_at?: string | null
          promo_label?: string | null
          promotion_active?: boolean
          promotion_percentage?: number | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          available_weight_kg?: number
          created_at?: string
          departure_date?: string
          destination_city_id?: string | null
          driver_id?: string
          estimated_arrival_date?: string | null
          id?: string
          is_featured?: boolean | null
          logistics_options?: Json
          max_single_package_kg?: number | null
          min_weight_kg?: number | null
          notes?: string | null
          origin_city_id?: string | null
          payment_methods?: string[]
          price_per_kg_eur?: number
          prohibited_items?: string[]
          promo_discount_pct?: number | null
          promo_expires_at?: string | null
          promo_label?: string | null
          promotion_active?: boolean
          promotion_percentage?: number | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_destination_city_id_fkey"
            columns: ["destination_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
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
      saved_routes: {
        Row: {
          created_at: string
          id: string
          route_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          route_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
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
          destination_city_id: string | null
          expires_at: string
          id: string
          max_budget_eur: number | null
          origin_city_id: string | null
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
          destination_city_id?: string | null
          expires_at?: string
          id?: string
          max_budget_eur?: number | null
          origin_city_id?: string | null
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
          destination_city_id?: string | null
          expires_at?: string
          id?: string
          max_budget_eur?: number | null
          origin_city_id?: string | null
          package_category?: string
          package_weight_kg?: number
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_requests_destination_city_id_fkey"
            columns: ["destination_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_requests_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
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
