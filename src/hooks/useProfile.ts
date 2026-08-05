import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  country: string;
  currency: string;
  balance: number;
  completed_withdrawals: number;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  last_claim_at: string | null;
};

export function profileQueryOptions() {
  return {
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  };
}

export function useProfile() {
  return useQuery(profileQueryOptions());
}

export function useRefreshProfile() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
  };
}
