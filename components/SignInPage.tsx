import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabaseClient.js";

export const SignInPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate("/dashboard");
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname + "#/dashboard",
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">{t('signIn.title')}</h1>
        <p className="text-slate-400 mb-6">{t('signIn.subtitle')}</p>

        <button
          type="button"
          onClick={() => {
            void handleGoogleSignIn();
          }}
          className="w-full mb-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg py-2.5 transition-colors"
        >
          {t('signIn.continueWithGoogle')}
        </button>

        <div className="relative mb-4">
          <div className="h-px bg-slate-700" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 px-2 text-xs text-slate-500">{t('signIn.or')}</span>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className="block text-sm text-slate-300 mb-1">
              {t('signIn.email')}
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="signin-password" className="block text-sm text-slate-300 mb-1">
              {t('signIn.password')}
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
          >
            {isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-5 text-center">
          {t('signIn.noAccount')} <Link to="/signup" className="text-blue-400 hover:text-blue-300">{t('signIn.createOne')}</Link>
        </p>
      </div>
    </div>
  );
};
