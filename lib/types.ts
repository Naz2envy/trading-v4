export type Trade = {
  id: string;
  user_id: string;
  instrument: string;
  direction: "long" | "short";
  result: "win" | "loss" | "breakeven";
  pnl: number;
  r_multiple: number;
  setup: string;
  session: string;
  emotion: string;
  notes: string;
  followed_plan: boolean;
  trade_date: string;
  created_at: string;
};

export type TradeDraft = Omit<Trade, "id" | "user_id" | "created_at">;
