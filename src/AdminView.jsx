import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  BarChart,
  ChevronRight,
  UserCheck,
  UserMinus,
  LayoutDashboard,
  LogOut,
  Phone
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000';
const socket = io(BACKEND_URL);

const AdminView = ({ onLogout }) => {
  const [parents, setParents] = useState({});
  const [children, setChildren] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('admin-login-success', ({ parents, children }) => {
      setParents(parents);
      setChildren(children);
      setIsLoggedIn(true);
      setError('');
    });

    socket.on('admin-login-error', (msg) => {
      setError(msg);
    });

    socket.on('admin-data-update', ({ parents, children }) => {
      setParents(parents);
      setChildren(children);
    });

    return () => {
      socket.off('admin-login-success');
      socket.off('admin-login-error');
      socket.off('admin-data-update');
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    socket.emit('admin-login', password);
  };

  const setParentStatus = (mobile, status) => {
    socket.emit('admin-set-parent-status', { mobile, status });
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 items-center justify-center p-6 font-sans text-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="bg-indigo-600 p-5 rounded-3xl shadow-xl shadow-indigo-500/20 inline-block mb-6">
              <ShieldCheck size={48} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 font-medium mt-2">Enter master password to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
               <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Master Password"
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 text-lg font-bold outline-none focus:border-indigo-500 transition-all"
                  autoFocus
               />
               {error && <p className="text-rose-500 text-xs font-bold mt-2 px-2">{error}</p>}
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
               Verify Identity
            </button>
            <button type="button" onClick={onLogout} className="w-full text-slate-500 font-bold text-xs hover:text-slate-300">Exit Admin Mode</button>
          </form>
        </div>
      </div>
    );
  }

  const parentList = Object.entries(parents);
  const totalChildren = Object.keys(children).length;
  const pendingParents = parentList.filter(([_, p]) => p.status === 'Pending').length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black leading-none tracking-tight">Super Admin</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">System Controller</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-20">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="bg-indigo-50 w-10 h-10 rounded-2xl flex items-center justify-center mb-3">
               <Users size={20} className="text-indigo-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Parents</p>
            <h3 className="text-2xl font-black text-slate-800">{parentList.length}</h3>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="bg-emerald-50 w-10 h-10 rounded-2xl flex items-center justify-center mb-3">
               <Smartphone size={20} className="text-emerald-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Children</p>
            <h3 className="text-2xl font-black text-slate-800">{totalChildren}</h3>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="bg-rose-50 w-10 h-10 rounded-2xl flex items-center justify-center mb-3">
               <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Pending Approvals</p>
            <h3 className={`text-2xl font-black ${pendingParents > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{pendingParents}</h3>
          </div>
        </div>

        {/* Parent Management List */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
           <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck size={24} className="text-indigo-600" /> Parent Management
           </h2>
           
           <div className="space-y-4">
              {parentList.length === 0 ? (
                 <div className="text-center py-10 opacity-30">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="font-bold">No parents registered yet</p>
                 </div>
              ) : (
                 parentList.map(([mobile, parent]) => (
                    <div key={mobile} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-5 transition-all hover:shadow-md">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100">
                                {parent.name.charAt(0)}
                             </div>
                             <div>
                                <h3 className="font-black text-slate-800">{parent.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                   <Phone size={10} className="text-indigo-500" /> {mobile} • {parent.device}
                                </p>
                             </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                             parent.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                             parent.status === 'Blocked' ? 'bg-rose-100 text-rose-700' : 
                             'bg-amber-100 text-amber-700 animate-pulse'
                          }`}>
                             {parent.status}
                          </div>
                       </div>

                       <div className="flex gap-2">
                          {parent.status !== 'Approved' && (
                             <button 
                                onClick={() => setParentStatus(mobile, 'Approved')}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                             >
                                <UserCheck size={16} /> Approve
                             </button>
                          )}
                          {parent.status !== 'Blocked' && (
                             <button 
                                onClick={() => setParentStatus(mobile, 'Blocked')}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                             >
                                <UserMinus size={16} /> Block
                             </button>
                          )}
                       </div>
                    </div>
                 ))
              )}
           </div>
        </section>

        {/* Global Children Overview */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
           <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={24} className="text-emerald-500" /> Active Children
           </h2>
           <div className="space-y-3">
              {Object.entries(children).map(([id, child]) => (
                 <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${child.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       <div>
                          <p className="font-bold text-slate-800 text-sm">{child.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Linked to ID: {id}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-lg">
                          Locked: {child.isLocked ? 'YES' : 'NO'}
                       </p>
                    </div>
                 </div>
              ))}
              {Object.keys(children).length === 0 && (
                 <p className="text-center py-4 text-xs font-bold text-slate-400">No children linked in the system</p>
              )}
           </div>
        </section>
      </main>
    </div>
  );
};

export default AdminView;
