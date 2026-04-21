
// Lovable integration has been replaced by Replit Auth.
// This stub file exists to prevent broken imports from crashing the build.


import { supabase } from './supabaseClient';

export const lovable = {
  auth: {

    signInWithOAuth: async (_provider: string, _opts?: any) => {
      // Aqui chamamos o Supabase diretamente

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
