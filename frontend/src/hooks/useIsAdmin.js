import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const useIsAdmin = () => {
  const { user } = useAuth();
  
  // Check if session-based admin auth exists (from Admin Panel login)
  const sessionAdmin =
    typeof window !== "undefined" &&
    sessionStorage.getItem("campusorbit_admin_auth") === "true";

  const { data: dbAdmin = false, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      return api.auth.isAdmin();
    },
    enabled: !!user,
  });

  return { isAdmin: Boolean(sessionAdmin || dbAdmin), isLoading };
};
