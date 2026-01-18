
import React, { useState, useRef, useEffect } from 'react';
import { StudentClass, Language, ExplanationMode, SolverState, ChatMessage, UserProfile, HistoryItem } from './types';
import { solveDoubtStream, generateVisualAid, generateVideoExplainer } from './services/geminiService';
import { Icons } from './constants';

const App: React.FC = () => {
  // User & History State
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('studybro_profile');
    return saved ? JSON.parse(saved) : { name: "Student", profilePic: null };
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('studybro_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App State
  const [studentClass, setStudentClass] = useState<StudentClass>("Class 9");
  const [language, setLanguage] = useState<Language>(Language.BENGALI);
  const [mode, setMode] = useState<ExplanationMode>(ExplanationMode.NORMAL);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [state, setState] = useState<SolverState>({
    isAnalyzing: false,
    result: null,
    error: null,
    imageUrl: null,
    diagramUrl: null,
    videoUrl: null,
    groundingUrls: [],
    isGeneratingMedia: 'none'
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const settingsPicInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('studybro_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('studybro_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setState(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile(prev => ({ ...prev, profilePic: event.target?.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSolve = async () => {
    if (!query && !state.imageUrl) return;

    setState(prev => ({ ...prev, isAnalyzing: true, result: '', error: null, diagramUrl: null, videoUrl: null }));
    
    try {
      let fullText = '';
      const stream = solveDoubtStream(
        query, 
        studentClass, 
        language, 
        mode, 
        state.imageUrl || undefined
      );

      for await (const chunk of stream) {
        fullText += chunk;
        setState(prev => ({ ...prev, result: fullText, isAnalyzing: false }));
      }
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        query: query || "Image-based doubt",
        result: fullText,
        timestamp: Date.now(),
        studentClass,
        imageUrl: state.imageUrl
      };

      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
    } catch (err: any) {
      setState(prev => ({ ...prev, isAnalyzing: false, error: "Something went wrong. Please try again." }));
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setQuery(item.query === "Image-based doubt" ? "" : item.query);
    setStudentClass(item.studentClass);
    setState(prev => ({ 
      ...prev, 
      result: item.result, 
      imageUrl: item.imageUrl || null,
      diagramUrl: null,
      videoUrl: null 
    }));
    setIsSettingsOpen(false);
  };

  const handleGenerateVisual = async () => {
    if (!state.result) return;
    setState(prev => ({ ...prev, isGeneratingMedia: 'image' }));
    try {
      const diagram = await generateVisualAid(query || "Current topic", studentClass);
      setState(prev => ({ ...prev, diagramUrl: diagram, isGeneratingMedia: 'none' }));
    } catch (err) {
      setState(prev => ({ ...prev, isGeneratingMedia: 'none' }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!state.result) return;
    setState(prev => ({ ...prev, isGeneratingMedia: 'video' }));
    try {
      const video = await generateVideoExplainer(query || "Current topic", studentClass, state.imageUrl || undefined);
      setState(prev => ({ ...prev, videoUrl: video, isGeneratingMedia: 'none' }));
    } catch (err) {
      setState(prev => ({ ...prev, isGeneratingMedia: 'none' }));
    }
  };

  const getLabel = (eng: string, ben: string) => language === Language.ENGLISH ? eng : ben;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-indigo-600 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="bg-white text-indigo-600 p-1.5 rounded-lg font-bold text-xl shadow-inner leading-none flex items-center justify-center min-w-[36px] min-h-[36px]">SB</div>
          <h1 className="text-xl font-bold tracking-tight">Study Bro</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex space-x-4 items-center text-sm font-medium">
            <span className="bg-indigo-500 px-3 py-1 rounded-full text-xs">
              {location ? "📍 Local Board Context Active" : "🌐 Standard CBSE Context"}
            </span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-2 bg-indigo-700/50 hover:bg-indigo-700 p-1 pr-3 rounded-full transition-all border border-indigo-400/30"
          >
            {profile.profilePic ? (
              <img src={profile.profilePic} className="h-8 w-8 rounded-full object-cover border border-white/20" alt="Profile" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-400 flex items-center justify-center text-white"><Icons.User /></div>
            )}
            <span className="text-sm font-semibold truncate max-w-[100px]">{profile.name}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Controls */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{getLabel("Your Class", "তোমার ক্লাস")}</label>
              <input 
                type="text"
                value={studentClass} 
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder={getLabel("e.g. Class 7", "যেমন: ক্লাস ৭")}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Language</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none text-slate-900 font-medium"
              >
                <option value={Language.BENGALI}>Bengali (বাংলা)</option>
                <option value={Language.ENGLISH}>English</option>
                <option value={Language.BANGLISH}>Banglish (Bengali-English)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Learning Mode</label>
              <div className="space-y-2">
                {[ExplanationMode.NORMAL, ExplanationMode.ELI10, ExplanationMode.EXAM].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      mode === m ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <h3 className="text-indigo-800 font-bold text-sm mb-1">Teacher Tip 🍎</h3>
            <p className="text-indigo-600 text-xs leading-relaxed">
              {getLabel("Upload a photo of your book or notebook for instant answers!", "বই বা খাতার ছবি আপলোড করলে আমি দ্রুত উত্তর দিতে পারব!")}
            </p>
          </div>
        </aside>

        {/* Solver Main Area */}
        <section className="lg:col-span-9 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <span className="mr-2">📝</span> {getLabel("Ask Your Doubt", "তোমার প্রশ্ন করো")}
            </h2>
            
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={getLabel("Ask any question... e.g., 'What is photosynthesis?'", "যেকোনো প্রশ্ন করো... যেমন: 'সালোকসংশ্লেষ কী?'")}
                  className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-900 outline-none"
                />
                
                <div className="absolute bottom-3 left-3 flex space-x-2">
                  <label className="cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center space-x-2 text-slate-600 font-medium text-sm">
                    <Icons.Gallery />
                    <span className="hidden sm:inline">{getLabel("Gallery", "গ্যালারি")}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                  <label className="cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center space-x-2 text-slate-600 font-medium text-sm">
                    <Icons.Camera />
                    <span className="hidden sm:inline">{getLabel("Camera", "ক্যামেরা")}</span>
                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="absolute bottom-3 right-3 flex space-x-2">
                  <button
                    onClick={handleSolve}
                    disabled={state.isAnalyzing || (!query && !state.imageUrl)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2 shadow-md transition-all active:scale-95"
                  >
                    {state.isAnalyzing ? <Icons.Spinner /> : <Icons.Send />}
                    <span>{state.isAnalyzing ? getLabel('Analyzing...', 'বিশ্লেষণ হচ্ছে...') : getLabel('Solve Now', 'সমাধান করো')}</span>
                  </button>
                </div>
              </div>

              {state.imageUrl && (
                <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <img src={state.imageUrl} alt="Uploaded" className="h-16 w-16 object-cover rounded-lg shadow-sm" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">{getLabel("Image Attached", "ছবি যুক্ত হয়েছে")}</p>
                    <button onClick={() => setState(p => ({ ...p, imageUrl: null }))} className="text-xs text-red-500 font-bold">{getLabel("Remove", "মুছে ফেলো")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Display */}
          {(state.result !== null || state.error) && (
            <div className={`p-6 rounded-3xl shadow-sm border animate-in fade-in slide-in-from-bottom-4 duration-500 ${state.error ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              {state.error ? (
                <p className="text-red-600 font-medium">{state.error}</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-indigo-600 font-bold text-sm uppercase tracking-wider">{getLabel("Teacher's Explanation", "শিক্ষকের ব্যাখ্যা")}</h3>
                    <div className="flex space-x-2">
                       <button 
                        onClick={handleGenerateVisual}
                        disabled={state.isGeneratingMedia !== 'none'}
                        className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-full font-bold hover:bg-amber-100 transition-all flex items-center space-x-1"
                      >
                        {state.isGeneratingMedia === 'image' ? <Icons.Spinner /> : <span>🖼️ {getLabel("Diagram", "ডায়াগ্রাম")}</span>}
                      </button>
                      <button 
                        onClick={handleGenerateVideo}
                        disabled={state.isGeneratingMedia !== 'none'}
                        className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-full font-bold hover:bg-rose-100 transition-all flex items-center space-x-1"
                      >
                        {state.isGeneratingMedia === 'video' ? <Icons.Spinner /> : <span>🎥 {getLabel("Video", "ভিডিও")}</span>}
                      </button>
                    </div>
                  </div>

                  <div className={`prose prose-slate max-w-none text-slate-900 leading-relaxed ${language === Language.BENGALI ? 'bengali-font' : ''} whitespace-pre-wrap`}>
                    {state.result || (state.isAnalyzing ? "..." : "")}
                  </div>

                  {state.groundingUrls.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">{getLabel("Sources & Extra Reading", "উৎস এবং বাড়তি পড়াশোনা")}</p>
                      <div className="flex flex-wrap gap-2">
                        {state.groundingUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 underline truncate max-w-[200px]">
                            {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.diagramUrl && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-600 uppercase">{getLabel("Visual Diagram", "চিত্র")}</p>
                        <img src={state.diagramUrl} alt="Visual Aid" className="w-full rounded-2xl border border-slate-200 shadow-sm" />
                      </div>
                    )}
                    {state.videoUrl && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-rose-600 uppercase">{getLabel("Video Explanation", "ভিডিও ব্যাখ্যা")}</p>
                        <video src={state.videoUrl} controls className="w-full rounded-2xl border border-slate-200 shadow-sm bg-black" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Settings & History Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h2 className="text-xl font-bold text-indigo-900 flex items-center">
                <span className="mr-2">⚙️</span> {getLabel("Settings & History", "সেটিংস এবং ইতিহাস")}
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Profile Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{getLabel("Your Profile", "তোমার প্রোফাইল")}</h3>
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-indigo-100 shadow-md">
                      {profile.profilePic ? (
                        <img src={profile.profilePic} className="h-full w-full object-cover" alt="Profile" />
                      ) : (
                        <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-400"><Icons.User /></div>
                      )}
                    </div>
                    <button 
                      onClick={() => settingsPicInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg scale-90 hover:scale-100 transition-transform"
                    >
                      <Icons.Camera />
                    </button>
                    <input ref={settingsPicInputRef} type="file" className="hidden" accept="image/*" onChange={handleProfilePicUpload} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-slate-600">{getLabel("Your Name", "তোমার নাম")}</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* History Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{getLabel("Doubt History", "প্রশ্নের ইতিহাস")}</h3>
                  <button 
                    onClick={() => setHistory([])}
                    className="text-xs font-bold text-red-500 hover:text-red-600"
                  >
                    {getLabel("Clear All", "সব মুছে ফেলো")}
                  </button>
                </div>
                
                {history.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">No history yet. Start solving!</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleLoadHistory(item)}
                        className="w-full text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all group flex items-start space-x-3"
                      >
                        <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0"><Icons.History /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate mb-1">{item.query}</p>
                          <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <span>{item.studentClass}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Support */}
      <footer className="fixed bottom-6 right-6 z-50 group">
        <div className="flex flex-col items-end">
          <div className="mb-4 w-72 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[400px] pointer-events-auto transition-all transform origin-bottom-right scale-0 group-hover:scale-100">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-bold text-sm">{getLabel("Ask Follow-up", "আরও কিছু জানো")}</span>
              </div>
              <button className="text-white/70 hover:text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-10 p-4">
                  👋 {getLabel("Ask me to simplify or explain a specific part!", "আমাকে সহজভাবে বোঝাতে বা কোনো নির্দিষ্ট অংশ ব্যাখ্যা করতে বলো!")}
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder={getLabel("Type a message...", "কিছু লেখো...")}
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (!val) return;
                      setChatHistory([...chatHistory, { role: 'user', text: val }]);
                      (e.target as HTMLInputElement).value = '';
                      setTimeout(() => {
                        setChatHistory(prev => [...prev, { role: 'model', text: getLabel("Of course! Let me explain that further. What specific part would you like more details on?", "অবশ্যই! আমি আরও বিস্তারিতভাবে বোঝাচ্ছি। কোন অংশটি নিয়ে তোমার আরও জানার আছে?") }]);
                      }, 1000);
                    }
                  }}
                />
                <button className="p-2 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95 transition-all">
                  <Icons.Send />
                </button>
              </div>
            </div>
          </div>

          <button className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 transition-all flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
