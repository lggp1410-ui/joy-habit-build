import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function Login() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      setAuthError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <button 
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isGoogleLoading ? "Carregando..." : "Entrar com Google"}
      </button>
      {authError && <p className="text-red-500 mt-2">{authError}</p>}
    </div>
  );
}
