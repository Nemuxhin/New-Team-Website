import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDoc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken, 
  signOut 
} from 'firebase/auth';
import { 
  Trophy, 
  ShoppingBag, 
  Users, 
  Tv, 
  ChevronRight, 
  ExternalLink, 
  Twitter, 
  Youtube, 
  Instagram,
  Menu,
  X,
  Play,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Lock,
  LogOut,
  Plus,
  Clock,
  Settings,
  ShieldCheck,
  Target,
  Map as MapIcon,
  Sword,
  Trash2,
  Sparkles,
  BrainCircuit,
  History,
  FileText,
  UserPlus,
  BarChart3,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAcZy0oY6fmwJ4Lg9Ac-Bq__eMukMC_u0w",
  authDomain: "syrix-team-schedule.firebaseapp.com",
  projectId: "syrix-team-schedule",
  storageBucket: "syrix-team-schedule.firebasestorage.app",
  messagingSenderId: "571804588891",
  appId: "1:571804588891:web:c3c17a4859b6b4f057187e",
  measurementId: "G-VGXG0NCTGX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'syrix-pro-ops'; 

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAPS = ["Ascent", "Bind", "Breeze", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset", "Abyss"];
const AGENT_NAMES = ["Jett", "Raze", "Reyna", "Yoru", "Phoenix", "Neon", "Iso", "Vyse", "Omen", "Astra", "Brimstone", "Viper", "Harbor", "Clove", "Sova", "Fade", "Skye", "Breach", "KAY/O", "Gekko", "Killjoy", "Cypher", "Sage", "Chamber", "Deadlock"];
const TIMEZONES = ["UTC", "GMT", "Europe/London", "America/New_York", "Asia/Tokyo"];

// --- Gemini API Helper ---
const callGemini = async (prompt, systemInstruction = "You are an elite esports coach for team Syrix. Provide concise, professional, tactical insights.") => {
  const apiKey = ""; // Set your VITE_GEMINI_API_KEY in environment variables for production
  
  // Using public stable model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) return "AI Offline: Check API Key.";
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "No intelligence available.";
  } catch (e) {
    return "Communication breakdown with AI Network.";
  }
};

// --- Context ---
const ToastContext = createContext();
const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[250] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`p-4 rounded-sm border-l-4 shadow-2xl animate-fade-in pointer-events-auto flex items-center gap-3 min-w-[220px] ${
                        t.type === 'success' ? 'bg-zinc-900 border-green-500 text-white' : 'bg-zinc-900 border-red-600 text-white'
                    }`}>
                        <span className="font-black uppercase text-[10px] tracking-widest">{String(t.message || 'Notification')}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// --- Custom Hooks ---
const useValorantData = () => {
    const [agentData, setAgentData] = useState({});
    const [mapImages, setMapImages] = useState({});
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const agentRes = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
                const agentJson = await agentRes.json();
                const aMap = {};
                if (agentJson.data) agentJson.data.forEach(agent => {
                    aMap[agent.displayName] = {
                        icon: agent.displayIcon,
                        abilities: agent.abilities.map(a => ({ name: a.displayName, icon: a.displayIcon, slot: a.slot })).filter(a => a.slot !== "Passive" && a.icon)
                    };
                });
                setAgentData(aMap);
                const mapRes = await fetch('https://valorant-api.com/v1/maps');
                const mapJson = await mapRes.json();
                const mMap = {};
                if(mapJson.data) mapJson.data.forEach(map => {
                    if (map.mainLogAssetGuid !== null && map.assetPath.includes('Maps/')) {
                        mMap[map.displayName] = map.stylizedIcon || map.displayIcon;
                    }
                });
                setMapImages(mMap);
            } catch (e) { console.error("Asset error", e); }
        };
        fetchAssets();
    }, []);
    return { agentData, mapImages };
};

// --- Shared Components ---
const Card = ({ children, title, className = "", action }) => (
    <div className={`bg-[#0a0a0a] border border-zinc-900 p-6 rounded-sm relative group hover:border-zinc-700 transition-all ${className}`}>
        {title && (
            <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">{String(title)}</h3>
                {action}
            </div>
        )}
        {children}
    </div>
);

const Input = (props) => (
    <input {...props} className={`w-full bg-black border border-zinc-800 rounded-sm p-3 text-white text-sm outline-none focus:border-red-600 transition-all placeholder-zinc-700 ${props.className}`} />
);

const Select = (props) => (
    <select {...props} className={`w-full bg-black border border-zinc-800 rounded-sm p-3 text-white text-sm outline-none focus:border-red-600 transition-all ${props.className}`}>
        {props.children}
    </select>
);

const ButtonPrimary = ({ children, onClick, disabled, className = "" }) => (
    <button onClick={onClick} disabled={disabled} className={`bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase italic tracking-tighter py-3 px-6 rounded-sm transition-all active:scale-[0.98] disabled:opacity-50 ${className}`}>
        {children}
    </button>
);

// --- Sub-Modules ---

const AICoach = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const addToast = useToast();

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await callGemini(query, "You are 'S-HUB AI', the elite tactical coach for Team Syrix. Provide expert-level esports analysis.");
      setResponse(res);
      addToast("Intel Received");
    } catch (e) { addToast("Comm Error", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white">AI <span className="text-red-600">COACH</span></h2>
        <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.4em]">Syrix performance network</p>
      </div>
      <Card>
        <form onSubmit={handleAsk} className="space-y-4">
          <textarea 
            value={query} onChange={e => setQuery(e.target.value)}
            className="w-full bg-black border border-zinc-800 p-6 text-zinc-300 font-mono text-sm min-h-[150px] outline-none focus:border-red-600 rounded-sm"
            placeholder="Query tactical database..."
          />
          <div className="flex justify-end">
            <button disabled={loading} type="submit" className="bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase italic tracking-tighter px-8 py-3 transition-all flex items-center gap-3">
              {loading ? <Clock className="animate-spin" size={16}/> : <Sparkles size={16}/>}
              {loading ? "Analysing" : "Consult AI"}
            </button>
          </div>
        </form>
      </Card>
      {response && (
        <Card title="Intelligence Debrief" className="border-red-600/30 animate-slide-in">
          <div className="text-zinc-400 font-medium leading-relaxed italic space-y-4">
            {String(response).split('\n').map((line, i) => line ? <p key={i}>{String(line)}</p> : null)}
          </div>
        </Card>
      )}
    </div>
  );
};

const StratBook = ({ mapImages, agentData }) => {
    const [selectedMap, setSelectedMap] = useState(MAPS[0]);
    const [selectedAgent, setSelectedAgent] = useState(AGENT_NAMES[0]);
    const canvasRef = useRef(null);
    const [drawLines, setDrawLines] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState("#ef4444");
    const [aiInsight, setAiInsight] = useState('');
    const [loadingAi, setLoadingAi] = useState(false);
    const addToast = useToast();

    const getPos = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (1024 / rect.width),
            y: (e.clientY - rect.top) * (1024 / rect.height)
        };
    };

    const getAIInsight = async () => {
        setLoadingAi(true);
        try {
            const res = await callGemini(`Provide one elite-level tactical secret or default setup for the map ${selectedMap} in pro Valorant play.`);
            setAiInsight(res);
            addToast("Insight Generated");
        } catch (e) { addToast("AI Offline", "error"); }
        finally { setLoadingAi(false); }
    };

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 6;
        drawLines.forEach(line => {
            if (!line.points || line.points.length < 1) return;
            ctx.beginPath(); ctx.strokeStyle = line.color;
            ctx.moveTo(line.points[0].x, line.points[0].y);
            line.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
        });
    }, [drawLines]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 h-full animate-fade-in">
            <div className="lg:col-span-3 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Tactical <span className="text-red-600">Planner</span></h2>
                    <div className="flex gap-2 bg-zinc-900/50 p-1 border border-zinc-800">
                        {["#ef4444", "#3b82f6", "#ffffff"].map(c => (
                            <button key={c} onClick={() => setBrushColor(c)} className={`w-6 h-6 rounded-full border-2 ${brushColor === c ? 'border-white' : 'border-transparent'}`} style={{backgroundColor: c}} />
                        ))}
                        <button onClick={() => setDrawLines([])} className="p-1 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                </div>
                <div className="relative bg-zinc-950 aspect-square border border-zinc-900 rounded-sm overflow-hidden shadow-2xl">
                    <img src={mapImages[selectedMap]} className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none" alt="" />
                    <canvas 
                        ref={canvasRef} width={1024} height={1024}
                        onMouseDown={(e) => { setIsDrawing(true); setDrawLines(prev => [...prev, {color: brushColor, points: [getPos(e)]}]); }}
                        onMouseMove={(e) => { if (!isDrawing) return; setDrawLines(prev => { const last = prev[prev.length-1]; return [...prev.slice(0,-1), {...last, points: [...last.points, getPos(e)]}] }); }}
                        onMouseUp={() => setIsDrawing(false)}
                        className="relative z-10 w-full h-full cursor-crosshair"
                    />
                </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card title="Map Ops">
                    <div className="grid grid-cols-2 gap-2">
                        {MAPS.map(m => (
                            <button key={m} onClick={() => {setSelectedMap(m); setDrawLines([]); setAiInsight('');}} className={`px-3 py-2 text-[10px] font-black uppercase italic transition-all border ${selectedMap === m ? 'bg-red-600 border-red-600 text-white' : 'bg-black border-zinc-800 text-zinc-600 hover:text-white'}`}>{String(m)}</button>
                        ))}
                    </div>
                </Card>
                <Card title="AI Intelligence">
                  {aiInsight && <div className="bg-zinc-900/40 p-4 text-[11px] italic text-zinc-400 border border-zinc-800 mb-4 leading-relaxed animate-slide-in">{String(aiInsight)}</div>}
                  <button onClick={getAIInsight} disabled={loadingAi} className="w-full bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black py-3 text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2">
                    {loadingAi ? <Clock size={12} className="animate-spin"/> : <Sparkles size={12} className="text-red-600"/>} AI DEBRIEF
                  </button>
                </Card>
                <Card title="Agent Util">
                    <Select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                        {AGENT_NAMES.map(a => <option key={a}>{a}</option>)}
                    </Select>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {agentData[selectedAgent]?.abilities.map((ab, i) => (
                            <img key={i} src={ab.icon} className="w-full aspect-square p-2 bg-zinc-900 border border-zinc-800 hover:border-red-600 cursor-pointer" alt="" />
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

const LineupLibrary = ({ mapImages }) => {
    const [selectedMap, setSelectedMap] = useState(MAPS[0]);
    const [lineups, setLineups] = useState([]);
    const [activeLineup, setActiveLineup] = useState(null);
    const addToast = useToast();

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'lineups'), where("map", "==", selectedMap));
        return onSnapshot(q, (snap) => setLineups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [selectedMap]);

    const handleMapClick = async (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const title = prompt("Lineup Title:");
        if (!title) return;
        const url = prompt("Image/Video URL:");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'lineups'), {
            title, url, x, y, map: selectedMap, author: auth.currentUser?.displayName || 'SRX_PLAYER'
        });
        addToast("Pin Dropped");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            <div className="lg:col-span-8">
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
                    {MAPS.map(m => (
                        <button key={m} onClick={() => setSelectedMap(m)} className={`px-4 py-2 rounded-sm text-[10px] font-black uppercase italic border transition-all ${selectedMap === m ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{String(m)}</button>
                    ))}
                </div>
                <div className="relative aspect-square bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
                    <img src={mapImages[selectedMap]} onClick={handleMapClick} className="w-full h-full object-cover cursor-crosshair opacity-80" alt="" />
                    {lineups.map(l => (
                        <div key={l.id} onClick={() => setActiveLineup(l)} className="absolute w-4 h-4 bg-red-600 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer shadow-[0_0_15px_red] hover:scale-150 transition-all z-20" style={{left: `${l.x}%`, top: `${l.y}%`}} />
                    ))}
                </div>
            </div>
            <div className="lg:col-span-4">
                <Card title="Intel Viewer" className="h-full">
                    {activeLineup ? (
                        <div className="space-y-4 animate-slide-in">
                            <h4 className="text-xl font-black italic uppercase text-white">{String(activeLineup.title)}</h4>
                            <div className="aspect-video bg-black border border-zinc-800">
                                {activeLineup.url?.includes('youtube') ? <iframe src={activeLineup.url.replace('watch?v=', 'embed/')} className="w-full h-full border-none" /> : <img src={activeLineup.url} className="w-full h-full object-contain" alt="" />}
                            </div>
                            <ButtonPrimary onClick={() => setActiveLineup(null)} className="w-full">Close</ButtonPrimary>
                        </div>
                    ) : <div className="text-zinc-700 italic text-sm text-center pt-20">Drop pins on the map</div>}
                </Card>
            </div>
        </div>
    );
};

const WarRoom = () => {
    const [enemies, setEnemies] = useState([]);
    const [selectedEnemy, setSelectedEnemy] = useState(null);
    const [intelInput, setIntelInput] = useState('');
    const [selectedMapIntel, setSelectedMapIntel] = useState(MAPS[0]);
    const addToast = useToast();

    useEffect(() => {
        return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'warroom'), s => {
            setEnemies(s.docs.map(d => ({id: d.id, ...d.data()})));
        });
    }, []);

    const saveMapIntel = async () => {
        if (!selectedEnemy) return;
        const updatedIntel = { ...(selectedEnemy.mapIntel || {}), [selectedMapIntel]: intelInput };
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warroom', selectedEnemy.id), { mapIntel: updatedIntel });
        addToast("Dossier Updated");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in h-full">
            <div className="lg:col-span-4">
                <Card title="Target Dossiers" action={<button className="text-red-600" onClick={async () => {
                    const name = prompt("Enemy Organization Name:");
                    if (name) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'warroom'), { name, threat: 'Medium', mapIntel: {} });
                }}><Plus size={16}/></button>}>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {enemies.map(e => (
                            <button key={e.id} onClick={() => { setSelectedEnemy(e); setIntelInput(e.mapIntel?.[selectedMapIntel] || ''); }} className={`w-full p-4 border rounded-sm text-left flex justify-between items-center transition-all ${selectedEnemy?.id === e.id ? 'border-red-600 bg-red-600/5' : 'border-zinc-900 hover:border-zinc-700 bg-black'}`}>
                                <span className="font-black italic uppercase text-sm text-zinc-300">{String(e.name)}</span>
                                <ChevronRight size={14} className={selectedEnemy?.id === e.id ? 'text-red-600' : 'text-zinc-800'}/>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-8">
                {selectedEnemy ? (
                    <Card title={`Intel: ${selectedEnemy.name}`} className="h-full">
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                            {MAPS.map(m => (
                                <button key={m} onClick={() => { setSelectedMapIntel(m); setIntelInput(selectedEnemy.mapIntel?.[m] || ''); }} className={`px-4 py-2 text-[10px] font-black uppercase italic border transition-all ${selectedMapIntel === m ? 'bg-red-600 border-red-600' : 'bg-black border-zinc-900 text-zinc-500'}`}>{String(m)}</button>
                            ))}
                        </div>
                        <textarea 
                            value={intelInput} onChange={e => setIntelInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-900 p-8 text-zinc-300 font-mono text-sm h-[400px] outline-none focus:border-red-600 rounded-sm leading-relaxed"
                            placeholder={`Log enemy tendencies for ${selectedMapIntel}...`}
                        />
                        <div className="mt-6 flex justify-end">
                            <ButtonPrimary onClick={saveMapIntel}>Save Intel</ButtonPrimary>
                        </div>
                    </Card>
                ) : <div className="h-full flex items-center justify-center text-zinc-800 italic">Select an organization to view intelligence</div>}
            </div>
        </div>
    );
};

const MapVeto = () => {
    const [vetoState, setVetoState] = useState({});
    useEffect(() => {
        return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'general', 'map_veto'), (snap) => {
            if (snap.exists()) setVetoState(snap.data());
        });
    }, []);
    const toggleMap = async (map) => {
        const current = vetoState[map] || 'neutral';
        const next = current === 'neutral' ? 'ban' : current === 'ban' ? 'pick' : 'neutral';
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'general', 'map_veto'), { ...vetoState, [map]: next });
    };
    return (
        <Card title="Veto Board" action={<button onClick={async() => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'general', 'map_veto'), {})}>Reset</button>}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {MAPS.map(map => {
                    const status = vetoState[map] || 'neutral';
                    return (
                        <div key={map} onClick={() => toggleMap(map)} className={`aspect-video border-2 rounded-sm cursor-pointer flex flex-col items-center justify-center ${status === 'ban' ? 'border-red-600 bg-red-950/20' : status === 'pick' ? 'border-green-600 bg-green-950/20' : 'border-zinc-800'}`}>
                            <span className="font-black italic uppercase text-[10px] text-zinc-300">{String(map)}</span>
                            <span className="text-[8px] font-bold opacity-50 uppercase text-zinc-500">{String(status)}</span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const HubView = ({ setActiveTab, activeTab, rosterName, userTimezone, setUserTimezone, roster, shouts, postShout, refineShout, refiningShout, newShout, setNewShout, mapImages, agentData, matches, absences, onLandingClick }) => (
    <div className="flex flex-col h-screen bg-[#020202]">
        <header className="flex-none h-20 border-b border-zinc-900 flex justify-between items-center px-10 bg-black/50 backdrop-blur-xl">
            <div className="flex items-center gap-4 cursor-pointer" onClick={onLandingClick}>
                <div className="w-8 h-8 bg-red-600 flex items-center justify-center rounded-sm font-black italic text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]">S</div>
                <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">SYRIX <span className="text-red-600">HUB</span></h1>
            </div>
            <div className="flex items-center gap-6">
                <Select value={userTimezone} onChange={e => setUserTimezone(e.target.value)} className="!p-1 text-xs w-32 border-none">
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                </Select>
                <div className="text-right border-l border-zinc-900 pl-8 ml-2">
                    <p className="text-xs font-black italic text-white leading-none">{String(rosterName || 'Guest')}</p>
                    <button onClick={() => signOut(auth)} className="text-[9px] font-black text-red-600 uppercase tracking-widest mt-1">Log Out</button>
                </div>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <aside className="w-64 border-r border-zinc-900 flex flex-col bg-black/20 overflow-y-auto custom-scrollbar">
                <div className="py-10 flex flex-col gap-1">
                    {[
                        {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
                        {id: 'aicoach', label: 'AI Coach', icon: BrainCircuit},
                        {id: 'stratbook', label: 'Stratbook', icon: MapIcon},
                        {id: 'library', label: 'Library', icon: Target},
                        {id: 'warroom', label: 'War Room', icon: Sword},
                        {id: 'mapveto', label: 'Map Veto', icon: CheckCircle2},
                        {id: 'matches', label: 'History', icon: History},
                        {id: 'roster', label: 'Roster', icon: Users}
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-8 py-5 border-l-2 transition-all uppercase text-[10px] font-black tracking-[0.2em] ${activeTab === item.id ? 'bg-red-600/5 border-red-600 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
                            <item.icon size={16} className={activeTab === item.id ? 'text-red-600' : ''} /> {item.label}
                        </button>
                    ))}
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.05)_0%,transparent_70%)] pointer-events-none" />
                
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
                        <div className="lg:col-span-8 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <Card title="Activity Heatmap">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center">
                                            <thead><tr><th></th>{SHORT_DAYS.map(d => <th key={d} className="text-[9px] font-black text-zinc-700 pb-3">{d}</th>)}</tr></thead>
                                            <tbody>{['18:00', '21:00'].map(t => (
                                                <tr key={t} className="border-t border-zinc-900/50">
                                                    <td className="text-[9px] text-zinc-700 font-bold py-4 pr-3 italic">{t}</td>
                                                    {DAYS.map(d => <td key={d} className="p-0.5"><div className={`h-10 w-full border border-zinc-900/50 transition-all ${Math.random() > 0.4 ? 'bg-red-600/30' : 'bg-black/40'}`} /></td>)}
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                </Card>
                                <Card title="Logistics Log">
                                  <div className="space-y-4">
                                    <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-sm">
                                      <h4 className="text-[10px] font-black uppercase text-red-600 mb-2">Absence Record</h4>
                                      <div className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar">
                                        {absences.map(a => (
                                          <div key={a.id} className="text-[10px] text-zinc-400 italic flex justify-between">
                                            <span>{String(a.user)}</span>
                                            <span className="text-zinc-600">{String(a.start)} - {String(a.end)}</span>
                                          </div>
                                        ))}
                                        {absences.length === 0 && <p className="text-[9px] text-zinc-700 uppercase italic">No absences logged</p>}
                                      </div>
                                    </div>
                                    <button className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-3 text-[10px] font-black uppercase italic text-zinc-400 hover:text-white" onClick={async () => {
                                      const start = prompt("Start Date:");
                                      const end = prompt("End Date:");
                                      if(start && end) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leaves'), { user: rosterName, start, end });
                                    }}>Register Absence</button>
                                  </div>
                                </Card>
                            </div>
                            <Card title="Active Operational Status">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead><tr className="border-b border-zinc-900"><th className="p-5 text-[10px] font-black text-zinc-700 uppercase italic">Operator</th>{SHORT_DAYS.map(d => <th key={d} className="p-5 text-[10px] font-black text-zinc-700 text-center uppercase italic">{d}</th>)}</tr></thead>
                                        <tbody>{roster.map(m => (
                                            <tr key={m.id} className="border-b border-zinc-900/30 hover:bg-white/[0.01] transition-colors">
                                                <td className="p-5 font-black italic text-sm text-zinc-200">{String(m.id)}</td>
                                                {DAYS.map(d => <td key={d} className="p-2 text-center"><div className="h-2 w-2 rounded-full bg-zinc-900 mx-auto" /></td>)}
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                        <div className="lg:col-span-4 h-fit">
                            <div className="bg-[#0a0a0a] border border-zinc-900 flex flex-col h-[700px] relative rounded-sm shadow-2xl">
                                <div className="p-5 border-b border-zinc-900 flex justify-between items-center italic text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Squad Comms <MessageSquare size={14} className="text-red-600" /></div>
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                    {shouts.map(s => (
                                        <div key={s.id} className="space-y-1.5 animate-slide-in">
                                            <p className="text-[9px] font-black text-red-600 uppercase italic tracking-tighter">{String(s.author || 'Unknown')}</p>
                                            <div className="bg-zinc-900/40 p-4 text-[13px] border border-zinc-800 rounded-sm text-zinc-400 italic leading-relaxed">{String(s.text || '')}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 border-t border-zinc-900 bg-black/40">
                                    <button onClick={refineShout} disabled={refiningShout || !newShout.trim()} className="text-[9px] font-black uppercase italic tracking-widest text-zinc-600 hover:text-white flex items-center gap-2 mb-4 transition-all">
                                        {refiningShout ? <Clock size={10} className="animate-spin" /> : <Sparkles size={10} className="text-red-600" />} {refiningShout ? "REFINING" : "REFINE WITH AI"}
                                    </button>
                                    <form onSubmit={postShout} className="flex gap-2">
                                        <input value={newShout} onChange={e => setNewShout(e.target.value)} placeholder="SEND INTEL..." className="bg-black border-none text-[11px] font-black uppercase italic text-white w-full outline-none placeholder-zinc-800" />
                                        <button type="submit" className="text-red-600 hover:text-white p-2"><ChevronRight /></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'aicoach' && <AICoach />}
                {activeTab === 'stratbook' && <StratBook mapImages={mapImages} agentData={agentData} />}
                {activeTab === 'library' && <LineupLibrary mapImages={mapImages} agentData={agentData} />}
                {activeTab === 'warroom' && <WarRoom />}
                {activeTab === 'mapveto' && <MapVeto />}
                {activeTab === 'matches' && (
                    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto pt-10">
                        <h2 className="text-7xl font-black italic uppercase tracking-tighter text-white">OP <span className="text-red-600">HISTORY</span></h2>
                        {matches.map(m => (
                            <div key={m.id} className="bg-zinc-900/20 border border-zinc-900 p-10 flex justify-between items-center group hover:border-red-600/40 transition-all shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
                                <div><p className="text-4xl font-black italic text-zinc-300">SYRIX VS {String(m.opponent || 'Enemy')}</p><p className="text-[11px] font-black text-zinc-600 uppercase mt-3 tracking-[0.3em]">{String(m.date || '')} • {String(m.map || 'TBD')}</p></div>
                                <div className="text-right"><p className="text-5xl font-black italic text-red-600">DEFEATED</p></div>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'roster' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 animate-fade-in">
                        {roster.map(p => (
                            <div key={p.id} className="bg-[#080808] border border-zinc-900 group relative shadow-2xl">
                                <div className="aspect-[3/4] bg-black relative overflow-hidden">
                                  <img src={p.pfp || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400&h=500&fit=crop'} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" alt="" />
                                </div>
                                <div className="p-8 relative">
                                  <h4 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-200">{String(p.id)}</h4>
                                  <p className="text-[10px] font-black text-red-600 uppercase mt-2 tracking-[0.3em] italic">{String(p.role || 'MEMBER')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    </div>
);

const LandingNav = ({ scrolled, onHubClick }) => (
    <nav className={`fixed w-full z-50 transition-all duration-500 border-b ${scrolled ? 'bg-black/95 border-red-900/20 py-4' : 'bg-transparent border-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-10 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm">
                    <span className="text-white font-black text-2xl italic">S</span>
                </div>
                <span className="font-black text-2xl uppercase tracking-tighter italic text-white">SYRIX</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
                {['home', 'teams', 'shop', 'matches'].map(id => (
                    <button key={id} className="px-5 py-2 uppercase font-black tracking-widest text-[11px] text-zinc-400 hover:text-red-500 transition-colors">{id}</button>
                ))}
                <button onClick={onHubClick} className="ml-6 bg-red-600 text-white px-8 py-2 font-black uppercase italic text-[11px] tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(220,38,38,0.2)]">Command Center</button>
            </div>
        </div>
    </nav>
);

const App = () => {
    const [view, setView] = useState('landing');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [rosterName, setRosterName] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    
    // Data States
    const [roster, setRoster] = useState([]);
    const [matches, setMatches] = useState([]);
    const [shouts, setShouts] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [newShout, setNewShout] = useState('');
    const [refiningShout, setRefiningShout] = useState(false);
    const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const { agentData, mapImages } = useValorantData();
    const addToast = useToast();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const init = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        };
        init();
        return onAuthStateChanged(auth, u => {
            setUser(u);
            if (u) setRosterName(u.displayName || `SRX_${u.uid.slice(0, 4)}`);
        });
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubs = [
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'roster'), s => setRoster(s.docs.map(d => ({id: d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), s => setMatches(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.date) - new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shoutbox'), s => setShouts(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leaves'), s => setAbsences(s.docs.map(d => ({id: d.id, ...d.data()}))))
        ];
        return () => unsubs.forEach(u => u());
    }, [user]);

    const postShout = async (e) => {
        if (e) e.preventDefault();
        if (!newShout.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shoutbox'), {
            text: String(newShout), author: String(rosterName), createdAt: serverTimestamp()
        });
        setNewShout('');
    };

    const refineShout = async () => {
        if (!newShout.trim()) return;
        setRefiningShout(true);
        try {
            const res = await callGemini(`Rewrite this team message to be professional and motivating: "${newShout}"`);
            setNewShout(res.replace(/^"(.*)"$/, '$1').trim());
            addToast("Refined by AI");
        } catch (e) { addToast("AI Error", "error"); }
        finally { setRefiningShout(false); }
    };

    return (
        <div className="min-h-screen bg-[#020202]">
            <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-marquee { animation: marquee 25s linear infinite; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.6s ease-in-out forwards; }
                @keyframes slideIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
            `}</style>
            {view === 'landing' ? (
                <>
                    <LandingNav scrolled={scrolled} onHubClick={() => setView('hub')} />
                    <section id="home" className="relative h-screen flex items-center pt-20 overflow-hidden bg-black">
                        <div className="absolute -bottom-10 -left-20 text-[25rem] font-black text-white/[0.02] uppercase select-none leading-none z-0 italic">SYRIX</div>
                        <div className="max-w-7xl mx-auto px-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.1)]">Operational Status: Live</div>
                                <h1 className="text-8xl md:text-[11rem] font-black uppercase leading-[0.75] tracking-tighter italic text-white">BORN IN <br /><span className="text-red-600">CHAOS</span></h1>
                                <p className="text-xl text-zinc-500 max-w-lg leading-relaxed font-medium italic">Uncompromising precision forged in competition. Elite digital warfare squads synced for dominance.</p>
                                <div className="flex flex-wrap gap-5 pt-8">
                                    <button onClick={() => setView('hub')} className="bg-red-600 text-white px-12 py-5 font-black uppercase text-xl italic hover:bg-white hover:text-black transition-all transform hover:-translate-y-1 shadow-[0_0_50px_rgba(220,38,38,0.3)] border-b-4 border-red-900 active:border-b-0 active:translate-y-0.5">Command Center</button>
                                    <button className="border-2 border-zinc-800 px-12 py-5 font-black uppercase text-xl italic text-zinc-400 hover:bg-white hover:text-black transition-all">Pro Armory</button>
                                </div>
                            </div>
                            <div className="relative group hidden lg:block perspective-1000">
                                <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" className="relative w-full h-auto grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition duration-1000 border-l-8 border-red-600 shadow-2xl" alt="" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 w-full bg-red-600/10 border-t border-red-600/20 py-3.5 overflow-hidden whitespace-nowrap z-20 backdrop-blur-sm">
                            <div className="animate-marquee inline-block px-4 font-black uppercase text-[10px] tracking-[0.5em] text-red-500">
                                SYRIX ELITE OPERATIONS // GLOBAL DOMINANCE // VCT CHALLENGERS // CS2 MAJOR QUALIFIERS // LCQ WINTER 2026 // SYRIX ELITE OPERATIONS // GLOBAL DOMINANCE // VCT CHALLENGERS // CS2 MAJOR QUALIFIERS // LCQ WINTER 2026
                            </div>
                        </div>
                    </section>
                </>
            ) : <HubView 
                setActiveTab={setActiveTab}
                activeTab={activeTab}
                rosterName={rosterName}
                userTimezone={userTimezone}
                setUserTimezone={setUserTimezone}
                roster={roster}
                shouts={shouts}
                absences={absences}
                postShout={postShout}
                refineShout={refineShout}
                refiningShout={refiningShout}
                newShout={newShout}
                setNewShout={setNewShout}
                mapImages={mapImages}
                agentData={agentData}
                matches={matches}
                onLandingClick={() => setView('landing')}
            />}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);
root.render(<ToastProvider><App /></ToastProvider>);