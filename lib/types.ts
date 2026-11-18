export type UserRole = 'student' | 'volunteer' | 'scorer' | 'organiser' | 'admin';

export const STAMP_MASCOTS = [
  'spark',
  'zap',
  'beat',
  'kick',
  'doodle',
  'buzz',
] as const;

export type StampMascot = (typeof STAMP_MASCOTS)[number];

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

export const EVENT_CHANGE_KINDS = [
  'time',
  'venue',
  'time_venue',
  'cancelled',
  'restored',
] as const;
export type EventChangeKind = (typeof EVENT_CHANGE_KINDS)[number];

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
// Use `type` aliases (not `interface`) so each row satisfies PostgREST's
// `Record<string, unknown>` GenericTable constraint in @supabase/supabase-js.

export type AppSetting = {
  key: string;
  value: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: UserRole;
  college_verified: boolean;
  leaderboard_hidden?: boolean;
  created_at: string;
};

export type Venue = {
  id: string;
  name: string;
  description: string | null;
  maps_url: string | null;
  created_at: string;
};

export type Event = {
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
  cover_url?: string | null;
  host_name?: string | null;
  host_coordinator?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  message: string;
  event_id: string | null;
  priority: AnnouncementPriority;
  created_by: string | null;
  created_at: string;
};

export type EventChange = {
  id: string;
  event_id: string;
  kind: EventChangeKind;
  old_starts_at: string | null;
  new_starts_at: string | null;
  old_venue: string | null;
  new_venue: string | null;
  message: string;
  created_at: string;
};

export type Result = {
  id: string;
  event_id: string;
  title: string;
  body: string;
  is_live: boolean;
  updated_at: string;
};

export type Star = {
  user_id: string;
  event_id: string;
  created_at: string;
};

/**
 * Public/readable Signal row.
 * Intentionally excludes `contact` — contact is never selectable from `signals`
 * and must only be retrieved via `supabase.rpc('get_signal_contact', { p_signal_id })`.
 */
export type Signal = {
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
};

export type SignalInsert = {
  id?: string;
  user_id?: string;
  type: SignalType;
  body: string;
  tags?: string[];
  event_id?: string | null;
  contact: string;
  status?: 'open';
  expires_at: string;
};

export type SignalResponse = {
  id: string;
  signal_id: string;
  user_id: string;
  display_name: string;
  note: string | null;
  contact: string;
  status: SignalResponseStatus;
  created_at: string;
};

export type Report = {
  id: string;
  signal_id: string;
  reporter_id: string;
  reason: string | null;
  created_at: string;
};

export type StampHunt = {
  id: number;
  name: string;
  opens_at: string;
  closes_at: string;
  stamp_value: number;
  bonus_value: number;
  printed_value: number;
  complete_bonus: number;
};

/**
 * Public-safe StampPoint row.
 * Intentionally excludes `secret` and `print_code` — never readable by clients.
 */
export type StampPointPublic = {
  id: string;
  name: string;
  event_id: string | null;
  venue_id: string | null;
  mascot: StampMascot;
  sort: number;
  active: boolean;
  bonus_from: string | null;
  bonus_to: string | null;
};

export type Stamp = {
  user_id: string;
  point_id: string;
  points: number;
  method: 'live' | 'printed';
  scanned_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  verified: boolean;
  stamps: number;
  score: number;
  last_scan: string;
};

export type ClaimStampResult =
  | {
      ok: true;
      points: number;
      method: 'live' | 'printed';
      mascot: StampMascot;
      stamps: number;
      total: number;
      of: number;
    }
  | {
      ok: false;
      reason:
        | 'sign_in'
        | 'closed'
        | 'unknown'
        | 'not_live'
        | 'slow_down'
        | 'expired'
        | 'already';
      message: string;
    };

export type LiveCodeResult = {
  code: string;
  expires_in: number;
};

export type ResultsVisibility = 'live' | 'after_close' | 'hidden';

/** Public-safe Poll row (intentionally excludes `secret`). */
export type PollPublic = {
  id: string;
  event_id: string;
  title: string;
  enabled: boolean;
  opens_at: string | null;
  closes_at: string | null;
  results_visibility: ResultsVisibility;
  college_only: boolean;
  require_code: boolean;
  created_at: string;
  updated_at: string;
};

export type Contestant = {
  id: string;
  poll_id: string;
  name: string;
  subtitle: string | null;
  photo_url: string | null;
  sort: number;
  active: boolean;
};

export type Vote = {
  poll_id: string;
  user_id: string;
  contestant_id: string;
  change_count: number;
  source?: 'online' | 'offline';
  created_at: string;
  updated_at: string;
};

export type PollResultRow = {
  poll_id: string;
  event_id: string;
  contestant_id: string;
  name: string;
  subtitle: string | null;
  photo_url: string | null;
  sort: number;
  visible: boolean;
  votes: number | null;
  percent: number | null;
  total_votes: number | null;
};

export type CastVoteResult =
  | {
      ok: true;
      reason: 'voted' | 'changed' | 'same';
      contestant?: string;
      changes_left?: number;
      message?: string;
    }
  | {
      ok: false;
      reason:
        | 'sign_in'
        | 'closed'
        | 'unknown'
        | 'college_only'
        | 'code'
        | 'locked'
        | 'slow_down'
        | 'invalid'
        | 'clock'
        | 'outside'
        | 'late'
        | 'already';
      message: string;
    };

export type ParticipantStatus =
  | 'registered'
  | 'checked_in'
  | 'on_stage'
  | 'performed'
  | 'withdrawn';

export type ParticipantPublic = {
  id: string;
  event_id: string;
  name: string;
  team: string | null;
  college: string | null;
  department: string | null;
  performance_order: number | null;
  status: ParticipantStatus;
};

export type ParticipantPrivate = ParticipantPublic & {
  email: string | null;
  phone: string | null;
  show_public: boolean;
  created_at: string;
  updated_at: string;
};

export type EventHost = {
  event_id: string;
  user_id: string;
  created_at: string;
};

// ---------------------------------------------------------------- Supabase Database type

export type Database = {
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
          leaderboard_hidden?: boolean;
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
          cover_url?: string | null;
          host_name?: string | null;
          host_coordinator?: string | null;
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
          cover_url?: string | null;
          host_name?: string | null;
          host_coordinator?: string | null;
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
      event_changes: {
        Row: EventChange;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'event_changes_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
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
        Update: Record<string, never>;
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
        Update: Record<string, never>;
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
      stamp_hunt: {
        Row: StampHunt;
        Insert: Partial<StampHunt> & { opens_at: string; closes_at: string };
        Update: Partial<StampHunt>;
        Relationships: [];
      };
      stamp_points: {
        Row: StampPointPublic;
        Insert: {
          id?: string;
          name: string;
          event_id?: string | null;
          venue_id?: string | null;
          mascot?: StampMascot;
          sort?: number;
          active?: boolean;
          bonus_from?: string | null;
          bonus_to?: string | null;
        };
        Update: {
          name?: string;
          event_id?: string | null;
          venue_id?: string | null;
          mascot?: StampMascot;
          sort?: number;
          active?: boolean;
          bonus_from?: string | null;
          bonus_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stamp_points_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stamp_points_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      stamps: {
        Row: Stamp;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'stamps_point_id_fkey';
            columns: ['point_id'];
            isOneToOne: false;
            referencedRelation: 'stamp_points';
            referencedColumns: ['id'];
          },
        ];
      };
      polls: {
        Row: PollPublic;
        Insert: {
          id?: string;
          event_id: string;
          title?: string;
          enabled?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          results_visibility?: ResultsVisibility;
          college_only?: boolean;
          require_code?: boolean;
        };
        Update: {
          title?: string;
          enabled?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          results_visibility?: ResultsVisibility;
          college_only?: boolean;
          require_code?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'polls_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      contestants: {
        Row: Contestant;
        Insert: {
          id?: string;
          poll_id: string;
          name: string;
          subtitle?: string | null;
          photo_url?: string | null;
          sort?: number;
          active?: boolean;
        };
        Update: {
          name?: string;
          subtitle?: string | null;
          photo_url?: string | null;
          sort?: number;
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'contestants_poll_id_fkey';
            columns: ['poll_id'];
            isOneToOne: false;
            referencedRelation: 'polls';
            referencedColumns: ['id'];
          },
        ];
      };
      votes: {
        Row: Vote;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      event_hosts: {
        Row: EventHost;
        Insert: { event_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      participants: {
        Row: ParticipantPrivate;
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          team?: string | null;
          college?: string | null;
          department?: string | null;
          email?: string | null;
          phone?: string | null;
          performance_order?: number | null;
          status?: ParticipantStatus;
          show_public?: boolean;
        };
        Update: {
          name?: string;
          team?: string | null;
          college?: string | null;
          department?: string | null;
          email?: string | null;
          phone?: string | null;
          performance_order?: number | null;
          status?: ParticipantStatus;
          show_public?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      stamp_leaderboard: {
        Row: LeaderboardRow;
        Relationships: [];
      };
      poll_results: {
        Row: PollResultRow;
        Relationships: [];
      };
      participants_public: {
        Row: ParticipantPublic;
        Relationships: [];
      };
    };
    Functions: {
      get_signal_contact: {
        Args: { p_signal_id: string };
        Returns: string | null;
      };
      is_organiser: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_volunteer: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_event_host: {
        Args: { p_event: string };
        Returns: boolean;
      };
      claim_stamp: {
        Args: { p_point: string; p_code: string };
        Returns: ClaimStampResult;
      };
      get_live_code: {
        Args: { p_point: string };
        Returns: LiveCodeResult;
      };
      get_print_code: {
        Args: { p_point: string };
        Returns: string | null;
      };
      cast_vote: {
        Args: { p_poll: string; p_contestant: string; p_code?: string | null };
        Returns: CastVoteResult;
      };
      cast_vote_offline: {
        Args: {
          p_poll: string;
          p_contestant: string;
          p_code: string;
          p_cast_at: string;
          p_client_ref: string;
        };
        Returns: CastVoteResult;
      };
      get_vote_code: {
        Args: { p_poll: string };
        Returns: LiveCodeResult;
      };
      get_vote_codes: {
        Args: { p_poll: string; p_hours?: number };
        Returns: Array<{ w: number; code: string }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
