import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [status, setStatus] = useState("Aguardando clique...");

  const handleGoogleLogin = async () => {
    setStatus("Tentando conectar...");
    
    try {
      // Verifica se o objeto supabase existe
      if (!supabase) {
        throw new Error("O objeto Supabase não foi carregado! Verifique a importação.");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
      
      setStatus("Redirecionando...");
    } catch (err: any) {
      console.error(err);
      setStatus("Erro: " + err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4">Teste de Login</h1>
      <button 
        onClick={handleGoogleLogin}
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Entrar com Google
      </button>
      <div className="mt-4 p-2 bg-gray-100 rounded text-red-600 text-sm">
        Status: {status}
      </div>
    </div>
  );
}
