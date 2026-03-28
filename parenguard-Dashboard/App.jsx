import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Phone, 
  Monitor, 
  AlertTriangle, 
  Settings, 
  Clock, 
  BarChart2, 
  Eye,
  Globe,
  Users,
  Plus,
  X,
  QrCode,
  Trash2,
  Activity,
  Camera,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST;
const FORCED_RENDER_URL = 'https://suraksha-kawach-backend.onrender.com';

const getBackendUrl = () => {
  if (BACKEND_HOST) return BACKEND_HOST.startsWith('http') ? BACKEND_HOST : `https://${BACKEND_HOST}`;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return 'http://192.168.1.38:3000';
  return FORCED_RENDER_URL;
};

const BACKEND_URL = getBackendUrl();
const socket = io(BACKEND_URL);



const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLocked, setIsLocked] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState('');
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  
  // Children State
  const [children, setChildren] = useState(() => {
    const saved = localStorage.getItem('suraksha_parent_children');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Aman', age: 12, device: 'Redmi Note 10', status: 'Online', linkingCode: 'SK-492011', bannedKeywords: ['guns', 'drugs', 'porn', 'murder'], activityLogs: [] },
      { id: 2, name: 'Sana', age: 8, device: 'Samsung Galaxy', status: 'Offline', linkingCode: 'SK-112093', bannedKeywords: ['suicide', 'bomb', 'violence'], activityLogs: [] }
    ];
  });

  const [selectedChild, setSelectedChild] = useState(children.length > 0 ? children[0] : null);
  const [newChildName, setNewChildName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const generateChildId = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `SK-${num}`;
  };

  React.useEffect(() => {
    localStorage.setItem('suraksha_parent_children', JSON.stringify(children));
  }, [children]);

  React.useEffect(() => {
    // Re-register existing children on mount to repopulate backend
    children.forEach(c => socket.emit('parent-register', { id: c.linkingCode, name: c.name, device: c.device, bannedKeywords: c.bannedKeywords || ['guns'] }));

    socket.on('connect', () => {
       setSocketConnected(true);
       children.forEach(c => socket.emit('parent-register', { id: c.linkingCode, name: c.name, device: c.device, bannedKeywords: c.bannedKeywords || ['guns'] }));
    });

    socket.on('disconnect', () => {
       setSocketConnected(false);
    });


    socket.on('child-status-changed', ({ id, status }) => {
      setChildren(prev => {
        const updated = prev.map(c => c.linkingCode === id ? { ...c, status } : c);
        const active = updated.find(c => c.id === selectedChild?.id);
        if (active) setSelectedChild(active);
        return updated;
      });
    });

    socket.on('search-alert', ({ id, keyword, timestamp }) => {
      setChildren(prev => {
        const updated = prev.map(c => {
          if (c.linkingCode === id) {
            const currentAlerts = c.alerts || [];
            return { ...c, alerts: [{ keyword, timestamp }, ...currentAlerts] };
          }
          return c;
        });
        const active = updated.find(c => c.id === selectedChild?.id);
        if (active) setSelectedChild(active);
        return updated;
      });
    });

    socket.on('incoming-activity-log', ({ id, app, detail, timestamp }) => {
      setChildren(prev => {
        const updated = prev.map(c => {
          if (c.linkingCode === id) {
            const currentLogs = c.activityLogs || [];
            return { ...c, activityLogs: [{ app, detail, timestamp }, ...currentLogs].slice(0, 50) };
          }
          return c;
        });
        const active = updated.find(c => c.id === selectedChild?.id);
        if (active) setSelectedChild(active);
        return updated;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('child-status-changed');
      socket.off('search-alert');
      socket.off('incoming-activity-log');
    };
  }, [selectedChild, children]);

  const handleAddChild = (e) => {
    e.preventDefault();
    if (!newChildName) return;
    
    const newId = generateChildId();
    const newChild = {
      id: children.length + 1,
      name: newChildName,
      age: '--',
      device: 'Linking Pending...',
      status: 'Pending',
      linkingCode: newId,
      bannedKeywords: ['guns', 'drugs', 'porn', 'suicide', 'bomb'],
      activityLogs: []
    };
    
    setChildren([...children, newChild]);
    setLastGeneratedId(newId);
    setNewChildName('');
    setShowAddModal(false);
    setShowSuccessScreen(true);

    socket.emit('parent-register', { id: newId, name: newChildName, device: 'Smart Device', bannedKeywords: newChild.bannedKeywords });
  };

  const updateAndEmitKeywords = (newList) => {
    setChildren(prev => {
        const updated = prev.map(c => c.id === selectedChild.id ? { ...c, bannedKeywords: newList } : c);
        const active = updated.find(c => c.id === selectedChild.id);
        if(active) setSelectedChild(active);
        return updated;
    });
    socket.emit('update-keywords', { id: selectedChild.linkingCode, bannedKeywords: newList });
  };

  const syncWithServer = () => {
    children.forEach(c => {
      socket.emit('parent-register', { 
        id: c.linkingCode, 
        name: c.name, 
        device: c.device, 
        bannedKeywords: c.bannedKeywords || ['guns'] 
      });
    });
    alert('Server ke saath sync ho gaya!');
  };


  const handleAddKeyword = (e) => {
    e.preventDefault();
    if(!newKeyword.trim() || !selectedChild) return;
    const kw = newKeyword.trim().toLowerCase();
    const currentKeywords = selectedChild.bannedKeywords || [];
    if (!currentKeywords.includes(kw)) {
       updateAndEmitKeywords([...currentKeywords, kw]);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw) => {
    const currentKeywords = selectedChild.bannedKeywords || [];
    updateAndEmitKeywords(currentKeywords.filter(k => k !== kw));
  };

  const handleDeleteChild = (e, childId) => {
    e.stopPropagation();
    const updatedChildren = children.filter(c => c.id !== childId);
    setChildren(updatedChildren);
    if (selectedChild?.id === childId && updatedChildren.length > 0) {
      setSelectedChild(updatedChildren[0]);
    } else if (updatedChildren.length === 0) {
      setSelectedChild(null);
    }
  };

  // Mock data for App Usage
  const appUsage = [
    { name: 'YouTube', time: '1h 45m', color: 'bg-red-500' },
    { name: 'Free Fire', time: '2h 10m', color: 'bg-orange-500' },
    { name: 'Instagram', time: '45m', color: 'bg-pink-500' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield size={28} className="text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold leading-none">Suraksha Kawach</h1>
            <p className="text-[10px] text-indigo-200 mt-1">Parental Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${socketConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300 animate-pulse'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {socketConnected ? 'Server Online' : 'Server Offline'}
            </div>
          </div>
          <button onClick={syncWithServer} title="Sync with Server" className="bg-indigo-600 p-1.5 rounded-lg hover:bg-indigo-500 transition-colors shadow-inner text-white flex items-center gap-1 px-3">
            <Activity size={16} />
            <span className="text-[10px] font-bold">Sync</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 p-1.5 rounded-lg hover:bg-indigo-500 transition-colors shadow-inner text-white">
            <Plus size={20} />
          </button>

          <div className="relative">
            <AlertTriangle size={24} className="text-yellow-300 animate-pulse" />
          </div>

        </div>
      </header>

      {/* Child Selector Strip */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar shadow-sm sticky top-[68px] z-10">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedChild?.id === child.id 
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-md scale-105' 
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {child.name}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {activeTab === 'dashboard' && !selectedChild && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Monitor size={48} className="mb-4" />
            <p className="font-bold text-center">Koi bacha add nahi kiya gaya hai.<br/>Pehle bachi / bacha add karein.</p>
          </div>
        )}
        {activeTab === 'dashboard' && selectedChild && (
          <>
            {/* Remote Control Section */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-700">{selectedChild.name} ka Device</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${selectedChild.status === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedChild.status === 'Online' ? 'Abhi Phone chal raha hai' : 'Phone offline hai'}
                    </p>
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${isLocked ? 'bg-red-100 shadow-inner' : 'bg-green-100 shadow-inner'}`}>
                  {isLocked ? <Lock className="text-red-600" /> : <Unlock className="text-green-600" />}
                </div>
              </div>
              <button 
                onClick={() => {
                  const newStatus = !isLocked;
                  setIsLocked(newStatus);
                  socket.emit('toggle-lock', { id: selectedChild.linkingCode, isLocked: newStatus });
                }}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                  isLocked ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
              >
                {isLocked ? <Unlock size={20} /> : <Lock size={20} />}
                {isLocked ? 'Unlock Karein' : 'Abhi Lock Karein'}
              </button>
            </section>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  <Clock size={18} className="text-blue-600" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Screen Time</p>
                <h3 className="text-xl font-bold text-slate-700">5h 10m</h3>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 bg-amber-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                <div className="bg-amber-100 w-8 h-8 rounded-lg flex items-center justify-center mb-3 relative z-10">
                  <Globe size={18} className="text-amber-600" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider relative z-10">Web Alerts</p>
                <h3 className="text-xl font-black text-amber-600 relative z-10">{(selectedChild.alerts || []).length}</h3>
              </div>
            </div>

            {/* Live Activity Timeline */}
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
               <h3 className="text-md font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" />
                  Live Activity Tracker
               </h3>
               {!(selectedChild.activityLogs && selectedChild.activityLogs.length > 0) ? (
                  <div className="text-center py-6">
                     <p className="text-xs text-slate-400 font-bold">Koi live activity nahi ho rahi hai.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {selectedChild.activityLogs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                           <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${log.app === 'YouTube' ? 'bg-red-50 text-red-500 border border-red-100' : log.app === 'Instagram' ? 'bg-pink-50 text-pink-500 border border-pink-100' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'}`}>
                                 {log.app === 'YouTube' ? <Monitor size={14} /> : log.app === 'Instagram' ? <Camera size={14} /> : <Globe size={14} />}
                              </div>
                              {i !== selectedChild.activityLogs.length - 1 && <div className="w-px h-full bg-slate-100 my-1"></div>}
                           </div>
                           <div className="pb-2">
                              <div className="flex items-baseline gap-2">
                                 <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">{log.app}</h4>
                                 <span className="text-[10px] text-slate-400 font-bold">{log.timestamp}</span>
                              </div>
                              <p className="text-sm text-slate-600 font-medium mt-1 leading-snug">{log.detail}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </section>
          </>
        )}

        {activeTab === 'family' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-slate-700">Aapki Family</h3>
            <div className="space-y-3">
              {children.map(child => (
                <div key={child.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group active:scale-95 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
                      child.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{child.name}</p>
                        {child.status === 'Pending' && (
                          <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Setup Required</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold mt-0.5">
                        <Smartphone size={10} /> {child.device}
                      </p>
                      <p className="text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50 inline-block px-1.5 rounded">ID: {child.linkingCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => handleDeleteChild(e, child.id)} className="p-2 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                    <ChevronRight className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => setShowAddModal(true)}
                className="w-full py-5 border-2 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center gap-2 text-indigo-400 font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
              >
                <div className="bg-indigo-50 p-2 rounded-full group-hover:bg-white transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-sm">Naya Bacha Add Karein</span>
              </button>
            </div>
          </section>
        )}

        {/* Safety / Web Filters Tab */}
        {activeTab === 'web' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-end">
               <div>
                  <h3 className="text-lg font-bold text-slate-700">Safety Alerts</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Khatarnaak search keywords ki list</p>
               </div>
               {selectedChild && (
                 <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                   <span className="text-xs font-bold text-slate-700">{selectedChild.name}</span>
                 </div>
               )}
             </div>

             {!selectedChild || !(selectedChild.alerts && selectedChild.alerts.length > 0) ? (
                <div className="flex flex-col items-center justify-center py-10 px-8 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm mt-4">
                  <div className="bg-green-50 p-4 rounded-full mb-4">
                    <Shield size={32} className="text-green-500" />
                  </div>
                  <h4 className="font-black text-slate-700 text-lg mb-1">Sab Kuch Safe Hai</h4>
                  <p className="text-xs text-slate-500 font-medium">Koi bhi galat search abhi track nahi hua hai.</p>
                </div>
             ) : (
                <div className="space-y-3 mt-4">
                   {selectedChild.alerts.map((alert, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-3xl shadow-sm border border-red-100 flex items-start gap-4">
                         <div className="bg-red-50 p-2.5 rounded-2xl shrink-0 mt-0.5">
                            <AlertTriangle size={20} className="text-red-500" />
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                 Banned Keyword
                               </span>
                               <span className="text-[10px] font-bold text-slate-400">{alert.timestamp}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 tracking-tight">"{alert.keyword}"</h4>
                            <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                              <Globe size={12} /> Browser Search
                            </p>
                         </div>
                      </div>
                   ))}
                </div>
             )}

             {selectedChild && (
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mt-6 relative z-10">
                   <h4 className="text-md font-bold text-slate-700 mb-3 flex items-center gap-2"><Globe size={18} className="text-indigo-500" /> Custom Banned Keywords</h4>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {(selectedChild.bannedKeywords || []).map((kw, i) => (
                         <div key={i} className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                            {kw}
                            <button onClick={() => handleRemoveKeyword(kw)} className="hover:bg-rose-200 p-0.5 rounded-full transition-colors"><X size={12} /></button>
                         </div>
                      ))}
                      {(!selectedChild.bannedKeywords || selectedChild.bannedKeywords.length === 0) && (
                         <p className="text-xs text-slate-400 font-bold">Koi keyword add nahi hai.</p>
                      )}
                   </div>
                   <form onSubmit={handleAddKeyword} className="flex gap-2">
                      <input 
                         type="text" 
                         value={newKeyword} 
                         onChange={e => setNewKeyword(e.target.value)} 
                         placeholder="Naya galat word add karein..." 
                         className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200 text-slate-700" 
                      />
                      <button type="submit" disabled={!newKeyword.trim()} className="bg-indigo-600 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition active:scale-95">Add</button>
                   </form>
                </div>
             )}
          </section>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
           <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Phone size={48} className="mb-4" />
              <p className="font-bold">Calls feature Coming Soon</p>
           </div>
        )}

      </main>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Add New Child</h3>
                <button onClick={() => setShowAddModal(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddChild} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Bache ka Naam</label>
                  <input 
                    type="text" 
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Eg: Rahul" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-bold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Device Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 border-2 border-indigo-500 p-3 rounded-2xl flex flex-col items-center gap-2">
                       <Smartphone size={20} className="text-indigo-600" />
                       <span className="text-xs font-bold text-indigo-700">Android</span>
                    </div>
                    <div className="bg-slate-50 border-2 border-transparent p-3 rounded-2xl flex flex-col items-center gap-2 opacity-50">
                       <Smartphone size={20} className="text-slate-400" />
                       <span className="text-xs font-bold text-slate-500">iPhone</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-800 transition-all active:scale-95">
                    Generate Linking ID
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Linking Screen */}
      {showSuccessScreen && (
        <div className="fixed inset-0 bg-indigo-700 z-[60] flex items-center justify-center p-6 animate-in slide-in-from-bottom-full duration-500">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            {/* Decor Circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-50 rounded-full"></div>

            <div className="relative text-center">
              <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-sm">
                <CheckCircle2 size={48} className="text-green-600 -rotate-6" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2">Bacha Add Ho Gaya!</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Bache ke phone mein 'Suraksha Kawach' app khol kar ye ID dalein:</p>
              
              <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-3xl p-6 mb-8 group relative">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Bacho wali App ki Login ID</p>
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-3xl font-black text-indigo-700 tracking-wider">{lastGeneratedId}</h2>
                   <Copy size={20} className="text-slate-300" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-left bg-slate-50 p-3 rounded-2xl">
                   <div className="bg-white p-1 rounded-lg shadow-sm font-black text-xs text-indigo-600">1</div>
                   <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Bache ke phone mein app download karein aur 'Child Mode' select karein.</p>
                </div>
                <div className="flex items-start gap-3 text-left bg-slate-50 p-3 rounded-2xl">
                   <div className="bg-white p-1 rounded-lg shadow-sm font-black text-xs text-indigo-600">2</div>
                   <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Login screen par upar di gayi ID '{lastGeneratedId}' enter karein.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowSuccessScreen(false)}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-8 shadow-lg active:scale-95 transition-transform"
              >
                Theek Hai, Samajh Gaya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-3 px-6 flex justify-between items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <BarChart2 size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Monitor</span>
        </button>
        <button onClick={() => setActiveTab('family')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'family' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <Users size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Family</span>
        </button>
        <button onClick={() => setActiveTab('calls')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'calls' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <Phone size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Calls</span>
        </button>
        <button onClick={() => setActiveTab('web')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'web' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <Globe size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Safety</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
