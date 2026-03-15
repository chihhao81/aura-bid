export const ENV = import.meta.env.VITE_APP_ENV || 'test';
export const isTestEnv = ENV === 'test';

export const SUPABASE_URL = isTestEnv 
    ? (import.meta.env.VITE_SUPABASE_URL_TEST || import.meta.env.VITE_SUPABASE_URL) 
    : import.meta.env.VITE_SUPABASE_URL_PROD;

export const SUPABASE_ANON_KEY = isTestEnv 
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY_TEST || import.meta.env.VITE_SUPABASE_ANON_KEY) 
    : import.meta.env.VITE_SUPABASE_ANON_KEY_PROD;

export const LINE_CLIENT_ID = isTestEnv 
    ? (import.meta.env.VITE_LINE_CLIENT_ID_TEST || '2009342089')
    : import.meta.env.VITE_LINE_CLIENT_ID_PROD;
