// Lovable integration has been replaced by Replit Auth.
// This stub file exists to prevent broken imports from crashing the build.
import { supabase } from './supabaseClient';

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: any, _opts?: any) => {
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    },
  },
};
