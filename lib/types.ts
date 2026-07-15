export type Direction = "long" | "short";
export type Result = "win" | "loss" | "breakeven";

export type Trade = {
  id: string;
  user_id: string;
  instrument: string;
  account: string;
  direction: Direction;
  result: Result;
  pnl: number;
  r_multiple: number;
  risk_amount: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  setup: string;
  session: string;
  timeframe: string;
  emotion: string;
  notes: string;
  followed_plan: boolean;
  trade_date: string;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TradeDraft = Omit<Trade, "id" | "user_id" | "created_at" | "updated_at">;
