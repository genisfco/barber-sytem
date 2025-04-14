export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          barber: string
          barber_id: string | null
          client_email: string
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string | null
          date: string
          id: string
          service: string
          service_id: string | null
          status: string
          time: string
          updated_at: string | null
        }
        Insert: {
          barber: string
          barber_id?: string | null
          client_email: string
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string | null
          date: string
          id?: string
          service: string
          service_id?: string | null
          status?: string
          time: string
          updated_at?: string | null
        }
        Update: {
          barber?: string
          barber_id?: string | null
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          date?: string
          id?: string
          service?: string
          service_id?: string | null
          status?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_commissions: {
        Row: {
          appointment_id: string
          barber_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          date: string
          id: string
          service_amount: number
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          barber_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          date: string
          id?: string
          service_amount: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          date?: string
          id?: string
          service_amount?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          commission_rate: number
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          commission_rate: number
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone: string
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      barber_unavailability: {
        Row: {
          id: string
          barber_id: string
          barber_name: string
          date: string
          motivo: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          barber_id: string
          barber_name: string
          date: string
          motivo?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          barber_id?: string
          barber_name?: string
          date?: string
          motivo?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_unavailability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
          active: boolean
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
          active?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
          active?: boolean
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string;
          name: string;
          price: number;
          duration: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          name: string;
          price: number;
          duration: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          name?: string;
          price?: number;
          duration?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          notes: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          stock: number;
          active: boolean;
          created_at: string | null;
          updated_at: string | null;
        }
        Insert: {
          id?: string;
          name: string;
          description: string;
          price: number;
          stock: number;
          active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        }
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          stock?: number;
          active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        }
        Relationships: []
      }
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
    CompositeTypes: {
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
