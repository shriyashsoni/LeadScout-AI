import { useState, useEffect } from 'react';
import Search from './pages/Search';
import Dashboard from './pages/Dashboard';
import axios from 'axios';

const LOCAL_LEADS_KEY = 'leadscout.local.leads';

function readLocalLeads() {
  try {
    const raw = window.localStorage.getItem(LOCAL_LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to read local leads:', error);
    return [];
  }
}

function writeLocalLeads(leads) {
  try {
    window.localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads));
  } catch (error) {
    console.error('Failed to persist local leads:', error);
  }
}

function App() {
  const [view, setView] = useState('search');
  const [isSearching, setIsSearching] = useState(false);
  const [localLeads, setLocalLeads] = useState(() => {
    return typeof window === 'undefined' ? [] : readLocalLeads();
  });
  const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const leads = localLeads;

  useEffect(() => {
    console.log("LeadScout App Initialized");
  }, []);

  const handleSearch = async (params) => {
    setIsSearching(true);
    try {
      const response = await axios.post(`${backendUrl}/api/search`, params);
      const foundLeads = response.data.leads || [];
      
      const normalizedLeads = foundLeads.map((lead) => ({
        _id: lead._id || `${lead.sourceUrl || lead.email || lead.name || 'lead'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: lead.name || 'Unknown',
        email: lead.email || null,
        domain: lead.domain || '',
        source: lead.source || 'unknown',
        sourceUrl: lead.sourceUrl || '',
        company: lead.company || null,
        companySize: lead.companySize || null,
        location: lead.location || null,
        linkedin: lead.linkedin || null,
        twitter: lead.twitter || null,
        reddit: lead.reddit || null,
        intentScore: lead.intentScore || 1,
        intentLabel: lead.intentLabel || 'cold',
        outreachDraft: lead.outreachDraft || '',
        rawSnippet: lead.rawSnippet || lead.snippet || '',
        createdAt: lead.createdAt || Date.now(),
      }));

      const nextLeads = [...normalizedLeads, ...localLeads.filter((existing) => {
        return !normalizedLeads.some((incoming) => {
          return incoming.sourceUrl && existing.sourceUrl
            ? incoming.sourceUrl === existing.sourceUrl
            : incoming.email && existing.email
              ? incoming.email === existing.email
              : incoming._id === existing._id;
        });
      })];
      setLocalLeads(nextLeads);
      writeLocalLeads(nextLeads);
      
      setView('dashboard');
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Make sure the backend is running and reachable.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear all leads?')) {
      setLocalLeads([]);
      writeLocalLeads([]);
    }
  };

  // If we are in a loading state and no leads yet
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <nav className="border-b border-black/5 py-6 px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tight cursor-pointer" onClick={() => setView('search')}>
            <div className="w-10 h-10 bg-black rounded-sm flex items-center justify-center transform rotate-3 shadow-lg shadow-black/10">
              <div className="w-5 h-5 bg-white rounded-full" />
            </div>
            LeadScout
          </div>
          <div className="flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-black/40">
            {leads.length > 0 && (
              <button 
                onClick={() => setView('dashboard')}
                className={`hover:text-black transition-all ${view === 'dashboard' ? 'text-black border-b-2 border-black' : ''}`}
              >
                Dashboard ({leads.length})
              </button>
            )}
            <button 
              onClick={handleClear}
              className="hover:text-red-600 transition-colors"
            >
              Clear
            </button>
            <button className="px-6 py-2 bg-black text-white rounded-full hover:bg-black/90 transition-all text-xs">
              Account
            </button>
          </div>
        </div>
      </nav>

      <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700 mb-1">Open Access</div>
          <div className="text-sm text-amber-900">
            This app stores leads locally in your browser, so it works without Convex login or deployment.
          </div>
        </div>
      </div>

      <main className="min-h-[calc(100vh-200px)]">
        {view === 'search' ? (
          <Search onSearch={handleSearch} isSearching={isSearching} />
        ) : (
          <Dashboard 
            leads={leads} 
            onBack={() => setView('search')} 
            onRefresh={() => handleSearch({})} 
          />
        )}
      </main>

      <footer className="py-16 px-12 border-t border-black/5 mt-32 bg-brand-50">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="text-black font-black text-xl mb-2">LeadScout</div>
          <div className="text-black/30 text-[10px] tracking-[0.3em] uppercase">
            Powered by AI &bull; Built for Growth &bull; 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
