import type { components } from "./schema";

type Schemas = components["schemas"];

export type Transaction = Schemas["TransactionRead"];
export type TransactionPage = Schemas["TransactionPage"];
export type Category = Transaction["category"];

export const categories: Category[] = ["Groceries", "Dining", "Transport", "Shopping", "Bills", "Other"];

export type Me = { user_id: string; name: string | null; email: string | null };

export type Recap = {
  month: string;
  total_minor: number;
  count: number;
  previous_total_minor: number;
  insight: { category: Category; change_percent: number; text: string } | null;
  categories: { category: Category; total_minor: number; count: number; share: number }[];
};

export type Budget = {
  month: string;
  limit_minor: number | null;
  spent_minor: number;
  remaining_minor: number | null;
  percent_used: number;
  status: "unset" | "on-track" | "near-limit" | "over";
  label: string;
  days_left: number;
};
