import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Category } from "../types";
import { useProfile } from "../hooks/useProfile";

interface CategoryContextType {
  categories: Category[];
  isLoading: boolean;
  refreshCategories: () => Promise<void>;
  addCategory: (
    name: string,
    color: string,
  ) => Promise<{ error: string | null }>;
}

export const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined,
);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { pairId } = useProfile();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    if (!pairId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("pair_id", pairId)
      .order("created_at", { ascending: true });

    if (data && !error) setCategories(data as Category[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [pairId]);

  const addCategory = async (name: string, color: string) => {
    if (!pairId) return { error: "pair not found" };
    const { error } = await supabase
      .from("categories")
      .insert({ pair_id: pairId, name, color });
    if (!error) await fetchCategories();
    return { error: error?.message ?? null };
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        isLoading,
        refreshCategories: fetchCategories,
        addCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
