export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      scans: {
        Row: {
          active_subdomains: number | null;
          anomalies: number | null;
          cloud_assets: number | null;
          completed_at: string | null;
          created_at: string;
          id: string;
          scan_options: Json | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["scan_status"];
          takeover_vulnerable: number | null;
          target_domain: string;
          total_subdomains: number | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          active_subdomains?: number | null;
          anomalies?: number | null;
          cloud_assets?: number | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          scan_options?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["scan_status"];
          takeover_vulnerable?: number | null;
          target_domain: string;
          total_subdomains?: number | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active_subdomains?: number | null;
          anomalies?: number | null;
          cloud_assets?: number | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          scan_options?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["scan_status"];
          takeover_vulnerable?: number | null;
          target_domain?: string;
          total_subdomains?: number | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      subdomains: {
        Row: {
          anomaly_reason: string | null;
          cloud_provider: string | null;
          cname_record: string | null;
          created_at: string;
          dns_records: Json | null;
          first_seen: string | null;
          http_status: number | null;
          https_status: number | null;
          id: string;
          ip_addresses: string[] | null;
          is_anomaly: boolean | null;
          last_seen: string | null;
          name: string;
          ports: Json | null;
          risk_score: number | null;
          scan_id: string;
          server: string | null;
          status: Database["public"]["Enums"]["subdomain_status"];
          takeover_type: string | null;
          takeover_vulnerable: boolean | null;
          technologies: string[] | null;
          wayback_urls: string[] | null;
        };
        Insert: {
          anomaly_reason?: string | null;
          cloud_provider?: string | null;
          cname_record?: string | null;
          created_at?: string;
          dns_records?: Json | null;
          first_seen?: string | null;
          http_status?: number | null;
          https_status?: number | null;
          id?: string;
          ip_addresses?: string[] | null;
          is_anomaly?: boolean | null;
          last_seen?: string | null;
          name: string;
          ports?: Json | null;
          risk_score?: number | null;
          scan_id: string;
          server?: string | null;
          status?: Database["public"]["Enums"]["subdomain_status"];
          takeover_type?: string | null;
          takeover_vulnerable?: boolean | null;
          technologies?: string[] | null;
          wayback_urls?: string[] | null;
        };
        Update: {
          anomaly_reason?: string | null;
          cloud_provider?: string | null;
          cname_record?: string | null;
          created_at?: string;
          dns_records?: Json | null;
          first_seen?: string | null;
          http_status?: number | null;
          https_status?: number | null;
          id?: string;
          ip_addresses?: string[] | null;
          is_anomaly?: boolean | null;
          last_seen?: string | null;
          name?: string;
          ports?: Json | null;
          risk_score?: number | null;
          scan_id?: string;
          server?: string | null;
          status?: Database["public"]["Enums"]["subdomain_status"];
          takeover_type?: string | null;
          takeover_vulnerable?: boolean | null;
          technologies?: string[] | null;
          wayback_urls?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "subdomains_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      scan_status: "pending" | "running" | "completed" | "failed";
      subdomain_status: "active" | "inactive" | "unknown";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      scan_status: ["pending", "running", "completed", "failed"],
      subdomain_status: ["active", "inactive", "unknown"],
    },
  },
} as const;
