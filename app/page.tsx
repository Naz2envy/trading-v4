"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BarChart3, BookOpen, CalendarDays, ChevronRight, GripVertical, LayoutDashboard,
  LogOut, Moon, Pencil, Plus, Search, Settings, SlidersHorizontal, Sun, Trash2,
  TrendingUp, Trophy, Upload, Waves, X
} from "lucide-react";
import { AuthScreen } from "@/components/AuthScreen";
import { TradeModal } from "@/components/TradeModal";
import { getSupabase } from "@/lib/supabase";
import type { Trade, TradeDraft } from "@/lib/types";

type View = "dashboard" | "journal" | "analytics" | "settings";
type TileId = "metrics"|"equity"|"winloss"|"direction"|"setups"|"sessions"|"recent"|"discipline";
type TileSize = "small"|"medium"|"wide";
type Tile = {id:TileId; size:TileSize};

const defaultTiles:Tile[] = [
  {id:"metrics",size:"wide"},{id:"equity",size:"medium"},{id:"winloss",size:"small"},
  {id:"direction",size:"small"},{id:"setups",size:"medium"},{id:"recent",size:"medium"},
];
const tileMeta:Record<TileId,{name:string;description:string}> = {
  metrics:{name:"Key metrics",description:"P&L, total R, win rate and discipline."},
  equity:{name:"Performance curve",description:"Cumulative P&L across the selected period."},
  winloss:{name:"Win / loss wheel",description:"Compact outcome breakdown."},
  direction:{name:"Long / short wheel",description:"Trade direction distribution."},
  setups:{name:"Setup performance",description:"Your highest-performing setups."},
  sessions:{name:"Session performance",description:"London, New York and Asia results."},
  recent:{name:"Recent trades",description:"Your latest journal entries."},
  discipline:{name:"Plan discipline",description:"Followed-plan versus rule-breaking results."},
};

export default function Home(){
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(true);
  const [trades,setTrades]=useState<Trade[]>([]);
  const [view,setView]=useState<View>("dashboard");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Trade|null>(null);
  const [theme,setTheme]=useState<"light"|"dark">("light");
  const [range,setRange]=useState("30d");
  const [from,setFrom]=useState(()=>new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10));
  const [to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
  const [search,setSearch]=useState("");
  const [resultFilter,setResultFilter]=useState("all");
  const [selected,setSelected]=useState<Trade|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [tiles,setTiles]=useState<Tile[]>(defaultTiles);
  const [picker,setPicker]=useState(false);
  const [arranging,setArranging]=useState(false);
  const [dragged,setDragged]=useState<TileId|null>(null);

  useEffect(()=>{
    const savedTheme=(localStorage.getItem("tradesea-theme") as "light"|"dark"|null) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light");
    setTheme(savedTheme); document.documentElement.dataset.theme=savedTheme;
    const savedTiles=localStorage.getItem("tradesea-dashboard-v4");
    if(savedTiles){try{setTiles(JSON.parse(savedTiles))}catch{}}
    let unsub=()=>{};
    try{
      const supabase=getSupabase();
      supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}).catch(e=>{setError(e.message);setLoading(false)});
      const {data}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s)); unsub=()=>data.subscription.unsubscribe();
    }catch(e){setError(e instanceof Error?e.message:"Supabase configuration error");setLoading(false)}
    return unsub;
  },[]);
  useEffect(()=>localStorage.setItem("tradesea-dashboard-v4",JSON.stringify(tiles)),[tiles]);

  const loadTrades=useCallback(async()=>{
    if(!session)return;
    const {data,error}=await getSupabase().from("trades").select("*").order("trade_date",{ascending:false}).order("created_at",{ascending:false});
    if(error)setError(error.message); else setTrades((data||[]) as Trade[]);
  },[session]);
  useEffect(()=>{if(session)loadTrades();else setTrades([])},[session,loadTrades]);
  useEffect(()=>{if(!session)return;const channel=getSupabase().channel(`trades-${session.user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"trades",filter:`user_id=eq.${session.user.id}`},()=>loadTrades()).subscribe();return()=>{getSupabase().removeChannel(channel)}},[session,loadTrades]);

  function setPreset(value:string){
    setRange(value); const now=new Date(); let start=new Date(now);
    if(value==="7d")start.setDate(now.getDate()-7); else if(value==="30d")start.setDate(now.getDate()-30); else if(value==="90d")start.setDate(now.getDate()-90); else if(value==="ytd")start=new Date(now.getFullYear(),0,1); else if(value==="all")start=new Date("2020-01-01");
    if(value!=="custom"){setFrom(start.toISOString().slice(0,10));setTo(now.toISOString().slice(0,10));}
  }
  const filtered=useMemo(()=>trades.filter(t=>t.trade_date>=from&&t.trade_date<=to),[trades,from,to]);
  const journalTrades=useMemo(()=>trades.filter(t=>{
    const q=search.toLowerCase(); const match=!q||[t.instrument,t.account,t.setup,t.session,t.emotion,t.notes].some(v=>(v||"").toLowerCase().includes(q));
    return match&&(resultFilter==="all"||t.result===resultFilter);
  }),[trades,search,resultFilter]);
  const stats=useMemo(()=>calculateStats(filtered),[filtered]);

  async function uploadScreenshot(file:File){
    if(!session)throw new Error("Sign in first.");
    const ext=file.name.split(".").pop()||"jpg"; const path=`${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await getSupabase().storage.from("trade-screenshots").upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;
    return getSupabase().storage.from("trade-screenshots").getPublicUrl(path).data.publicUrl;
  }
  async function saveTrade(draft:TradeDraft,id?:string){
    if(!session)return;
    const payload={...draft,user_id:session.user.id,updated_at:new Date().toISOString()};
    const {error}=id?await getSupabase().from("trades").update(payload).eq("id",id):await getSupabase().from("trades").insert(payload);
    if(error)throw error;await loadTrades();
  }
  async function removeTrade(id:string){if(!confirm("Delete this trade permanently?"))return;const {error}=await getSupabase().from("trades").delete().eq("id",id);if(error)setError(error.message);else{setSelected(null);loadTrades()}}
  function openNew(){setEditing(null);setModal(true)}
  function openEdit(t:Trade){setEditing(t);setModal(true);setSelected(null)}
  function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);localStorage.setItem("tradesea-theme",next);document.documentElement.dataset.theme=next}
  function moveTile(target:TileId){if(!dragged||dragged===target)return;setTiles(items=>{const next=[...items],fromIndex=next.findIndex(t=>t.id===dragged),toIndex=next.findIndex(t=>t.id===target);const [item]=next.splice(fromIndex,1);next.splice(toIndex,0,item);return next});setDragged(null)}
  function setTileSize(id:TileId,size:TileSize){setTiles(items=>items.map(t=>t.id===id?{...t,size}:t))}
  function toggleTile(id:TileId){setTiles(items=>items.some(t=>t.id===id)?items.filter(t=>t.id!==id):[...items,{id,size:id==="equity"||id==="recent"||id==="setups"?"medium":"small"}])}

  if(loading)return <div className="center-screen">Loading TradeSea…</div>;
  if(!session)return <><AuthScreen/>{error&&<div className="global-error">{error}</div>}</>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark small"><Waves size={20}/></span><strong>TradeSea</strong></div>
      <button className="primary sidebar-add" onClick={openNew}><Plus/>Journal trade</button>
      <nav>
        <NavButton active={view==="dashboard"} onClick={()=>setView("dashboard")} icon={<LayoutDashboard/>} label="Dashboard"/>
        <NavButton active={view==="journal"} onClick={()=>setView("journal")} icon={<BookOpen/>} label="Journal"/>
        <NavButton active={view==="analytics"} onClick={()=>setView("analytics")} icon={<BarChart3/>} label="Analytics"/>
        <NavButton active={view==="settings"} onClick={()=>setView("settings")} icon={<Settings/>} label="Settings"/>
      </nav>
      <div className="sidebar-bottom"><button onClick={toggleTheme}>{theme==="light"?<Moon/>:<Sun/>}{theme==="light"?"Dark mode":"Light mode"}</button><button onClick={()=>getSupabase().auth.signOut()}><LogOut/>Sign out</button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">Private trading journal</p><h1>{view==="dashboard"?"Dashboard":view==="journal"?"Journal":view==="analytics"?"Analytics":"Settings"}</h1><p>{view==="dashboard"?"See the habits behind your performance.":view==="journal"?"Every trade, chart and lesson in one place.":view==="analytics"?"Understand your edge without the noise.":"Manage your account and preferences."}</p></div><button className="primary top-add" onClick={openNew}><Plus/>Journal trade</button></header>
      {error&&<div className="notice error">{error}<button className="link-button" onClick={()=>setError(null)}>Dismiss</button></div>}

      {view==="dashboard"&&<>
        <section className="dashboard-toolbar">
          <div className="range-tabs">{[["7d","7D"],["30d","30D"],["90d","90D"],["ytd","YTD"],["all","All"],["custom","Custom"]].map(([v,l])=><button key={v} className={range===v?"active":""} onClick={()=>setPreset(v)}>{l}</button>)}</div>
          <button className={`secondary customise-button ${arranging?"active":""}`} onClick={()=>setPicker(true)}><SlidersHorizontal size={17}/>Customise</button>
        </section>
        {range==="custom"&&<section className="custom-range"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><span>to</span><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></section>}
        {arranging&&<div className="edit-banner"><span><GripVertical/>Drag tiles to reorder. Change their size from each tile.</span><button onClick={()=>setArranging(false)}>Done</button></div>}
        <section className="dashboard-grid">{tiles.map(tile=><div key={tile.id} draggable={arranging} onDragStart={()=>setDragged(tile.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>moveTile(tile.id)} className={`tile-shell tile-${tile.size} ${arranging?"editing":""}`}>
          {arranging&&<div className="tile-edit"><span><GripVertical/>Move</span><div>{(["small","medium","wide"] as TileSize[]).map(size=><button key={size} className={tile.size===size?"active":""} onClick={()=>setTileSize(tile.id,size)}>{size[0].toUpperCase()}</button>)}</div></div>}
          <DashboardTile id={tile.id} stats={stats} trades={filtered} onSelect={setSelected}/>
        </div>)}</section>
      </>}

      {view==="journal"&&<>
        <section className="journal-toolbar"><div className="search-box"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search instrument, setup, session or notes"/></div><select value={resultFilter} onChange={e=>setResultFilter(e.target.value)}><option value="all">All results</option><option value="win">Wins</option><option value="loss">Losses</option><option value="breakeven">Breakeven</option></select></section>
        {journalTrades.length===0?<EmptyJournal onAdd={openNew}/>:<section className="trade-gallery">{journalTrades.map(t=><TradeCard key={t.id} trade={t} onClick={()=>setSelected(t)} onEdit={()=>openEdit(t)} onDelete={()=>removeTrade(t.id)}/>)}</section>}
      </>}

      {view==="analytics"&&<Analytics trades={filtered} stats={stats}/>} 
      {view==="settings"&&<section className="settings-grid"><article className="panel"><h2>Account</h2><p className="muted">Your journal is synced through Supabase.</p><strong>{session.user.email}</strong><button className="secondary" onClick={()=>getSupabase().auth.signOut()}><LogOut/>Sign out</button></article><article className="panel"><h2>Appearance</h2><p className="muted">Switch between TradeSea’s light and dark themes.</p><button className="secondary" onClick={toggleTheme}>{theme==="light"?<Moon/>:<Sun/>}Use {theme==="light"?"dark":"light"} mode</button></article><article className="panel"><h2>Data</h2><p className="muted">Trades and screenshots are stored in your Supabase project and sync across devices.</p><div className="settings-stat"><span>Total journal entries</span><strong>{trades.length}</strong></div></article></section>}
    </main>

    <nav className="mobile-nav"><NavButton active={view==="dashboard"} onClick={()=>setView("dashboard")} icon={<LayoutDashboard/>} label="Home"/><NavButton active={view==="journal"} onClick={()=>setView("journal")} icon={<BookOpen/>} label="Journal"/><button className="mobile-add" onClick={openNew}><Plus/></button><NavButton active={view==="analytics"} onClick={()=>setView("analytics")} icon={<BarChart3/>} label="Analytics"/><NavButton active={view==="settings"} onClick={()=>setView("settings")} icon={<Settings/>} label="Settings"/></nav>
    <TradeModal open={modal} trade={editing} onClose={()=>{setModal(false);setEditing(null)}} onSave={saveTrade} onUpload={uploadScreenshot}/>
    {selected&&<TradeDetail trade={selected} onClose={()=>setSelected(null)} onEdit={()=>openEdit(selected)} onDelete={()=>removeTrade(selected.id)}/>} 
    {picker&&<WidgetPicker tiles={tiles} onToggle={toggleTile} onSize={setTileSize} onClose={()=>setPicker(false)} onArrange={()=>{setPicker(false);setArranging(true)}} onReset={()=>setTiles(defaultTiles)}/>} 
  </div>;
}

function NavButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:React.ReactNode;label:string}){return <button className={active?"active":""} onClick={onClick}>{icon}<span>{label}</span></button>}
function calculateStats(trades:Trade[]){
  const wins=trades.filter(t=>t.result==="win"),losses=trades.filter(t=>t.result==="loss"),bes=trades.filter(t=>t.result==="breakeven");
  const pnl=trades.reduce((s,t)=>s+Number(t.pnl||0),0),r=trades.reduce((s,t)=>s+Number(t.r_multiple||0),0);
  const grossWin=wins.reduce((s,t)=>s+Math.max(0,Number(t.pnl)),0),grossLoss=Math.abs(losses.reduce((s,t)=>s+Math.min(0,Number(t.pnl)),0));
  return {total:trades.length,wins:wins.length,losses:losses.length,bes:bes.length,pnl,r,winRate:trades.length?Math.round(wins.length/trades.length*100):0,avgR:trades.length?r/trades.length:0,profitFactor:grossLoss?grossWin/grossLoss:grossWin?grossWin:0,adherence:trades.length?Math.round(trades.filter(t=>t.followed_plan).length/trades.length*100):0};
}
function DashboardTile({id,stats,trades,onSelect}:{id:TileId;stats:ReturnType<typeof calculateStats>;trades:Trade[];onSelect:(t:Trade)=>void}){
  if(id==="metrics")return <section className="metric-strip"><Metric label="Net P&L" value={`${stats.pnl>=0?"+":""}£${stats.pnl.toFixed(2)}`} tone={stats.pnl>=0?"positive":"negative"}/><Metric label="Total R" value={`${stats.r>=0?"+":""}${stats.r.toFixed(1)}R`}/><Metric label="Win rate" value={`${stats.winRate}%`}/><Metric label="Plan adherence" value={`${stats.adherence}%`}/></section>;
  if(id==="winloss")return <DonutCard title="Win / loss" subtitle={`${stats.total} trades`} slices={[stats.wins,stats.losses,stats.bes]} labels={["Wins","Losses","BE"]} center={`${stats.winRate}%`}/>;
  if(id==="direction"){const longs=trades.filter(t=>t.direction==="long").length;return <DonutCard title="Long / short" subtitle={`${trades.length} trades`} slices={[longs,trades.length-longs]} labels={["Long","Short"]} center={trades.length?`${Math.round(longs/trades.length*100)}%`:"0%"}/>}
  if(id==="equity")return <article className="panel"><div className="card-title"><div><p className="eyebrow">Performance</p><h2>Equity curve</h2></div><span>{stats.pnl>=0?"+":""}£{stats.pnl.toFixed(2)}</span></div><EquityChart trades={trades}/></article>;
  if(id==="recent")return <article className="panel"><div className="card-title"><h2>Recent trades</h2><span>{trades.length}</span></div><div className="compact-trades">{trades.length?trades.slice(0,5).map(t=><button key={t.id} onClick={()=>onSelect(t)}><span className="mini-symbol">{t.instrument.slice(0,2)}</span><span><b>{t.instrument}</b><small>{t.trade_date} · {t.session}</small></span><strong className={t.pnl>=0?"positive":"negative"}>{t.pnl>=0?"+":""}£{Number(t.pnl).toFixed(0)}</strong><ChevronRight/></button>):<p className="empty">No trades in this period.</p>}</div></article>;
  if(id==="setups")return <RankCard title="Setup performance" groups={groupPerformance(trades,"setup")}/>;
  if(id==="sessions")return <RankCard title="Session performance" groups={groupPerformance(trades,"session")}/>;
  const followed=trades.filter(t=>t.followed_plan),broken=trades.filter(t=>!t.followed_plan);return <article className="panel discipline-card"><div className="card-title"><h2>Plan discipline</h2><span>{stats.adherence}% followed</span></div><div className="compare"><div><span>Followed plan</span><strong className="positive">{followed.reduce((s,t)=>s+t.pnl,0)>=0?"+":""}£{followed.reduce((s,t)=>s+t.pnl,0).toFixed(0)}</strong><small>{followed.length} trades</small></div><div><span>Broke plan</span><strong className="negative">{broken.reduce((s,t)=>s+t.pnl,0)>=0?"+":""}£{broken.reduce((s,t)=>s+t.pnl,0).toFixed(0)}</strong><small>{broken.length} trades</small></div></div></article>;
}
function Metric({label,value,tone}:{label:string;value:string;tone?:string}){return <article><span>{label}</span><strong className={tone||""}>{value}</strong></article>}
function DonutCard({title,subtitle,slices,labels,center}:{title:string;subtitle:string;slices:number[];labels:string[];center:string}){const total=slices.reduce((a,b)=>a+b,0)||1;let start=0;const colors=["var(--green)","var(--red)","var(--muted)"];const gradient=slices.map((v,i)=>{const a=start;start+=v/total*100;return `${colors[i]} ${a}% ${start}%`}).join(",");return <article className="panel donut-card"><div className="card-title"><h2>{title}</h2><span>{subtitle}</span></div><div className="donut" style={{background:`conic-gradient(${gradient||"var(--soft) 0 100%"})`}}><div><strong>{center}</strong><small>{title}</small></div></div><div className="legend">{labels.map((l,i)=><span key={l}><i style={{background:colors[i]}}/>{l} <b>{slices[i]||0}</b></span>)}</div></article>}
function EquityChart({trades}:{trades:Trade[]}){const ordered=[...trades].sort((a,b)=>a.trade_date.localeCompare(b.trade_date));let total=0;const values=ordered.map(t=>(total+=Number(t.pnl)));if(!values.length)return <div className="chart-empty"><TrendingUp/><span>Your curve appears after your first trade.</span></div>;const min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;const points=values.map((v,i)=>`${(i/(Math.max(1,values.length-1)))*100},${88-((v-min)/range)*76}`).join(" ");return <div className="equity-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".28"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#area)"/><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div>}
function groupPerformance(trades:Trade[],key:"setup"|"session"){const map=new Map<string,{count:number,pnl:number,wins:number}>();trades.forEach(t=>{const name=(t[key]||"Uncategorised").trim()||"Uncategorised";const g=map.get(name)||{count:0,pnl:0,wins:0};g.count++;g.pnl+=Number(t.pnl);if(t.result==="win")g.wins++;map.set(name,g)});return [...map.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.pnl-a.pnl).slice(0,5)}
function RankCard({title,groups}:{title:string;groups:ReturnType<typeof groupPerformance>}){return <article className="panel"><div className="card-title"><h2>{title}</h2><span>By P&L</span></div><div className="rank-list">{groups.length?groups.map((g,i)=><div key={g.name}><span className="rank">{i+1}</span><span><b>{g.name}</b><small>{g.count} trades · {g.count?Math.round(g.wins/g.count*100):0}% win</small></span><strong className={g.pnl>=0?"positive":"negative"}>{g.pnl>=0?"+":""}£{g.pnl.toFixed(0)}</strong></div>):<p className="empty">No data yet.</p>}</div></article>}
function TradeCard({trade,onClick,onEdit,onDelete}:{trade:Trade;onClick:()=>void;onEdit:()=>void;onDelete:()=>void}){return <article className="trade-card" onClick={onClick}>{trade.screenshot_url?<img src={trade.screenshot_url} alt={`${trade.instrument} chart`}/>:<div className="chart-placeholder"><TrendingUp/></div>}<div className="trade-card-body"><div className="trade-card-top"><div><p>{trade.trade_date} · {trade.session}</p><h2>{trade.instrument}<span className={`direction ${trade.direction}`}>{trade.direction}</span></h2></div><span className={`result-pill ${trade.result}`}>{trade.result}</span></div><div className="trade-card-values"><span><small>P&L</small><b className={trade.pnl>=0?"positive":"negative"}>{trade.pnl>=0?"+":""}£{Number(trade.pnl).toFixed(2)}</b></span><span><small>Result</small><b>{Number(trade.r_multiple).toFixed(1)}R</b></span><span><small>Plan</small><b>{trade.followed_plan?"Followed":"Broken"}</b></span></div><div className="tag-row">{[trade.setup,trade.timeframe,trade.emotion].filter(Boolean).map(v=><span key={v}>{v}</span>)}</div><div className="card-actions"><button onClick={e=>{e.stopPropagation();onEdit()}}><Pencil/>Edit</button><button className="danger" onClick={e=>{e.stopPropagation();onDelete()}}><Trash2/>Delete</button></div></div></article>}
function EmptyJournal({onAdd}:{onAdd:()=>void}){return <section className="panel empty-journal"><span><BookOpen/></span><h2>Your journal is ready</h2><p>Add your first trade with a screenshot, setup, result and notes.</p><button className="primary" onClick={onAdd}><Plus/>Journal trade</button></section>}
function Analytics({trades,stats}:{trades:Trade[];stats:ReturnType<typeof calculateStats>}){return <section className="analytics-grid"><article className="panel analytics-hero"><p className="eyebrow">Performance summary</p><h2>{stats.pnl>=0?"You are profitable in this period.":"This period needs review."}</h2><p className="muted">{stats.total} trades · {stats.winRate}% win rate · {stats.avgR.toFixed(2)}R average</p><div className="analytics-metrics"><Metric label="Profit factor" value={stats.profitFactor.toFixed(2)}/><Metric label="Average R" value={`${stats.avgR.toFixed(2)}R`}/><Metric label="Plan adherence" value={`${stats.adherence}%`}/></div></article><RankCard title="Best setups" groups={groupPerformance(trades,"setup")}/><RankCard title="Best sessions" groups={groupPerformance(trades,"session")}/><article className="panel"><div className="card-title"><h2>Outcome breakdown</h2><span>{stats.total} trades</span></div><div className="outcome-bars">{[["Wins",stats.wins,"positive"],["Losses",stats.losses,"negative"],["Breakeven",stats.bes,""]].map(([l,v,c])=><div key={String(l)}><span>{l}</span><div><i className={String(c)} style={{width:`${stats.total?Number(v)/stats.total*100:0}%`}}/></div><b>{v}</b></div>)}</div></article></section>}
function TradeDetail({trade,onClose,onEdit,onDelete}:{trade:Trade;onClose:()=>void;onEdit:()=>void;onDelete:()=>void}){return <div className="detail-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><article className="trade-detail"><button className="icon-btn detail-close" onClick={onClose}><X/></button>{trade.screenshot_url?<img className="detail-chart" src={trade.screenshot_url} alt="Trade chart"/>:<div className="detail-chart placeholder"><TrendingUp/></div>}<div className="detail-content"><p className="eyebrow">{trade.trade_date} · {trade.account}</p><div className="detail-title"><h2>{trade.instrument}</h2><span className={`result-pill ${trade.result}`}>{trade.result}</span></div><div className="detail-stats"><Metric label="P&L" value={`${trade.pnl>=0?"+":""}£${Number(trade.pnl).toFixed(2)}`} tone={trade.pnl>=0?"positive":"negative"}/><Metric label="R result" value={`${Number(trade.r_multiple).toFixed(1)}R`}/><Metric label="Direction" value={trade.direction}/><Metric label="Plan" value={trade.followed_plan?"Followed":"Broken"}/></div><div className="detail-grid"><div><span>Setup</span><strong>{trade.setup||"—"}</strong></div><div><span>Session</span><strong>{trade.session}</strong></div><div><span>Timeframe</span><strong>{trade.timeframe||"—"}</strong></div><div><span>Emotion</span><strong>{trade.emotion||"—"}</strong></div><div><span>Entry</span><strong>{trade.entry_price??"—"}</strong></div><div><span>Stop loss</span><strong>{trade.stop_loss??"—"}</strong></div><div><span>Take profit</span><strong>{trade.take_profit??"—"}</strong></div><div><span>Exit</span><strong>{trade.exit_price??"—"}</strong></div></div>{trade.notes&&<div className="notes-box"><span>Journal notes</span><p>{trade.notes}</p></div>}<div className="detail-actions"><button className="secondary" onClick={onEdit}><Pencil/>Edit</button><button className="secondary danger" onClick={onDelete}><Trash2/>Delete</button></div></div></article></div>}
function WidgetPicker({tiles,onToggle,onSize,onClose,onArrange,onReset}:{tiles:Tile[];onToggle:(id:TileId)=>void;onSize:(id:TileId,size:TileSize)=>void;onClose:()=>void;onArrange:()=>void;onReset:()=>void}){return <div className="modal-backdrop"><section className="widget-picker"><div className="modal-head"><div><p className="eyebrow">Dashboard widgets</p><h2>Make it yours</h2><p>Add only the information you care about.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="widget-gallery">{(Object.keys(tileMeta) as TileId[]).map(id=>{const tile=tiles.find(t=>t.id===id);return <article className={`widget-choice ${tile?"selected":""}`} key={id}><button className="widget-main" onClick={()=>onToggle(id)}><span className="widget-preview"><BarChart3/></span><span><b>{tileMeta[id].name}</b><small>{tileMeta[id].description}</small></span><span className="add-toggle">{tile?"✓":"+"}</span></button>{tile&&<div className="size-choice"><span>Size</span><div>{(["small","medium","wide"] as TileSize[]).map(s=><button key={s} className={tile.size===s?"active":""} onClick={()=>onSize(id,s)}>{s}</button>)}</div></div>}</article>})}</div><div className="widget-actions"><button className="secondary" onClick={onReset}>Reset</button><button className="secondary" onClick={onArrange}><GripVertical/>Arrange</button><button className="primary" onClick={onClose}>Done</button></div></section></div>}
