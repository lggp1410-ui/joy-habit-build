// Lovable integration has been replaced by Replit Auth.
// This stub file exists to prevent broken imports from crashing the build.
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => {
      window.location.href = '/api/auth/login';
      return {};
    },
  },
};
