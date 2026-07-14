"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Trade, TradeDraft } from "@/lib/types";

const empty: TradeDraft = {
  instrument: "NAS100", direction: "long", result: "win", pnl: 0, r_multiple: 0,
  setup: "", session: "London", emotion: "Calm", notes: "", followed_plan: true,
  trade_date: new Date().toISOString().slice(0,10),
};

export function TradeModal({ open, trade, onClose, onSave }: { open: boolean; trade?: Trade | null; onClose: ()=>void; onSave: (draft: TradeDraft, id?: string)=>Promise<void>; }) {
  const [form, setForm] = useState<TradeDraft>(empty);
  const [saving, setSaving] = useState(false);
  useEffect(()=>{
    if (trade) setForm({ instrument: trade.instrument, direction: trade.direction, result: trade.result, pnl: trade.pnl, r_multiple: trade.r_multiple, setup: trade.setup, session: trade.session, emotion: trade.emotion, notes: trade.notes, followed_plan: trade.followed_plan, trade_date: trade.trade_date });
    else setForm({...empty, trade_date: new Date().toISOString().slice(0,10)});
  }, [trade, open]);
  if (!open) return null;
  const set = <K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) => setForm(v=>({...v,[key]:value}));
  async function submit(e: React.FormEvent){e.preventDefault(); setSaving(true); try{await onSave(form, trade?.id); onClose();} finally{setSaving(false)}}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget) onClose()}}><section className="modal-card">
    <div className="modal-head"><div><p className="eyebrow">Journal</p><h2>{trade ? "Edit trade" : "Add trade"}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <form onSubmit={submit} className="trade-form">
      <label>Instrument<input value={form.instrument} onChange={e=>set("instrument",e.target.value.toUpperCase())} required/></label>
      <label>Date<input type="date" value={form.trade_date} onChange={e=>set("trade_date",e.target.value)} required/></label>
      <label>Direction<select value={form.direction} onChange={e=>set("direction",e.target.value as "long"|"short")}><option value="long">Long</option><option value="short">Short</option></select></label>
      <label>Result<select value={form.result} onChange={e=>set("result",e.target.value as TradeDraft["result"])}><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></label>
      <label>P&amp;L (£)<input type="number" step="0.01" value={form.pnl} onChange={e=>set("pnl",Number(e.target.value))}/></label>
      <label>R multiple<input type="number" step="0.1" value={form.r_multiple} onChange={e=>set("r_multiple",Number(e.target.value))}/></label>
      <label>Setup<input value={form.setup} onChange={e=>set("setup",e.target.value)} placeholder="Liquidity sweep + FVG"/></label>
      <label>Session<select value={form.session} onChange={e=>set("session",e.target.value)}><option>London</option><option>New York</option><option>Asia</option><option>Other</option></select></label>
      <label>Emotion<select value={form.emotion} onChange={e=>set("emotion",e.target.value)}><option>Calm</option><option>Focused</option><option>Confident</option><option>FOMO</option><option>Frustrated</option><option>Tired</option></select></label>
      <label className="checkbox"><input type="checkbox" checked={form.followed_plan} onChange={e=>set("followed_plan",e.target.checked)}/> Followed my plan</label>
      <label className="span-2">Notes<textarea rows={4} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="What happened? What will you repeat or improve?"/></label>
      <div className="form-actions span-2"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save trade"}</button></div>
    </form>
  </section></div>
}
