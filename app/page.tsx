"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, BookOpen, CalendarDays, LogOut, Moon, Plus, Settings, Sun, Trash2, Pencil, Waves } from "lucide-react";
import { AuthScreen } from "@/components/AuthScreen";
import { TradeModal } from "@/components/TradeModal";
import { getSupabase } from "@/lib/supabase";
import type { Trade, TradeDraft } from "@/lib/types";

type View = "dashboard" | "journal" | "settings";

export default function Home(){
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(true);
  const [trades,setTrades]=useState<Trade[]>([]);
  const [view,setView]=useState<View>("dashboard");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Trade|null>(null);
  const [theme,setTheme]=useState<"light"|"dark">("light");
  const [from,setFrom]=useState(()=>new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10));
  const [to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    const saved=(localStorage.getItem("tradesea-theme") as "light"|"dark"|null) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light");
    setTheme(saved); document.documentElement.dataset.theme=saved;
    let unsub=()=>{};
    try{
      const supabase=getSupabase();
      supabase.auth.getSession().then(({data})=>{setSession(data.session); setLoading(false)}).catch(e=>{setError(e.message);setLoading(false)});
      const {data}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s)); unsub=()=>data.subscription.unsubscribe();
    }catch(e){setError(e instanceof Error?e.message:"Supabase configuration error"); setLoading(false)}
    return unsub;
  },[]);

  const loadTrades=useCallback(async()=>{
    if(!session) return;
    const {data,error}=await getSupabase().from("trades").select("*").order("trade_date",{ascending:false}).order("created_at",{ascending:false});
    if(error) setError(error.message); else setTrades((data||[]) as Trade[]);
  },[session]);

  useEffect(()=>{ if(session) loadTrades(); else setTrades([]); },[session,loadTrades]);
  useEffect(()=>{ if(!session)return; const channel=getSupabase().channel("trades-live").on("postgres_changes",{event:"*",schema:"public",table:"trades",filter:`user_id=eq.${session.user.id}`},()=>loadTrades()).subscribe(); return()=>{getSupabase().removeChannel(channel)} },[session,loadTrades]);

  const filtered=useMemo(()=>trades.filter(t=>t.trade_date>=from&&t.trade_date<=to),[trades,from,to]);
  const stats=useMemo(()=>{
    const wins=filtered.filter(t=>t.result==="win").length, losses=filtered.filter(t=>t.result==="loss").length;
    return { pnl: filtered.reduce((s,t)=>s+Number(t.pnl),0), r: filtered.reduce((s,t)=>s+Number(t.r_multiple),0), wins, losses, total:filtered.length, winRate:filtered.length?Math.round(wins/filtered.length*100):0, adherence:filtered.length?Math.round(filtered.filter(t=>t.followed_plan).length/filtered.length*100):0 };
  },[filtered]);

  async function saveTrade(draft:TradeDraft,id?:string){
    if(!session) return;
    const payload={...draft,user_id:session.user.id};
    const query=id?getSupabase().from("trades").update(payload).eq("id",id):getSupabase().from("trades").insert(payload);
    const {error}=await query; if(error) throw error; await loadTrades();
  }
  async function removeTrade(id:string){ if(!confirm("Delete this trade permanently?"))return; const {error}=await getSupabase().from("trades").delete().eq("id",id); if(error)setError(error.message); else loadTrades(); }
  function toggleTheme(){const n=theme==="light"?"dark":"light";setTheme(n);localStorage.setItem("tradesea-theme",n);document.documentElement.dataset.theme=n}

  if(loading) return <div className="center-screen">Loading TradeSea…</div>;
  if(!session) return <><AuthScreen/>{error&&<div className="global-error">{error}</div>}</>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark small"><Waves size={20}/></span><strong>TradeSea</strong></div>
      <nav>
        <button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}><BarChart3/>Dashboard</button>
        <button className={view==="journal"?"active":""} onClick={()=>setView("journal")}><BookOpen/>Journal</button>
        <button className={view==="settings"?"active":""} onClick={()=>setView("settings")}><Settings/>Settings</button>
      </nav>
      <div className="sidebar-bottom"><button onClick={toggleTheme}>{theme==="light"?<Moon/>:<Sun/>}{theme==="light"?"Dark mode":"Light mode"}</button><button onClick={()=>getSupabase().auth.signOut()}><LogOut/>Sign out</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">Private journal</p><h1>{view==="dashboard"?"Dashboard":view==="journal"?"Trade journal":"Settings"}</h1></div><button className="primary" onClick={()=>{setEditing(null);setModal(true)}}><Plus size={18}/>Journal trade</button></header>
      {error&&<div className="notice error">{error}<button className="link-button" onClick={()=>setError(null)}>Dismiss</button></div>}
      {view==="dashboard"&&<>
        <section className="date-card"><div><CalendarDays size={18}/><span>Performance period</span></div><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></section>
        <section className="metric-grid"><article><span>Net P&amp;L</span><strong className={stats.pnl>=0?"positive":"negative"}>{stats.pnl>=0?"+":""}£{stats.pnl.toFixed(2)}</strong></article><article><span>Total R</span><strong>{stats.r>=0?"+":""}{stats.r.toFixed(1)}R</strong></article><article><span>Win rate</span><strong>{stats.winRate}%</strong></article><article><span>Plan adherence</span><strong>{stats.adherence}%</strong></article></section>
        <section className="dashboard-grid"><article className="panel hero-panel"><div><p className="eyebrow">Overview</p><h2>{stats.total} trades in this period</h2><p className="muted">{stats.wins} winners · {stats.losses} losses · {stats.total-stats.wins-stats.losses} breakeven</p></div><div className="win-wheel" style={{"--win":`${stats.winRate*3.6}deg`} as React.CSSProperties}><span>{stats.winRate}%<small>win rate</small></span></div></article><article className="panel"><h2>Recent trades</h2>{filtered.length===0?<p className="empty">No trades in this period.</p>:filtered.slice(0,5).map(t=><TradeRow key={t.id} trade={t} onEdit={()=>{setEditing(t);setModal(true)}} onDelete={()=>removeTrade(t.id)}/>)}</article></section>
      </>}
      {view==="journal"&&<section className="journal-list">{trades.length===0?<div className="panel empty-state"><BookOpen size={36}/><h2>Your journal is empty</h2><p>Add your first trade to start building your performance history.</p><button className="primary" onClick={()=>setModal(true)}><Plus/>Add trade</button></div>:trades.map(t=><TradeCard key={t.id} trade={t} onEdit={()=>{setEditing(t);setModal(true)}} onDelete={()=>removeTrade(t.id)}/>)}</section>}
      {view==="settings"&&<section className="settings-grid"><article className="panel"><h2>Account</h2><p className="muted">Signed in as</p><strong>{session.user.email}</strong><button className="secondary" onClick={()=>getSupabase().auth.signOut()}><LogOut size={17}/>Sign out</button></article><article className="panel"><h2>Appearance</h2><p className="muted">Use TradeSea in light or dark mode.</p><button className="secondary" onClick={toggleTheme}>{theme==="light"?<Moon/>:<Sun/>}Switch to {theme==="light"?"dark":"light"}</button></article></section>}
    </main>
    <nav className="mobile-nav"><button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}><BarChart3/><span>Dashboard</span></button><button className={view==="journal"?"active":""} onClick={()=>setView("journal")}><BookOpen/><span>Journal</span></button><button className="fab" onClick={()=>{setEditing(null);setModal(true)}}><Plus/></button><button className={view==="settings"?"active":""} onClick={()=>setView("settings")}><Settings/><span>Settings</span></button><button onClick={toggleTheme}>{theme==="light"?<Moon/>:<Sun/>}<span>Theme</span></button></nav>
    <TradeModal open={modal} trade={editing} onClose={()=>{setModal(false);setEditing(null)}} onSave={saveTrade}/>
  </div>
}

function TradeRow({trade,onEdit,onDelete}:{trade:Trade;onEdit:()=>void;onDelete:()=>void}){return <div className="trade-row"><div><strong>{trade.instrument}</strong><span>{trade.trade_date} · {trade.session}</span></div><span className={`pill ${trade.result}`}>{trade.result}</span><strong className={trade.pnl>=0?"positive":"negative"}>{trade.pnl>=0?"+":""}£{Number(trade.pnl).toFixed(2)}</strong><button className="icon-btn" onClick={onEdit}><Pencil size={16}/></button><button className="icon-btn danger" onClick={onDelete}><Trash2 size={16}/></button></div>}
function TradeCard({trade,onEdit,onDelete}:{trade:Trade;onEdit:()=>void;onDelete:()=>void}){return <article className="trade-card"><div className="trade-card-top"><div><p className="eyebrow">{trade.trade_date} · {trade.session}</p><h2>{trade.instrument} <span className="direction">{trade.direction}</span></h2></div><span className={`pill ${trade.result}`}>{trade.result}</span></div><div className="trade-stats"><div><span>P&amp;L</span><strong className={trade.pnl>=0?"positive":"negative"}>{trade.pnl>=0?"+":""}£{Number(trade.pnl).toFixed(2)}</strong></div><div><span>Result</span><strong>{Number(trade.r_multiple).toFixed(1)}R</strong></div><div><span>Plan</span><strong>{trade.followed_plan?"Followed":"Broken"}</strong></div></div>{trade.setup&&<p><strong>Setup:</strong> {trade.setup}</p>}{trade.notes&&<p className="muted">{trade.notes}</p>}<div className="card-actions"><button className="secondary" onClick={onEdit}><Pencil size={16}/>Edit</button><button className="secondary danger" onClick={onDelete}><Trash2 size={16}/>Delete</button></div></article>}
