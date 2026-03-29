import React, { useState, useEffect } from 'react';
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
  Copy,
  UserPlus,
  LogIn,
  KeyRound,
  User,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000';
const socket = io(BACKEND_URL, { forceNew: true, multiplex: false });

const ParentView = ({ onLogout }) => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('suraksha_parent_logged') === 'true');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [mobile, setMobile] = useState(() => localStorage.getItem('suraksha_parent_mobile') || '');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('Pending');

  // Dashboard State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLocked, setIsLocked] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  const [children, setChildren] = useState(() => {
    const saved = localStorage.getItem('suraksha_parent_children');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedChild, setSelectedChild] = useState(null);
  const [newChildName, setNewChildName] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // --- Auth Effects ---
  useEffect(() => {
    socket.on('signup-success', ({ status }) => {
      setRegistrationStatus(status);
      setIsLoggedIn(true);
      localStorage.setItem('suraksha_parent_logged', 'true');
      localStorage.setItem('suraksha_parent_mobile', mobile);
    });

    socket.on('login-success', ({ name: dbName, status }) => {
      setName(dbName);
      setRegistrationStatus(status);
      setIsLoggedIn(true);
      localStorage.setItem('suraksha_parent_logged', 'true');
      localStorage.setItem('suraksha_parent_mobile', mobile);
      setAuthError('');
    });

    socket.on('login-error', (err) => setAuthError(err));
    socket.on('signup-error', (err) => setAuthError(err));
    socket.on('child-lock-confirmed', ({ id, isLocked }) => {
       setChildren(prev => prev.map(c => c.linkingCode === id ? { ...c, isLocked } : c));
    });

    return () => {
      socket.off('signup-success');
      socket.off('login-success');
      socket.off('login-error');
      socket.off('signup-error');
      socket.off('registration-status-update');
    };
  }, [mobile, isLoggedIn]);

  // --- Dashboard Effects ---
  useEffect(() => {
    if (!isLoggedIn) return;

    localStorage.setItem('suraksha_parent_children', JSON.stringify(children));
    
    // Register children with the mobile number
    children.forEach(c => {
       socket.emit('parent-register-child', { 
          id: c.linkingCode, 
          name: c.name, 
          device: c.device, 
          mobile, 
          bannedKeywords: c.bannedKeywords 
       });
    });

    socket.on('connect', () => {
       setIsConnected(true);
       if (isLoggedIn) {
          children.forEach(c => socket.emit('parent-register-child', { id: c.linkingCode, name: c.name, device: c.device, mobile, bannedKeywords: c.bannedKeywords }));
       }
    });
    
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('child-status-changed', ({ id, status }) => {
      setChildren(prev => prev.map(c => c.linkingCode === id ? { ...c, status } : c));
    });

    socket.on('search-alert', ({ id, keyword, timestamp }) => {
      setChildren(prev => prev.map(c => {
        if (c.linkingCode === id) {
          const currentAlerts = c.alerts || [];
          return { ...c, alerts: [{ keyword, timestamp }, ...currentAlerts] };
        }
        return c;
      }));
    });

    socket.on('incoming-activity-log', ({ id, app, detail, timestamp }) => {
      setChildren(prev => prev.map(c => {
        if (c.linkingCode === id) {
          const currentLogs = c.activityLogs || [];
          return { ...c, activityLogs: [{ app, detail, timestamp }, ...currentLogs].slice(0, 50) };
        }
        return c;
      }));
    });

    socket.on('incoming-call-log', ({ id, call }) => {
      setChildren(prev => prev.map(c => {
        if (c.linkingCode === id) {
          const currentCalls = c.callLogs || [];
          return { ...c, callLogs: [call, ...currentCalls].slice(0, 50) };
        }
        return c;
      }));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('child-status-changed');
      socket.off('search-alert');
      socket.off('incoming-activity-log');
    };
  }, [isLoggedIn, children, mobile]);

  useEffect(() => {
     if (children.length > 0) {
        if (!selectedChild) {
           setSelectedChild(children[0]);
        } else {
           const current = children.find(c => c.linkingCode === selectedChild.linkingCode);
           if (current) setSelectedChild(current);
        }
     }
  }, [children]);

  const handleAuth = (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
       socket.emit('parent-signup', { name, mobile, pin, device: 'Smart Phone' });
    } else {
       socket.emit('parent-login', { mobile, pin });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('suraksha_parent_logged');
    setIsLoggedIn(false);
    onLogout();
  };

  const generateChildId = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `SK-${num}`;
  };

  const handleAddChild = (e) => {
    e.preventDefault();
    if (!newChildName) return;
    
    const newId = generateChildId();
    const newChild = {
      id: Date.now(),
      name: newChildName,
      device: 'Linking Pending...',
      status: 'Pending',
      linkingCode: newId,
      bannedKeywords: ['guns', 'drugs', 'porn', 'suicide', 'bomb'],
      activityLogs: []
    };
    
    setChildren(prev => [...prev, newChild]);
    setLastGeneratedId(newId);
    setNewChildName('');
    setShowAddModal(false);
    setShowSuccessScreen(true);

    socket.emit('parent-register-child', { id: newId, name: newChildName, device: 'Smart Device', mobile, bannedKeywords: newChild.bannedKeywords });
  };

  // --- Auth Render ---
  if (!isLoggedIn) {
     return (
        <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-6 font-sans text-slate-800">
           <div className="w-full max-w-md">
              <div className="text-center mb-10">
                 <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-xl shadow-indigo-100 inline-block mb-6">
                    <Shield size={48} className="text-white" />
                 </div>
                 <h1 className="text-3xl font-black tracking-tight">{authMode === 'signup' ? 'Naya Account' : 'Parent Login'}</h1>
                 <p className="text-slate-500 font-medium mt-2">Bacho ki suraksha aapke haath mein</p>
              </div>

              <form onSubmit={handleAuth} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                 {authMode === 'signup' && (
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Aapka Naam</label>
                        <div className="relative flex items-center">
                          <User size={18} className="absolute left-4 text-slate-400" />
                          <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Eg: Ramesh Kumar"
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 font-bold outline-none transition-all"
                            required
                          />
                        </div>
                    </div>
                 )}
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Mobile Number</label>
                    <div className="relative flex items-center">
                      <Phone size={18} className="absolute left-4 text-slate-400" />
                      <input 
                        type="tel" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10 digit number"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 font-bold outline-none transition-all"
                        required
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{authMode === 'signup' ? 'Char Digit PIN' : 'Enter PIN'}</label>
                    <div className="relative flex items-center">
                      <KeyRound size={18} className="absolute left-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="****"
                        maxLength={4}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-12 pr-4 font-bold outline-none transition-all tracking-widest"
                        required
                      />
                    </div>
                 </div>

                 {authError && <p className="text-rose-500 text-xs font-bold px-2">{authError}</p>}

                 <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                    {authMode === 'signup' ? <UserPlus size={20} /> : <LogIn size={20} />}
                    {authMode === 'signup' ? 'Account Banayein' : 'Dashboard Khulein'}
                 </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                 <button 
                   onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(''); }}
                   className="text-indigo-600 font-black text-sm hover:underline"
                 >
                    {authMode === 'signup' ? 'Pehle se account hai? Login karein' : 'Naya Account Banana Hai? Signup Karein'}
                 </button>
                 <br />
                 <button onClick={onLogout} className="text-slate-400 font-bold text-xs">Piche Jayein</button>
              </div>
           </div>
        </div>
     );
  }

  // --- Approval/Blocked Render ---
  if (registrationStatus === 'Pending') {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-8 text-center font-sans">
        <div className="bg-amber-100 p-6 rounded-full mb-8 animate-pulse text-amber-600">
           <Clock size={64} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Approval Needed</h1>
        <p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
           Aapka account (**{mobile}**) abhi pending hai. Admin se approve hone ke baad hi aap dashboard dekh payenge.
        </p>
        <button onClick={handleLogout} className="mt-10 text-indigo-600 font-bold hover:underline">Chalo Bahar Nikalte Hain</button>
      </div>
    );
  }

  if (registrationStatus === 'Blocked') {
    return (
      <div className="flex flex-col h-screen bg-rose-50 items-center justify-center p-8 text-center font-sans">
        <div className="bg-rose-100 p-6 rounded-full mb-8 text-rose-600">
           <AlertTriangle size={64} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Account Blocked</h1>
        <p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
           Admin ne aapka mobile number block kar diya hai.
        </p>
        <button onClick={handleLogout} className="mt-10 text-indigo-600 font-bold hover:underline">Exit</button>
      </div>
    );
  }

  // --- Main Dashboard Render ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-indigo-700 text-white p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield size={28} className="text-yellow-400" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold leading-none">Suraksha Kawach</h1>
              <div className={`flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-full ${isConnected ? 'text-green-300' : 'text-rose-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-rose-400'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-wider">{isConnected ? 'Server ON' : 'Server OFF'}</span>
              </div>
            </div>
            <p className="text-[10px] text-indigo-200 mt-1">Namaste, {name || 'Parent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="bg-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-900 transition-colors shadow-inner flex items-center gap-2">
            Logout
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 p-1.5 rounded-lg hover:bg-indigo-500 transition-colors shadow-inner">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar shadow-sm sticky top-[68px] z-10">
        {children.length === 0 && <p className="text-[10px] text-slate-400 font-bold py-2">No children linked</p>}
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedChild?.linkingCode === child.linkingCode 
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-md' 
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {child.name}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {activeTab === 'dashboard' && !selectedChild && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Monitor size={48} className="mb-4" />
            <p className="font-bold text-center">Koi bacha add nahi kiya gaya hai.</p>
          </div>
        )}
        
        {activeTab === 'dashboard' && selectedChild && (
          <>
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
                <div className={`p-3 rounded-2xl ${selectedChild.isLocked ? 'bg-red-100 shadow-inner' : 'bg-green-100 shadow-inner'}`}>
                  {selectedChild.isLocked ? <Lock className="text-red-600" /> : <Unlock className="text-green-600" />}
                </div>
              </div>
              <button 
                onClick={() => {
                  const newStatus = !selectedChild.isLocked;
                  socket.emit('toggle-lock', { id: selectedChild.linkingCode, isLocked: newStatus, mobile });
                }}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                  selectedChild.isLocked ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
              >
                {selectedChild.isLocked ? <Unlock size={20} /> : <Lock size={20} />}
                {selectedChild.isLocked ? 'Unlock Karein' : 'Abhi Lock Karein'}
              </button>
            </section>

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
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
               <h3 className="text-md font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <Phone size={18} className="text-green-500" />
                  Recent Call History
               </h3>
               {!(selectedChild.callLogs && selectedChild.callLogs.length > 0) ? (
                  <div className="text-center py-6">
                     <p className="text-xs text-slate-400 font-bold">Koi call history nahi hai.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {selectedChild.callLogs.map((call, i) => (
                        <div key={i} className="flex justify-between items-center group">
                           <div className="flex gap-3 items-center">
                              <div className={`p-2 rounded-xl ${call.type === 'Incoming' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                 {call.type === 'Incoming' ? <PhoneIncoming size={16} /> : <PhoneOutgoing size={16} />}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-800 tracking-tight">{call.number}</p>
                                 <p className="text-[10px] text-slate-500 font-medium">{call.type} • {call.duration}</p>
                              </div>
                           </div>
                           <span className="text-[10px] text-slate-400 font-black">{call.timestamp}</span>
                        </div>
                     ))}
                  </div>
               )}
            </section>
          </>
        )}

        {/* Family Tab */}
        {activeTab === 'family' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-slate-700">Aapki Family</h3>
            <div className="space-y-3">
              {children.map(child => (
                <div key={child.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{child.name}</p>
                      <p className="text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50 inline-block px-1.5 rounded">ID: {child.linkingCode}</p>
                    </div>
                  </div>
                  <button onClick={() => setChildren(prev => prev.filter(c => c.id !== child.id))} className="p-2 text-rose-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setShowAddModal(true)}
                className="w-full py-5 border-2 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center gap-2 text-indigo-400 font-bold hover:bg-indigo-50 transition-all"
              >
                <Plus size={24} />
                <span className="text-sm">Naya Bacha Add Karein</span>
              </button>
            </div>
          </section>
        )}

        {/* Safety Tab */}
        {activeTab === 'web' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-end">
               <h3 className="text-lg font-bold text-slate-700">Safety Alerts</h3>
             </div>

             {(!selectedChild || !selectedChild.alerts || selectedChild.alerts.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 px-8 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm mt-4">
                  <div className="bg-green-50 p-4 rounded-full mb-4">
                    <Shield size={32} className="text-green-500" />
                  </div>
                  <h4 className="font-black text-slate-700 text-lg mb-1">Sab Kuch Safe Hai</h4>
                  <p className="text-xs text-slate-500 font-medium">Safe Mode On Hai.</p>
                </div>
             ) : (
                <div className="space-y-3 mt-4">
                   {selectedChild.alerts.map((alert, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-3xl shadow-sm border border-red-100 flex items-start gap-4">
                         <div className="bg-red-50 p-2.5 rounded-2xl shrink-0 mt-0.5"><AlertTriangle size={20} className="text-red-500" /></div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] uppercase font-black text-slate-400">Alert</span>
                               <span className="text-[10px] font-bold text-slate-400">{alert.timestamp}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 tracking-tight">"{alert.keyword}"</h4>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-3 px-6 flex justify-between items-center shadow-lg z-20">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <BarChart2 size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Monitor</span>
        </button>
        <button onClick={() => setActiveTab('family')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'family' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <Users size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Family</span>
        </button>
        <button onClick={() => setActiveTab('web')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'web' ? 'text-indigo-700 scale-110' : 'text-slate-400'}`}>
          <Globe size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider">Safety</span>
        </button>
      </nav>

      {/* Add Modal & Success screens same as before but adapted */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-8">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Add New Child</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddChild} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Bache ka Naam</label>
                    <input type="text" value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="Eg: Rahul" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold outline-none" required autoFocus />
                 </div>
                 <button type="submit" className="w-full bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 active:scale-95">Generate ID</button>
              </form>
          </div>
        </div>
      )}

      {showSuccessScreen && (
        <div className="fixed inset-0 bg-indigo-700 z-[60] flex items-center justify-center p-6 text-center">
            <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
              <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={48} className="text-green-600" /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Success!</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Bache ke phone mein ye ID dalein:</p>
              <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-3xl p-6 mb-8 flex items-center justify-center gap-3">
                 <h2 className="text-3xl font-black text-indigo-700 tracking-wider font-mono">{lastGeneratedId}</h2>
                 <button onClick={() => navigator.clipboard.writeText(lastGeneratedId)}><Copy size={20} className="text-slate-300 hover:text-indigo-400" /></button>
              </div>
              <button onClick={() => setShowSuccessScreen(false)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl active:scale-95">Theek Hai</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ParentView;
