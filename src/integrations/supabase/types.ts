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
      announcements: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          link: string | null
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          link?: string | null
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          link?: string | null
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          position: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string
          id: string
          is_open: boolean
          last_message_at: string
          unread_admin: number
          unread_user: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name: string
          id?: string
          is_open?: boolean
          last_message_at?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          id?: string
          is_open?: boolean
          last_message_at?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          per_user_limit: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_user_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_user_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      courier_shipments: {
        Row: {
          cod_amount: number | null
          consignment_id: string | null
          created_at: string
          id: string
          invoice: string | null
          order_id: string | null
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          status: string | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          cod_amount?: number | null
          consignment_id?: string | null
          created_at?: string
          id?: string
          invoice?: string | null
          order_id?: string | null
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          cod_amount?: number | null
          consignment_id?: string | null
          created_at?: string
          id?: string
          invoice?: string | null
          order_id?: string | null
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          estimated_days: string | null
          fee: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_checks: {
        Row: {
          cancelled_orders: number
          checked_at: string
          id: string
          phone: string
          raw: Json | null
          risk_level: string
          success_orders: number
          success_rate: number
          total_orders: number
        }
        Insert: {
          cancelled_orders?: number
          checked_at?: string
          id?: string
          phone: string
          raw?: Json | null
          risk_level?: string
          success_orders?: number
          success_rate?: number
          total_orders?: number
        }
        Update: {
          cancelled_orders?: number
          checked_at?: string
          id?: string
          phone?: string
          raw?: Json | null
          risk_level?: string
          success_orders?: number
          success_rate?: number
          total_orders?: number
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          cart_snapshot: Json
          city: string | null
          converted_at: string | null
          converted_order_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_zone_id: string | null
          id: string
          is_converted: boolean
          last_field_updated: string | null
          session_id: string
          shipping_address: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_snapshot?: Json
          city?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_zone_id?: string | null
          id?: string
          is_converted?: boolean
          last_field_updated?: string | null
          session_id: string
          shipping_address?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_snapshot?: Json
          city?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_zone_id?: string | null
          id?: string
          is_converted?: boolean
          last_field_updated?: string | null
          session_id?: string
          shipping_address?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomplete_orders_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomplete_orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          city: string | null
          coupon_code: string | null
          courier_consignment_id: string | null
          courier_status: string | null
          courier_synced_at: string | null
          courier_tracking_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_fee: number
          delivery_zone_id: string | null
          discount: number
          fraud_checked_at: string | null
          fraud_data: Json | null
          fraud_score: number | null
          guest_email: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          recovered_from_incomplete: string | null
          sender_number: string | null
          shipping_address: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number
          city?: string | null
          coupon_code?: string | null
          courier_consignment_id?: string | null
          courier_status?: string | null
          courier_synced_at?: string | null
          courier_tracking_code?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount?: number
          fraud_checked_at?: string | null
          fraud_data?: Json | null
          fraud_score?: number | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          recovered_from_incomplete?: string | null
          sender_number?: string | null
          shipping_address: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          city?: string | null
          coupon_code?: string | null
          courier_consignment_id?: string | null
          courier_status?: string | null
          courier_synced_at?: string | null
          courier_tracking_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount?: number
          fraud_checked_at?: string | null
          fraud_data?: Json | null
          fraud_score?: number | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          recovered_from_incomplete?: string | null
          sender_number?: string | null
          shipping_address?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          display_order: number
          id: string
          name: string
          product_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          product_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_id: string
          sku: string | null
          stock: number
        }
        Insert: {
          attributes?: Json
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          product_id: string
          sku?: string | null
          stock?: number
        }
        Update: {
          attributes?: Json
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          custom_shipping_cost: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          long_description: string | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          rating: number
          related_product_ids: string[]
          reviews_count: number
          short_description: string | null
          sku: string | null
          slug: string
          specs: Json | null
          stock: number
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          custom_shipping_cost?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          long_description?: string | null
          name: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          rating?: number
          related_product_ids?: string[]
          reviews_count?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          specs?: Json | null
          stock?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          custom_shipping_cost?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          long_description?: string | null
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          rating?: number
          related_product_ids?: string[]
          reviews_count?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          specs?: Json | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          customer_avatar: string | null
          customer_name: string
          id: string
          is_approved: boolean
          is_featured: boolean
          is_verified_purchase: boolean
          order_id: string | null
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          customer_avatar?: string | null
          customer_name: string
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          customer_avatar?: string | null
          customer_name?: string
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_old_trashed_orders: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "customer"
      coupon_type: "percentage" | "fixed"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "uddoktapay" | "partial"
      payment_status: "unpaid" | "paid" | "partial" | "failed" | "refunded"
      product_type: "simple" | "variable"
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
      app_role: ["admin", "customer"],
      coupon_type: ["percentage", "fixed"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "uddoktapay", "partial"],
      payment_status: ["unpaid", "paid", "partial", "failed", "refunded"],
      product_type: ["simple", "variable"],
    },
  },
} as const
