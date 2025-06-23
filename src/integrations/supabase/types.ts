export interface Database {
  public: {
    Tables: {
      barber_shops: {
        Row: {
          id: string;
          name: string;
          cnpj: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          active: boolean;
          admin_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cnpj?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          active?: boolean;
          admin_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cnpj?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          active?: boolean;
          admin_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      barber_shop_hours: {
        Row: {
          id: string;
          barber_shop_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barber_shop_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barber_shop_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string
          date: string
          time: string
          client_id: string
          client_name: string
          client_email: string
          client_phone: string
          barber_id: string
          barber_name: string
          barber_shop_id: string
          total_duration: number
          total_price: number
          total_products_price: number
          final_price: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          time: string
          client_id: string
          client_name: string
          client_email: string
          client_phone: string
          barber_id: string
          barber_name: string
          barber_shop_id: string
          total_duration: number
          total_price: number
          total_products_price: number
          final_price: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          time?: string
          client_id?: string
          client_name?: string
          client_email?: string
          client_phone?: string
          barber_id?: string
          barber_name?: string
          barber_shop_id?: string
          total_duration?: number
          total_price?: number
          total_products_price?: number
          final_price?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      appointment_services: {
        Row: {
          id: string
          appointment_id: string
          service_id: string
          service_name: string
          service_price: number
          service_duration: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          service_id: string
          service_name: string
          service_price: number
          service_duration: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          service_id?: string
          service_name?: string
          service_price?: number
          service_duration?: number
          created_at?: string
          updated_at?: string
        }
      }
      appointment_products: {
        Row: {
          id: string
          appointment_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      barbers: {
        Row: {
          id: string
          barber_shop_id: string
          name: string
          email: string | null
          phone: string | null
          active: boolean
          commission_rate: number
          available_days: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barber_shop_id: string
          name: string
          email?: string | null
          phone?: string | null
          active?: boolean
          commission_rate?: number
          available_days?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barber_shop_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          active?: boolean
          commission_rate?: number
          available_days?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          notes: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          notes?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          notes?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          price: number
          duration: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          duration: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          duration?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          stock: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          price: number
          stock?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          stock?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      barber_unavailability: {
        Row: {
          id: string
          barber_id: string
          date: string
          reason: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          date: string
          reason?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barber_id?: string
          date?: string
          reason?: string
          created_at?: string
          updated_at?: string
        }
      }
      barber_commissions: {
        Row: {
          id: string
          barber_id: string
          appointment_id: string
          total_price: number
          total_commission: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          appointment_id: string
          total_price: number
          total_commission: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barber_id?: string
          appointment_id?: string
          total_price?: number
          total_commission?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          appointment_id: string
          type: string
          description: string
          value: number
          payment_method: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string
          type: string
          description: string
          value: number
          payment_method?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          type?: string
          description?: string
          value?: number
          payment_method?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          duration_months: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          duration_months?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          duration_months?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_subscriptions: {
        Row: {
          id: string;
          client_id: string;
          subscription_plan_id: string;
          start_date: string;
          end_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          subscription_plan_id: string;
          start_date: string;
          end_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          subscription_plan_id?: string;
          start_date?: string;
          end_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
