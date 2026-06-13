// Lovable integration shim — delegates OAuth to Supabase.
import { supabase } from '@/integrations/supabase/client';

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => {
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    },
  },
};
