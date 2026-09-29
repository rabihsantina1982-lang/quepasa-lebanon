// Hand-written types matching supabase/migrations/0001_init.sql.
// Run `supabase gen types typescript` to regenerate from a live project later.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

export type EventStatus = "draft" | "pending" | "published" | "rejected";
export type MediaKind = "image" | "video";
export type MediaProvider = "upload" | "youtube" | "vimeo";
export type Gender = "male" | "female" | "non_binary";
export type ShareChannel = "whatsapp" | "copy_link";

// One performance of a show that runs on several dates/times (e.g. a musical).
// Empty for single-date events.
export interface Showtime {
  starts_at: string;
  ends_at: string | null;
  ticket_url: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          locale: string | null;
          avatar_url: string | null;
          role: "user" | "promoter" | "admin";
          created_at: string;
          business_name: string | null;
          logo_url: string | null;
          date_of_birth: string | null;
          gender: Gender | null;
          interests: string[];
          onboarding_completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      share_events: {
        Row: {
          id: string;
          event_id: string;
          user_id: string | null;
          channel: ShareChannel;
          locale: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["share_events"]["Row"]> & {
          event_id: string;
          channel: ShareChannel;
        };
        Update: Partial<Database["public"]["Tables"]["share_events"]["Row"]>;
      };
      categories: {
        Row: {
          id: number;
          slug: string;
          name_i18n: Record<string, string>;
          icon: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id"> & { id?: number };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      venues: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          phone: string | null;
          city: string;
          area: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["venues"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["venues"]["Row"]>;
      };
      events: {
        Row: {
          id: string;
          slug: string;
          title_i18n: Record<string, string>;
          description_i18n: Record<string, string>;
          category_id: number | null;
          venue_id: string | null;
          starts_at: string;
          ends_at: string | null;
          timezone: string;
          cover_image: string | null;
          cover_video: string | null;
          price_min: number | null;
          price_max: number | null;
          currency: string;
          ticket_url: string | null;
          booking_phone: string | null;
          status: EventStatus;
          source: string;
          source_url: string | null;
          created_by: string | null;
          user_id: string | null;
          showtimes: Showtime[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          slug: string;
          title_i18n: Record<string, string>;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      event_media: {
        Row: {
          id: string;
          event_id: string;
          kind: MediaKind;
          url: string;
          provider: MediaProvider;
          thumbnail_url: string | null;
          alt_i18n: Record<string, string> | null;
          position: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["event_media"]["Row"]> & {
          event_id: string;
          kind: MediaKind;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_media"]["Row"]>;
      };
      favorites: {
        Row: { user_id: string; event_id: string; created_at: string };
        Insert: { user_id: string; event_id: string };
        Update: never;
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          remind_at: string;
          channel: "email" | "push";
          sent_at: string | null;
          locale: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reminders"]["Row"]> & {
          user_id: string;
          event_id: string;
          remind_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Row"]>;
      };
      submissions: {
        Row: Database["public"]["Tables"]["events"]["Row"];
        Insert: Database["public"]["Tables"]["events"]["Insert"];
        Update: Database["public"]["Tables"]["events"]["Update"];
      };
      ingestion_runs: {
        Row: {
          id: string;
          source: string;
          started_at: string;
          finished_at: string | null;
          inserted: number;
          updated: number;
          errors: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ingestion_runs"]["Row"]> & { source: string };
        Update: Partial<Database["public"]["Tables"]["ingestion_runs"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
export type EventMediaRow = Database["public"]["Tables"]["event_media"]["Row"];

export interface PromoterProfile {
  business_name: string | null;
  logo_url: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface EventWithRelations extends EventRow {
  category: CategoryRow | null;
  venue: VenueRow | null;
  media: EventMediaRow[];
  promoter: PromoterProfile | null;
}
