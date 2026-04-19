import { useState } from "react";

export default function Login() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthError("Ops! O sistema de login ainda está sendo configurado. Tente novamente mais tarde.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Bem-vinda ao seu App</h1>
      <button 
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Entrar com Google
      </button>
      {authError && <p className="text-red-500 mt-2">{authError}</p>}
    </div>
  );
}
