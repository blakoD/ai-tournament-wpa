import { Session } from "@supabase/supabase-js";

export const getUserRole = (session: Session | null): "admin" | "user" => {
  const appRole = session?.user?.app_metadata?.role;
  const userRole = session?.user?.user_metadata?.role;
  const rawRole = (typeof appRole === "string" ? appRole : typeof userRole === "string" ? userRole : "user").toLowerCase();

  return rawRole === "admin" ? "admin" : "user";
};
