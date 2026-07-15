"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AccountDraft, TradingAccount } from "@/lib/types";

const emptyAccount=():AccountDraft=>({
  name:"",broker:"",kind:"personal",currency:"GBP",starting_balance:0,profit_target:0,
  daily_loss_limit:0,max_drawdown:0,drawdown_mode:"static",drawdown_basis:"balance",
  minimum_trading_days:0,status:"active"
});

export function AccountModal({open,account,onClose,onSave}:{open:boolean;account?:TradingAccount|null;onClose:()=>void;onSave:(draft:AccountDraft,id?:string)=>Promise<void>}){
  const [form,setForm]=useState<AccountDraft>(emptyAccount());
  const [saving,setSaving]=useState(false);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{if(account){const {id,user_id,created_at,updated_at,...draft}=account;setForm(draft)}else setForm(emptyAccount());setError(null)},[account,open]);
  if(!open)return null;
  const set=<K extends keyof AccountDraft>(k:K,v:AccountDraft[K])=>setForm(p=>({...p,[k]:v}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError(null);try{await onSave(form,account?.id);onClose()}catch(e){setError(e instanceof Error?e.message:"Could not save account")}finally{setSaving(false)}}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="trade-sheet account-sheet"><div className="sheet-grabber"/><div className="modal-head"><div><p className="eyebrow">Trading account</p><h2>{account?"Edit account":"Add account"}</h2><p>Track live, demo, challenge and funded accounts separately.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><form onSubmit={submit}>
    <div className="form-section"><h3>Account details</h3><div className="trade-form-grid">
      <label>Name<input required value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Alpha Futures 50K"/></label>
      <label>Broker / firm<input value={form.broker} onChange={e=>set("broker",e.target.value)} placeholder="Vantage or Alpha Futures"/></label>
      <label>Type<select value={form.kind} onChange={e=>set("kind",e.target.value as AccountDraft["kind"])}><option value="personal">Personal</option><option value="demo">Demo</option><option value="challenge">Challenge</option><option value="funded">Funded</option><option value="archived">Archived</option></select></label>
      <label>Currency<select value={form.currency} onChange={e=>set("currency",e.target.value)}><option>GBP</option><option>USD</option><option>EUR</option></select></label>
      <label>Starting balance<input type="number" step="0.01" value={form.starting_balance} onChange={e=>set("starting_balance",Number(e.target.value))}/></label>
      <label>Status<select value={form.status} onChange={e=>set("status",e.target.value as AccountDraft["status"])}><option value="active">Active</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="archived">Archived</option></select></label>
    </div></div>
    <div className="form-section"><h3>Funded rules</h3><div className="trade-form-grid">
      <label>Profit target<input type="number" step="0.01" value={form.profit_target} onChange={e=>set("profit_target",Number(e.target.value))}/></label>
      <label>Daily loss limit<input type="number" step="0.01" value={form.daily_loss_limit} onChange={e=>set("daily_loss_limit",Number(e.target.value))}/></label>
      <label>Maximum drawdown<input type="number" step="0.01" value={form.max_drawdown} onChange={e=>set("max_drawdown",Number(e.target.value))}/></label>
      <label>Minimum trading days<input type="number" min="0" value={form.minimum_trading_days} onChange={e=>set("minimum_trading_days",Number(e.target.value))}/></label>
      <label>Drawdown<select value={form.drawdown_mode} onChange={e=>set("drawdown_mode",e.target.value as AccountDraft["drawdown_mode"])}><option value="static">Static</option><option value="trailing">Trailing</option></select></label>
      <label>Calculated from<select value={form.drawdown_basis} onChange={e=>set("drawdown_basis",e.target.value as AccountDraft["drawdown_basis"])}><option value="balance">Balance</option><option value="equity">Equity</option></select></label>
    </div></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":"Save account"}</button></div>
  </form></section></div>
}
