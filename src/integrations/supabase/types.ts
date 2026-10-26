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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_gecmis: {
        Row: {
          created_at: string
          detay: string
          id: string
          islem: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detay?: string
          id?: string
          islem: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detay?: string
          id?: string
          islem?: string
          user_id?: string
        }
        Relationships: []
      }
      bildirimler: {
        Row: {
          baslik: string
          created_at: string
          id: string
          link: string | null
          metin: string
          okundu: boolean
          tur: string
          user_id: string
        }
        Insert: {
          baslik: string
          created_at?: string
          id?: string
          link?: string | null
          metin?: string
          okundu?: boolean
          tur?: string
          user_id: string
        }
        Update: {
          baslik?: string
          created_at?: string
          id?: string
          link?: string | null
          metin?: string
          okundu?: boolean
          tur?: string
          user_id?: string
        }
        Relationships: []
      }
      destek_ekleri: {
        Row: {
          ad: string
          boyut: number
          content_type: string
          created_at: string
          id: string
          talep_id: string
          user_id: string
          yol: string
        }
        Insert: {
          ad: string
          boyut: number
          content_type: string
          created_at?: string
          id?: string
          talep_id: string
          user_id?: string
          yol: string
        }
        Update: {
          ad?: string
          boyut?: number
          content_type?: string
          created_at?: string
          id?: string
          talep_id?: string
          user_id?: string
          yol?: string
        }
        Relationships: [
          {
            foreignKeyName: "destek_ekleri_talep_id_fkey"
            columns: ["talep_id"]
            isOneToOne: false
            referencedRelation: "destek_talepleri"
            referencedColumns: ["id"]
          },
        ]
      }
      destek_mesajlari: {
        Row: {
          created_at: string
          id: string
          metin: string
          talep_id: string
          user_id: string
          yonetici: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          metin: string
          talep_id: string
          user_id?: string
          yonetici?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          metin?: string
          talep_id?: string
          user_id?: string
          yonetici?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "destek_mesajlari_talep_id_fkey"
            columns: ["talep_id"]
            isOneToOne: false
            referencedRelation: "destek_talepleri"
            referencedColumns: ["id"]
          },
        ]
      }
      destek_talepleri: {
        Row: {
          aciklama: string
          created_at: string
          durum: string
          id: string
          konu: string
          tur: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aciklama?: string
          created_at?: string
          durum?: string
          id?: string
          konu: string
          tur?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          aciklama?: string
          created_at?: string
          durum?: string
          id?: string
          konu?: string
          tur?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      duyuru_planlari: {
        Row: {
          baslik: string
          created_at: string
          durum: string
          gonderildi_at: string | null
          hedef: Json
          id: string
          metin: string
          olusturan: string | null
          yayin_zamani: string
        }
        Insert: {
          baslik: string
          created_at?: string
          durum?: string
          gonderildi_at?: string | null
          hedef?: Json
          id?: string
          metin: string
          olusturan?: string | null
          yayin_zamani: string
        }
        Update: {
          baslik?: string
          created_at?: string
          durum?: string
          gonderildi_at?: string | null
          hedef?: Json
          id?: string
          metin?: string
          olusturan?: string | null
          yayin_zamani?: string
        }
        Relationships: []
      }
      global_data: {
        Row: {
          anahtar: string
          updated_at: string
          updated_by: string | null
          veri: Json
        }
        Insert: {
          anahtar: string
          updated_at?: string
          updated_by?: string | null
          veri?: Json
        }
        Update: {
          anahtar?: string
          updated_at?: string
          updated_by?: string | null
          veri?: Json
        }
        Relationships: []
      }
      panel_ayar: {
        Row: {
          id: number
          okul_epostasi_zorunlu: boolean
          sifre_hash: string
        }
        Insert: {
          id?: number
          okul_epostasi_zorunlu?: boolean
          sifre_hash: string
        }
        Update: {
          id?: number
          okul_epostasi_zorunlu?: boolean
          sifre_hash?: string
        }
        Relationships: []
      }
      panel_denemeler: {
        Row: {
          id: number
          user_id: string
          zaman: string
        }
        Insert: {
          id?: number
          user_id: string
          zaman?: string
        }
        Update: {
          id?: number
          user_id?: string
          zaman?: string
        }
        Relationships: []
      }
      panel_erisim: {
        Row: {
          bitis: string
          user_id: string
        }
        Insert: {
          bitis: string
          user_id: string
        }
        Update: {
          bitis?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ad_soyad: string
          created_at: string
          email: string | null
          id: string
          ogrenci_no: string
          updated_at: string
        }
        Insert: {
          ad_soyad?: string
          created_at?: string
          email?: string | null
          id: string
          ogrenci_no?: string
          updated_at?: string
        }
        Update: {
          ad_soyad?: string
          created_at?: string
          email?: string | null
          id?: string
          ogrenci_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      sheets_kaynaklari: {
        Row: {
          aktif: boolean
          anahtar: string
          aralik_dk: number
          created_at: string
          hafta_gunleri: number[]
          hata: string | null
          id: string
          kontrol_tipi: string
          saatler: Json
          son_degisim: string | null
          son_hash: string | null
          son_kontrol: string | null
          tur: string
          updated_at: string
          url: string
        }
        Insert: {
          aktif?: boolean
          anahtar: string
          aralik_dk?: number
          created_at?: string
          hafta_gunleri?: number[]
          hata?: string | null
          id?: string
          kontrol_tipi?: string
          saatler?: Json
          son_degisim?: string | null
          son_hash?: string | null
          son_kontrol?: string | null
          tur: string
          updated_at?: string
          url: string
        }
        Update: {
          aktif?: boolean
          anahtar?: string
          aralik_dk?: number
          created_at?: string
          hafta_gunleri?: number[]
          hata?: string | null
          id?: string
          kontrol_tipi?: string
          saatler?: Json
          son_degisim?: string | null
          son_hash?: string | null
          son_kontrol?: string | null
          tur?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      super_adminler: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          ayarlar: Json
          manuel_amfi: Json
          secmeliler: Json
          updated_at: string
          user_id: string
          veri: Json
        }
        Insert: {
          ayarlar?: Json
          manuel_amfi?: Json
          secmeliler?: Json
          updated_at?: string
          user_id: string
          veri?: Json
        }
        Update: {
          ayarlar?: Json
          manuel_amfi?: Json
          secmeliler?: Json
          updated_at?: string
          user_id?: string
          veri?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_yetki_ayarla: {
        Args: { _user_id: string; _ver: boolean }
        Returns: undefined
      }
      bildirim_gonder: {
        Args: { _baslik: string; _hedef: Json; _metin: string }
        Returns: number
      }
      duyuru_listesi: {
        Args: never
        Returns: {
          alici: number
          baslik: string
          metin: string
          okuyan: number
          zaman: string
        }[]
      }
      duyuru_sil: {
        Args: { _baslik: string; _metin: string; _zaman: string }
        Returns: number
      }
      gercek_super_admin_mi: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hesap_hazirla: {
        Args: { _ad_soyad: string; _ogrenci_no: string }
        Returns: boolean
      }
      ogrenci_sorgula: { Args: { _no: string }; Returns: Json }
      okul_epostasi_ayarla: { Args: { _ver: boolean }; Returns: undefined }
      okul_epostasi_zorunlu_mu: { Args: never; Returns: boolean }
      orijinal_admin_mi: { Args: never; Returns: boolean }
      panel_sifre_dene: { Args: { _sifre: string }; Returns: boolean }
      sheets_cron_token_dogrula: { Args: { _token: string }; Returns: boolean }
      super_admin_ayarla: {
        Args: { _user_id: string; _ver: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
