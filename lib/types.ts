export type UserRole = 'student' | 'organiser' | 'admin';

export const EVENT_CATEGORIES = [
  'tech',
  'cultural',
  'sports',
  'workshop',
  'talk',
  'fun',
  'official',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = [
  'scheduled',
  'delayed',
  'cancelled',
  'done',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = ['normal', 'urgent'] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const SIGNAL_TYPES = [
  'need_teammate',
  'open_to_connect',
  'want_to_build',
  'open_to_work',
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_STATUSES = ['open', 'filled', 'hidden'] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export const SIGNAL_RESPONSE_STATUSES = [
  'pending',
  'accepted',
  'declined',
] as const;

export type SignalResponseStatus = (typeof SIGNAL_RESPONSE_STATUSES)[number];

export const SIGNAL_TAGS = [
  'AI',
  'Web',
  'App',
  'Design',
  'Robotics',
  'Data',
  'Startup',
  'Music',
  'Dance',
  'Drama',
  'Sports',
  'Gaming',
  'Photography',
  'Open source',
  'Other',
] as const;

export type SignalTag = (typeof SIGNAL_TAGS)[number];

// ---------------------------------------------------------------- Table rows

export interface AppSetting {
  key: string;
  value: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: UserRole;
  college_verified: boolean;
  created_at: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  maps_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: EventCategory;
  venue_id: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  poster_url: string | null;
  registration_url: string | null;
  contact_info: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  message: string;
  event_id: string | null;
  priority: AnnouncementPriority;
  created_by: string | null;
  created_at: string;
}

export interface Result {
  id: string;
  event_id: string;
  title: string;
  body: string;
  is_live: boolean;
  updated_at: string;
}

export interface Star {
  user_id: string;
  event_id: string;
  created_at: string;
}

/**
 * Public/readable Signal row.
 * Intentionally excludes `contact` — contact is never selectable from `signals`
 * and must only be retrieved via `supabase.rpc('get_signal_contact', { p_signal_id })`.
 */
export interface Signal {
  id: string;
  user_id: string;
  display_name: string;
  verified: boolean;
  type: SignalType;
  body: string;
  tags: string[];
  event_id: string | null;
  status: SignalStatus;
  expires_at: string;
  created_at: string;
}

export interface SignalInsert {
  id?: string;
  user_id?: string;
  type: SignalType;
  body: string;
  tags?: string[];
  event_id?: string | null;
  contact: string;
  status?: 'open';
  expires_at: string;
}

export interface SignalResponse {
  id: string;
  signal_id: string;
  user_id: string;
  display_name: string;
  note: string | null;
  contact: string;
  status: SignalResponseStatus;
  created_at: string;
}

export interface Report {
  id: string;
  signal_id: string;
  reporter_id: string;
  reason: string | null;
  created_at: string;
}

// ---------------------------------------------------------------- Supabase Database type

export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: AppSetting;
        Insert: AppSetting;
        Update: Partial<AppSetting>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          role?: UserRole;
          college_verified?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      venues: {
        Row: Venue;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          maps_url?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          maps_url?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: {
          id?: string;
          code?: string | null;
          title: string;
          description?: string | null;
          category: EventCategory;
          venue_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: EventStatus;
          poster_url?: string | null;
          registration_url?: string | null;
          contact_info?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          title?: string;
          description?: string | null;
          category?: EventCategory;
          venue_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: EventStatus;
          poster_url?: string | null;
          registration_url?: string | null;
          contact_info?: string | null;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      announcements: {
        Row: Announcement;
        Insert: {
          id?: string;
          message: string;
          event_id?: string | null;
          priority?: AnnouncementPriority;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          message?: string;
          event_id?: string | null;
          priority?: AnnouncementPriority;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'announcements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      results: {
        Row: Result;
        Insert: {
          id?: string;
          event_id: string;
          title?: string;
          body: string;
          is_live?: boolean;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          title?: string;
          body?: string;
          is_live?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'results_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      stars: {
        Row: Star;
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'stars_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stars_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      signals: {
        Row: Signal;
        Insert: SignalInsert;
        Update: {
          status?: SignalStatus;
        };
        Relationships: [
          {
            foreignKeyName: 'signals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signals_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      signal_responses: {
        Row: SignalResponse;
        Insert: {
          id?: string;
          signal_id: string;
          user_id?: string;
          note?: string | null;
          contact: string;
          status?: 'pending';
        };
        Update: {
          status?: 'accepted' | 'declined';
        };
        Relationships: [
          {
            foreignKeyName: 'signal_responses_signal_id_fkey';
            columns: ['signal_id'];
            isOneToOne: false;
            referencedRelation: 'signals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_responses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: Report;
        Insert: {
          id?: string;
          signal_id: string;
          reporter_id?: string;
          reason?: string | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'reports_signal_id_fkey';
            columns: ['signal_id'];
            isOneToOne: false;
            referencedRelation: 'signals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_signal_contact: {
        Args: { p_signal_id: string };
        Returns: string | null;
      };
      is_organiser: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
