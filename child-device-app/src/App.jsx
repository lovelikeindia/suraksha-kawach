import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  LockKeyhole, 
  CheckCircle2, 
  AlertCircle,
  EyeOff,
  Clock,
  MapPin,
  Activity,
  Shield,
  Wifi,
  Battery,
  Settings,
  Phone,
  Search,
  ArrowLeft,
  Globe,
  Play,
  Camera,
  Heart,
  MessageCircle
} from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST;
const BACKEND_URL = BACKEND_HOST ? `https://${BACKEND_HOST}` : 'http://localhost:3000';
const socket = io(BACKEND_URL);

const App = () => {
  const [linkingCode, setLinkingCode] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');

  // Dummy status for dashboard
  const [timeRemaining, setTimeRemaining] = useState('2h 15m');

  const [deviceLocked, setDeviceLocked] = useState(false);
  const [activeApp, setActiveApp] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFakeResults, setShowFakeResults] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem('suraksha_child_id');
    if (savedCode) {
       setLinkingCode(savedCode);
       setIsLinking(true);
       socket.emit('child-link', savedCode);
    }
    
    socket.on('connect', () => {
       const retryCode = localStorage.getItem('suraksha_child_id') || linkingCode;
       if (retryCode) {
          socket.emit('child-link', retryCode);
       }
    });

    socket.on('link-success', ({ name, isLocked }) => {
       setIsLinking(false);
       setIsLinked(true);
       setDeviceLocked(isLocked);
    });

    socket.on('link-error', (err) => {
       setIsLinking(false);
       setError(err);
       localStorage.removeItem('suraksha_child_id');
    });

    socket.on('lock-status-changed', (status) => {
       setDeviceLocked(status);
    });

    return () => {
       socket.off('connect');
       socket.off('link-success');
       socket.off('link-error');
       socket.off('lock-status-changed');
    };
  }, [linkingCode]);

  const handleLinkDevice = (e) => {
    e.preventDefault();
    
    const isValidFormat = /^SK-\d{6}$/.test(linkingCode);

    if (!isValidFormat) {
      setError('Galat Code! Kripya sahi ID daliye (Jaise: SK-123456)');
      return;
    }
    
    setError('');
    setIsLinking(true);
    localStorage.setItem('suraksha_child_id', linkingCode);
    socket.emit('child-link', linkingCode);
  };

  if (deviceLocked) {
     return (
       <div className="flex flex-col h-screen bg-rose-600 font-sans text-white items-center justify-center p-8 z-50 fixed inset-0 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white/20 p-6 rounded-full mb-8 animate-pulse shadow-[0_0_60px_rgba(255,255,255,0.4)]">
             <LockKeyhole size={80} className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Device Locked</h1>
          <p className="text-center text-rose-100 font-medium text-lg leading-relaxed">Aapke parent ne phone screen lock kar di hai.<br/><br/>Jab tak woh unlock nahi karte, aap phone chalana bandh rakhein aur padhne ka kaam karein.</p>
       </div>
     );
  }

  if (isLinked) {
    if (activeApp === 'browser') {
       return (
          <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 relative z-40">
             <div className="bg-white px-4 py-8 shadow-sm border-b border-slate-200">
                <div className="flex items-center gap-3">
                   <button onClick={() => { setActiveApp('home'); setShowFakeResults(false); setSearchQuery(''); }} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:scale-95 transition-all text-slate-500">
                      <ArrowLeft size={24} />
                   </button>
                   <form 
                      onSubmit={(e) => {
                         e.preventDefault();
                         if(!searchQuery.trim()) return;
                         
                         socket.emit('perform-search', { id: linkingCode, keyword: searchQuery, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                         
                         setShowFakeResults(true);
                      }} 
                      className="flex-1"
                   >
                     <div className="relative flex items-center">
                        <input 
                           type="text" 
                           value={searchQuery}
                           onChange={(e) => { setSearchQuery(e.target.value); setShowFakeResults(false); }}
                           className="w-full bg-slate-100 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 rounded-full py-3 pl-5 pr-12 text-sm font-bold text-slate-700 transition-all outline-none"
                           placeholder="Kuch bhi search karein..."
                           autoFocus
                        />
                        <button type="submit" className="absolute right-2 p-2 bg-indigo-600 rounded-full text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all">
                           <Search size={16} />
                        </button>
                     </div>
                   </form>
                </div>
             </div>

             <div className="flex-1 p-6 overflow-y-auto">
                {!showFakeResults ? (
                   <div className="flex flex-col items-center justify-center mt-20 opacity-30">
                      <Globe size={64} className="mb-4 text-slate-400" />
                      <p className="font-bold text-slate-500 text-center">Google Search Clone<br/>Testing Browser</p>
                   </div>
                ) : (
                   <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                         <p className="text-xs text-indigo-600 font-black mb-1">www.example.com</p>
                         <h3 className="text-blue-700 font-bold text-lg mb-1 leading-tight hover:underline">Results for "{searchQuery}"</h3>
                         <p className="text-sm text-slate-600 leading-snug">This is a simulated search result page. The safety filter operates invisibly in the background.</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                         <p className="text-xs text-indigo-600 font-black mb-1">Wikipedia</p>
                         <h3 className="text-blue-700 font-bold text-lg mb-1 leading-tight hover:underline">Information about {searchQuery}</h3>
                         <p className="text-sm text-slate-600 leading-snug">Read more about the history and details of your search query here.</p>
                      </div>
                   </div>
                )}
             </div>
          </div>
       );
    }

    if (activeApp === 'youtube') {
       return (
           <div className="flex flex-col h-screen bg-white font-sans text-slate-800 relative z-40">
              <div className="bg-white px-4 py-4 shadow-sm border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
                 <button onClick={() => setActiveApp('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:scale-95"><ArrowLeft size={24} /></button>
                 <div className="flex items-center gap-2 font-black text-xl tracking-tighter"><div className="bg-red-600 text-white rounded-lg p-1 px-2 text-[10px] leading-tight flex items-center justify-center"><Play size={10} fill="currentColor" /></div> YouTube Clone</div>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-100">
                 {[
                   { title: 'Learn React in 10 Minutes', channel: 'Code Ninja', views: '1.2M views', thumb: 'bg-blue-400' },
                   { title: 'Minecraft Survival Episode 1', channel: 'GamerKid', views: '800K views', thumb: 'bg-green-500' },
                   { title: 'Funny Dogs Compilation', channel: 'Animal Lovers', views: '2.5M views', thumb: 'bg-amber-400' },
                   { title: 'Maths Chapter 4 Explained', channel: 'Study Well', views: '50K views', thumb: 'bg-indigo-400' }
                 ].map((vid, i) => (
                    <div key={i} className="bg-white mb-2 pb-4 cursor-pointer" onClick={() => {
                       socket.emit('track-activity', { id: linkingCode, app: 'YouTube', detail: `Watching: "${vid.title}"`, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                       alert(`[Simulating] Now playing video: ${vid.title}`);
                    }}>
                       <div className={`w-full h-48 ${vid.thumb} relative flex items-center justify-center shadow-inner`}>
                          <Play size={48} className="text-white opacity-40 shadow-sm" fill="currentColor" />
                          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">10:05</span>
                       </div>
                       <div className="px-4 mt-3 flex gap-3 items-start">
                          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                          <div>
                             <h3 className="font-bold text-slate-800 leading-snug">{vid.title}</h3>
                             <p className="text-xs text-slate-500 mt-1 font-medium">{vid.channel} • {vid.views}</p>
                          </div>
                          <div className="ml-auto mt-1 flex flex-col gap-1 opacity-40">
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
       );
    }

    if (activeApp === 'instagram') {
       return (
           <div className="flex flex-col h-screen bg-white font-sans text-slate-800 relative z-40">
              <div className="bg-white px-4 py-4 shadow-sm border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setActiveApp('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:scale-95"><ArrowLeft size={24} /></button>
                    <div className="font-bold text-xl text-slate-800 font-serif italic text-transparent bg-clip-text bg-gradient-to-tr from-yellow-500 to-pink-600">Instagram</div>
                 </div>
                 <Camera size={24} className="text-slate-800" />
              </div>
              <div className="flex-1 overflow-y-auto pb-8">
                 {[
                   { user: 'rohit_sharma', place: 'Mumbai, India', img: 'bg-slate-800 text-white', text: 'Match Day!', likes: '2,943,102' },
                   { user: 'meme_mandir', place: '', img: 'bg-purple-500 text-white', text: 'Tag a friend', likes: '10K' },
                   { user: 'national.geo', place: 'Africa', img: 'bg-amber-700 text-amber-100', text: 'Wild life photography.', likes: '500K'}
                 ].map((post, i) => (
                    <div key={i} className="mb-4 bg-white" onClick={() => {
                       socket.emit('track-activity', { id: linkingCode, app: 'Instagram', detail: `Viewing post by @${post.user}`, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                    }}>
                       <div className="px-3 py-2 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-[2px]"><div className="w-full h-full bg-white rounded-full border-2 border-white"></div></div>
                              <div>
                                 <p className="text-xs font-bold text-slate-800 leading-tight">{post.user}</p>
                                 {post.place && <p className="text-[9px] text-slate-500 font-medium">{post.place}</p>}
                              </div>
                           </div>
                           <div className="flex gap-1 opacity-50">
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                             <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                           </div>
                       </div>
                       <div className={`w-full h-96 ${post.img} flex items-center justify-center cursor-pointer shadow-inner`}>
                          <p className="font-bold opacity-80 text-sm">View Post ({post.text})</p>
                       </div>
                       <div className="px-3 py-3">
                          <div className="flex gap-4 mb-2">
                             <Heart size={24} className="text-slate-800 cursor-pointer active:scale-95 transition hover:text-red-500" />
                             <MessageCircle size={24} className="text-slate-800 cursor-pointer active:scale-95 transition" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">{post.likes} likes</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
       );
    }

    const apps = [
      { name: 'YouTube', onClick: () => setActiveApp('youtube'), icon: <div className="bg-red-500 w-full h-full rounded-2xl flex items-center justify-center shadow-inner"><div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div></div> },
      { name: 'WhatsApp', icon: <div className="bg-green-500 w-full h-full rounded-2xl flex items-center justify-center text-white"><Phone size={24} /></div> },
      { name: 'Browser', onClick: () => setActiveApp('browser'), icon: <div className="bg-gradient-to-tr from-cyan-400 to-blue-600 w-full h-full rounded-2xl flex items-center justify-center text-white"><Globe size={24} /></div> },
      { name: 'Instagram', onClick: () => setActiveApp('instagram'), icon: <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 w-full h-full rounded-2xl flex items-center justify-center text-white"><Activity size={24} /></div> },
      { name: 'Photos', icon: <div className="bg-blue-400 w-full h-full rounded-2xl flex items-center justify-center text-white"><MapPin size={24} /></div> },
      { name: 'Settings', icon: <div className="bg-slate-300 w-full h-full rounded-2xl flex items-center justify-center text-slate-700"><Settings size={24} /></div> },
    ];

    return (
      <div className="flex flex-col h-screen bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center font-sans text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 py-4 z-10 text-white drop-shadow-md">
          <span className="text-sm font-bold drop-shadow">9:41</span>
          <div className="flex gap-2 drop-shadow">
            <Wifi size={16} />
            <Battery size={16} />
          </div>
        </div>

        {/* Home Screen Apps */}
        <main className="flex-1 px-6 pt-10 pb-10 z-10 flex flex-col items-center">
          
          <div className="grid grid-cols-4 gap-x-6 gap-y-8 w-full mt-4">
             {apps.map((app, i) => (
                <div key={i} onClick={app.onClick} className="flex flex-col items-center justify-center gap-2 group active:scale-95 transition-transform cursor-pointer">
                   <div className="w-14 h-14 shadow-lg shadow-black/20 rounded-2xl">
                     {app.icon}
                   </div>
                   <span className="text-[10px] font-bold text-white drop-shadow-md">{app.name}</span>
                </div>
             ))}
          </div>

          {/* Suraksha Kawach Persistent Badge */}
          <div className="mt-auto flex items-center justify-center w-full mb-6">
            <div className="bg-emerald-500/90 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-400/50 flex items-center gap-2 shadow-xl animate-in slide-in-from-bottom-6 duration-700">
               <ShieldCheck size={16} className="text-white" />
               <span className="text-xs font-bold tracking-wide">Suraksha Kawach Active</span>
            </div>
          </div>
        </main>

        {/* Bottom Dock */}
        <div className="mx-4 mb-6 z-10 bg-white/20 backdrop-blur-xl border border-white/20 rounded-3xl p-4 flex justify-around shadow-2xl">
           <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg text-white">
              <Phone size={22} fill="currentColor" />
           </div>
           <div onClick={() => setActiveApp('browser')} className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-lg text-white cursor-pointer active:scale-95 transition-transform">
              <Globe size={22} />
           </div>
           <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg text-white">
              <Clock size={22} />
           </div>
           <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shadow-lg text-slate-800">
              <Shield size={22} />
           </div>
        </div>
      </div>
    );
  }

  // Setup Screen
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-indigo-200/50 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-80 h-80 bg-blue-100/60 rounded-full blur-[80px]"></div>

      <div className="flex-1 flex flex-col justify-center px-6 z-10">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="bg-white p-5 rounded-3xl shadow-xl shadow-indigo-100/50 border border-white relative z-10">
                <LockKeyhole size={40} className="text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Child Mode Setup</h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Mummy ya Papa ki 'Suraksha Kawach' app mein di gayi ID ko yahan likhiye.
            </p>
          </div>

          <form onSubmit={handleLinkDevice} className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 delay-200">
            <div className="relative">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2 px-2">Linking ID</label>
              <div className="relative flex items-center">
                <Smartphone size={20} className="absolute left-4 text-slate-400 z-10" />
                <input 
                  type="text" 
                  value={linkingCode}
                  onChange={(e) => setLinkingCode(e.target.value.toUpperCase())}
                  placeholder="SK-XXXXXX"
                  className={`w-full bg-white border-2 rounded-2xl py-4 pl-12 pr-4 text-lg font-black tracking-widest placeholder:text-slate-300 placeholder:font-medium transition-all outline-none focus:ring-4 focus:ring-indigo-100 ${
                    error ? 'border-red-300 text-red-600 focus:border-red-500' : 'border-white focus:border-indigo-400 shadow-sm text-indigo-900'
                  }`}
                  disabled={isLinking}
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 font-bold mt-2 px-2 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle size={12} /> {error}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLinking || !linkingCode}
              className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
                isLinking 
                ? 'bg-indigo-400 text-white cursor-not-allowed shadow-indigo-200' 
                : linkingCode
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  : 'bg-slate-200 text-slate-400 shadow-none'
              }`}
            >
              {isLinking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Link ho raha hai...
                </>
              ) : (
                'Jodna Shuru Karein'
              )}
            </button>
          </form>

          <div className="mt-8 text-center animate-in fade-in duration-500 delay-300">
            <p className="text-xs font-bold text-slate-400 flex justify-center items-center gap-1">
              <ShieldCheck size={14} /> Suraksha Kawach Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
