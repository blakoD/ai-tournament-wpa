import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient.js";

export const SignUpPage: React.FC = () => {
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

    setSuccess("Account created. Check your email to confirm your account.");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
        <p className="text-slate-400 mb-6">Sign up to manage tournaments with Supabase auth.</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm text-slate-300 mb-1">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm text-slate-300 mb-1">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-5 text-center">
          Already have an account? <Link to="/signin" className="text-blue-400 hover:text-blue-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
