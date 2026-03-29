import React, { useState, useEffect } from 'react';
import ParentView from './ParentView';
import ChildView from './ChildView';
import AdminView from './AdminView';
import { ShieldCheck, Smartphone, LockKeyhole, LayoutDashboard, Lock, Unlock, Wifi, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';

export default function AppGateway() {
   const [mode, setMode] = useState(() => localStorage.getItem('suraksha_mode') || 'none');
   const [activeTab, setActiveTab] = useState('dashboard');
   const BACKEND_URL = 'http://localhost:3000';
   const [children, setChildren] = useState(() => {
      const saved = localStorage.getItem('suraksha_children');
      return saved ? JSON.parse(saved) : [
         { id: 1, name: 'Aman', age: 12, device: 'Redmi Note 10', status: 'Online', linkingCode: 'SK-492011', bannedKeywords: ['guns', 'drugs', 'porn', 'murder'], activityLogs: [], isLocked: false },
         { id: 2, name: 'Sana', age: 8, device: 'Samsung Galaxy', status: 'Offline', linkingCode: 'SK-112093', bannedKeywords: ['suicide', 'bomb', 'violence'], activityLogs: [], isLocked: false }
      ];
   });

   const [isConnected, setIsConnected] = useState(false);

   useEffect(() => {
      const socket = io(BACKEND_URL);
      
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      return () => {
         socket.disconnect();
      };
   }, []);

   const selectMode = (selectedMode) => {
      setMode(selectedMode);
      if (selectedMode !== 'none') {
         localStorage.setItem('suraksha_mode', selectedMode);
      } else {
         localStorage.removeItem('suraksha_mode');
      }
   };

   if (mode === 'admin') {
      return <AdminView onLogout={() => selectMode('none')} />;
   }

   if (mode === 'parent') {
      return <ParentView onLogout={() => selectMode('none')} />;
   }

   if (mode === 'child') {
      return <ChildView onLogout={() => selectMode('none')} />;
   }

   return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-6 font-sans text-slate-800 relative overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-indigo-200/50 rounded-full blur-[80px]"></div>
         <div className="absolute bottom-[-10%] left-[-20%] w-80 h-80 bg-blue-100/60 rounded-full blur-[80px]"></div>

         <div className="mb-10 text-center animate-in zoom-in duration-500 z-10">
            <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-indigo-100/50 inline-block mb-6 relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                <ShieldCheck size={56} className="text-indigo-600 relative z-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Suraksha Kawach</h1>
            <p className="text-slate-500 font-medium mt-2">Aapka sateek parental control</p>
         </div>
         
         <div className="grid grid-cols-1 gap-4 w-full max-w-sm animate-in slide-in-from-bottom-8 duration-500 delay-100 z-10">
            <button 
                onClick={() => selectMode('parent')} 
                className="w-full bg-indigo-600 text-white p-5 rounded-3xl shadow-xl shadow-indigo-200 active:scale-95 transition-all hover:bg-indigo-700 flex items-center gap-4 group"
            >
               <div className="bg-indigo-500 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                   <LockKeyhole size={24} />
               </div>
               <div className="text-left flex-1" style={{ width: '100%' }}>
                 <span className="block font-black text-lg tracking-wide">Main Parent Hoon</span>
                 <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5 block">Controls & Dashboard</span>
               </div>
            </button>

            <button 
                onClick={() => selectMode('child')} 
                className="w-full bg-white text-slate-700 p-5 rounded-3xl shadow-lg border border-slate-100 active:scale-95 transition-all hover:bg-slate-50 flex items-center gap-4 group"
            >
               <div className="bg-emerald-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                   <Smartphone size={24} className="text-emerald-500" />
               </div>
               <div className="text-left flex-1" style={{ width: '100%' }}>
                 <span className="block font-black text-lg tracking-wide">Main Bacha Hoon</span>
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">Launch Safe Environment</span>
               </div>
            </button>

            <button 
                onClick={() => selectMode('admin')} 
                className="w-full bg-slate-900 text-white p-5 rounded-3xl shadow-lg border border-slate-800 active:scale-95 transition-all hover:bg-slate-800 flex items-center gap-4 group"
            >
               <div className="bg-slate-700 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                   <LayoutDashboard size={24} className="text-indigo-400" />
               </div>
               <div className="text-left flex-1" style={{ width: '100%' }}>
                 <span className="block font-black text-lg tracking-wide">Main Admin Hoon</span>
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 block">System Management</span>
               </div>
            </button>
         </div>
         
         <div className="mt-12 text-center animate-in fade-in duration-700 delay-300 z-10 flex flex-col items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${
                isConnected 
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse'
             }`}>
                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isConnected ? 'Server Online' : 'Server Offline'}
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                 <ShieldCheck size={12} /> Unified Protection System
             </p>
         </div>
      </div>
   );
}
