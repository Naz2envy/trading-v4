export type Direction = "long" | "short";
export type Result = "win" | "loss" | "breakeven";
export type AccountKind = "personal" | "demo" | "challenge" | "funded" | "archived";
export type DrawdownMode = "static" | "trailing";
export type DrawdownBasis = "balance" | "equity";

export type TradingAccount = {
  id: string;
  user_id: string;
  name: string;
  broker: string;
  kind: AccountKind;
  currency: string;
  starting_balance: number;
  profit_target: number;
  daily_loss_limit: number;
  max_drawdown: number;
  drawdown_mode: DrawdownMode;
  drawdown_basis: DrawdownBasis;
  minimum_trading_days: number;
  status: "active" | "passed" | "failed" | "archived";
  created_at: string;
  updated_at: string;
};

export type AccountDraft = Omit<TradingAccount,"id"|"user_id"|"created_at"|"updated_at">;

export type Trade = {
  id: string;
  user_id: string;
  account_id: string | null;
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
