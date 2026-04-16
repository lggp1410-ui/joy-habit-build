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
  session_save_failed: 'Erro ao salvar a sessão. Tente novamente.',
  server_error: 'Erro interno. Tente novamente.',
  missing_code: 'Código de autorização ausente. Tente novamente.',
};

export default function Login({ onGuest }: LoginProps) {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('auth_error');
    if (err) {
      setAuthError(err);
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

        <div className="space-y-3 w-full">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-card glass-card shadow-soft hover:bg-muted/50 transition-colors font-medium text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('login.google', 'Continue with Google')}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">{t('login.or', 'or')}</span>
            </div>
          </div>

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
