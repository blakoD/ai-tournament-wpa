import React from "react";
import { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

interface ProfilePageProps {
  session: Session;
  role: "admin" | "user";
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ session, role }) => {
  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Profile</h1>
              <p className="text-slate-400 text-sm">Your Supabase account details.</p>
            </div>
            <Link
              to="/dashboard"
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Back to dashboard
            </Link>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400">Email</p>
              <p className="text-slate-100 mt-1">{user.email ?? "N/A"}</p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400">Role</p>
              <p className="text-slate-100 mt-1 uppercase tracking-wide">{role}</p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400">User ID</p>
              <p className="text-slate-100 mt-1 break-all">{user.id}</p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400">Provider</p>
              <p className="text-slate-100 mt-1">{user.app_metadata.provider ?? "email"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
