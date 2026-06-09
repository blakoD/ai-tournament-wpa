import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabaseClient.js";

interface SignUpPageProps {
  onClose?: () => void;
  onSwitchMode?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onClose, onSwitchMode }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname + "#/dashboard",
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(t('signUp.successMsg'));
  };

  const card = (
    <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('signUp.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{t('signUp.subtitle')}</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
              {t('signUp.email')}
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
              {t('signUp.password')}
            </label>
            <input
              id="signup-password"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
          >
            {isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
          </button>
        </form>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-5 text-center">
          {t('signUp.hasAccount')}{' '}
          {onSwitchMode ? (
            <button type="button" onClick={onSwitchMode} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{t('signUp.signIn')}</button>
          ) : (
            <Link to="/signin" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{t('signUp.signIn')}</Link>
          )}
        </p>
    </div>
  );

  if (onClose) return card;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      {card}
    </div>
  );
};
