import { supabase } from './supabaseClient';

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: any, _opts?: any) => {
      // Isso conecta direto no Supabase, sem passar por endereços falsos
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    },
  },
};
