"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import type { Trade, TradeDraft, TradingAccount } from "@/lib/types";

const makeEmpty = (): TradeDraft => ({
  instrument: "NAS100", account: "Personal", account_id: null, direction: "long", result: "win",
  pnl: 0, r_multiple: 0, risk_amount: 0, entry_price: null, stop_loss: null,
  take_profit: null, exit_price: null, setup: "", session: "London", timeframe: "5m",
  emotion: "Calm", notes: "", followed_plan: true,
  trade_date: new Date().toISOString().slice(0,10), screenshot_url: null,
});

export function TradeModal({ open, trade, onClose, onSave, onUpload, accounts }: {
  open: boolean;
  trade?: Trade | null;
  onClose: ()=>void;
  onSave: (draft: TradeDraft, id?: string)=>Promise<void>;
  onUpload: (file: File)=>Promise<string>;
  accounts: TradingAccount[];
}) {
  const [form, setForm] = useState<TradeDraft>(makeEmpty());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if (trade) {
      const {id,user_id,created_at,updated_at,...draft}=trade;
      setForm(draft);
    } else setForm(makeEmpty());
    setError(null);
  }, [trade, open]);

  if (!open) return null;
  const set = <K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) => setForm(v=>({...v,[key]:value}));
  const num = (value:string) => value === "" ? null : Number(value);

  async function upload(file?:File){
    if(!file) return;
    if(file.size > 8 * 1024 * 1024){ setError("Screenshot must be under 8MB."); return; }
    setUploading(true); setError(null);
    try { set("screenshot_url", await onUpload(file)); }
    catch(e){ setError(e instanceof Error ? e.message : "Could not upload screenshot."); }
    finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent){
    e.preventDefault(); setSaving(true); setError(null);
    try{ await onSave(form, trade?.id); onClose(); }
    catch(e){ setError(e instanceof Error ? e.message : "Could not save trade."); }
    finally{ setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget) onClose()}}>
    <section className="trade-sheet">
      <div className="sheet-grabber"/>
      <div className="modal-head"><div><p className="eyebrow">Trade journal</p><h2>{trade ? "Edit trade" : "Journal a trade"}</h2><p>Capture the numbers, setup and psychology while it is fresh.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X/></button></div>
      <form onSubmit={submit}>
        <button type="button" className={`upload-zone ${form.screenshot_url?"has-image":""}`} onClick={()=>fileRef.current?.click()}>
          {form.screenshot_url ? <img src={form.screenshot_url} alt="Trade chart"/> : <><span className="upload-icon"><ImagePlus/></span><strong>Add chart screenshot</strong><small>Choose from Photos, Files or drag it here</small></>}
          {uploading && <span className="uploading-overlay">Uploading…</span>}
        </button>
        <input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/>
        {form.screenshot_url && <button type="button" className="change-image" onClick={()=>fileRef.current?.click()}><Camera size={16}/>Change screenshot</button>}

        <div className="form-section"><h3>Trade</h3><div className="trade-form-grid">
          <label>Instrument<input value={form.instrument} onChange={e=>set("instrument",e.target.value.toUpperCase())} required/></label>
          <label>Account<select value={form.account_id ?? ""} onChange={e=>{const id=e.target.value||null;set("account_id",id);set("account",accounts.find(a=>a.id===id)?.name||"Personal")}}><option value="">Unassigned / Personal</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Date<input type="date" value={form.trade_date} onChange={e=>set("trade_date",e.target.value)} required/></label>
          <label>Direction<select value={form.direction} onChange={e=>set("direction",e.target.value as TradeDraft["direction"])}><option value="long">Long</option><option value="short">Short</option></select></label>
          <label>Result<select value={form.result} onChange={e=>set("result",e.target.value as TradeDraft["result"])}><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></label>
          <label>Session<select value={form.session} onChange={e=>set("session",e.target.value)}><option>London</option><option>New York</option><option>Asia</option><option>Other</option></select></label>
          <label>Timeframe<input value={form.timeframe} onChange={e=>set("timeframe",e.target.value)} placeholder="5m"/></label>
          <label>Setup<input value={form.setup} onChange={e=>set("setup",e.target.value)} placeholder="Liquidity sweep + FVG"/></label>
        </div></div>

        <div className="form-section"><h3>Execution</h3><div className="trade-form-grid">
          <label>Entry<input type="number" step="any" value={form.entry_price ?? ""} onChange={e=>set("entry_price",num(e.target.value))}/></label>
          <label>Stop loss<input type="number" step="any" value={form.stop_loss ?? ""} onChange={e=>set("stop_loss",num(e.target.value))}/></label>
          <label>Take profit<input type="number" step="any" value={form.take_profit ?? ""} onChange={e=>set("take_profit",num(e.target.value))}/></label>
          <label>Exit<input type="number" step="any" value={form.exit_price ?? ""} onChange={e=>set("exit_price",num(e.target.value))}/></label>
          <label>P&amp;L (£)<input type="number" step="0.01" value={form.pnl} onChange={e=>set("pnl",Number(e.target.value))}/></label>
          <label>R result<input type="number" step="0.1" value={form.r_multiple} onChange={e=>set("r_multiple",Number(e.target.value))}/></label>
          <label>Risked (£)<input type="number" step="0.01" value={form.risk_amount} onChange={e=>set("risk_amount",Number(e.target.value))}/></label>
          <label>Emotion<select value={form.emotion} onChange={e=>set("emotion",e.target.value)}><option>Calm</option><option>Focused</option><option>Confident</option><option>Hesitant</option><option>FOMO</option><option>Frustrated</option><option>Tired</option><option>Overconfident</option></select></label>
        </div></div>

        <div className="form-section"><h3>Review</h3><label className="plan-check"><input type="checkbox" checked={form.followed_plan} onChange={e=>set("followed_plan",e.target.checked)}/><span><strong>Followed my trading plan</strong><small>Mark this honestly—the dashboard compares disciplined and undisciplined trades.</small></span></label><label>Notes<textarea rows={5} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="What went well? What did you do wrong? What will you repeat next time?"/></label></div>
        {error&&<div className="notice error">{error}</div>}
        <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving||uploading}>{saving?"Saving…":"Save trade"}</button></div>
      </form>
    </section>
  </div>;
}
