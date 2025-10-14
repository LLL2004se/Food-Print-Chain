import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserType = 'donor' | 'ngo';

export interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  organization_name: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodListing {
  id: string;
  donor_id: string;
  title: string;
  description: string;
  quantity: string;
  food_type: string;
  expiry_date: string;
  pickup_time_start: string;
  pickup_time_end: string;
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  image_url?: string;
  created_at: string;
  updated_at: string;
  donor?: Profile;
}

export interface Claim {
  id: string;
  listing_id: string;
  ngo_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string;
  claimed_at: string;
  updated_at: string;
  listing?: FoodListing;
  ngo?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_id?: string;
  created_at: string;
}
