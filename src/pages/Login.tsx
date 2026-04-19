import { useState } from "react";

// Removi o import do supabase para não quebrar o build
export default function Login() {
  const [status, setStatus] = useState("Clique para entrar");

  const handleGoogleLogin = async () => {
    setStatus("O sistema de login precisa de configuração extra...");
    // Aqui seria o login, mas como o import falha, 
    // estamos apenas simulando para o site não travar.
    alert("O login ainda está sendo conectado ao banco de dados!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Bem-vinda ao seu App</h1>
      <button 
        onClick={handleGoogleLogin}
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Entrar com Google
      </button>
      <div className="mt-4 p-2 text-gray-600 text-sm">
        Status: {status}
      </div>
    </div>
  );
}
