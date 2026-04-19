import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

interface LoginProps {
  onGuest: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Acesso negado. Tente novamente.',
  redirect_uri_mismatch: 'URI de redirecionamento não autorizado. Verifique as configurações do Google Cloud Console.',
  token_exchange_failed: 'Falha ao autenticar com o Google. Tente novamente.',
  popup_failed_to_open: 'Não consegui abrir a janela do Google. Verifique se pop-ups estão permitidos.',
  popup_closed: 'Login cancelado antes de concluir.',
  origin_mismatch: 'Origem JavaScript não autorizada no Google Cloud Console.',
  idpiframe_initialization_failed: 'O Google bloqueou a inicialização do login neste domínio.',
  profile_fetch_failed: 'Não consegui buscar seu perfil do Google.',
  session_save_failed: 'Erro ao salvar a sessão. Tente novamente.',
  server_error: 'Erro interno. Tente novamente.',
  missing_code: 'Código de autorização ausente. Tente novamente.',
};

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('script_failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script_failed'));
    document.head.appendChild(script);
  });
}

export default function Login({ onGuest }: LoginProps) {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('auth_error');
    if (err) {
      setAuthError(err);
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = async () => const handleGoogleLogin = async () => {
  setAuthError(null);
  setIsGoogleLoading(true);

  try {
    // O código novo e simples:
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
  } finally {
    setIsGoogleLoading(false);
  }
};
  

          await lovable.auth.signInWithOAuth('google');
  

      window.location.href = '/';
    } catch (error) {
      const key = error instanceof Error ? error.message : 'server_error';
      setAuthError(key);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto rounded-card gradient-primary flex items-center justify-center shadow-soft">
            <img src="/images/logo.png" alt="PlanLizz" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-display text-3xl mt-4">PlanLizz</h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle', 'Organize your daily routines')}</p>
        </div>

        {authError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full px-4 py-3 rounded-card bg-red-50 border border-red-200 text-left"
          >
            <p className="text-sm font-medium text-red-700 mb-1">Erro ao entrar com Google</p>
            <p className="text-xs text-red-600">
              {ERROR_MESSAGES[authError] ?? `Erro desconhecido: ${authError}`}
            </p>
          </motion.div>
        )}

        const handleGoogleLogin = async () => {
  setAuthError(null);
  setIsGoogleLoading(true);

  try {
    // Tenta fazer o login direto com o Supabase
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
    // Se der erro, captura aqui
    setAuthError(error.message);
  } finally {
    // Garante que o loading para, independente de dar erro ou não
    setIsGoogleLoading(false);
  }
};
        

          <button
            onClick={onGuest}
            className="w-full px-4 py-3.5 rounded-card text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            {t('login.guest', 'Continue without an account')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
