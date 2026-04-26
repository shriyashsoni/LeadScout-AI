import React, { useState } from 'react';
import Search from './pages/Search';
import Dashboard from './pages/Dashboard';
import axios from 'axios';
import { useQuery, useMutation } from "convex/react";
import { api } from "./convex/api.js";

function App() {
  const [view, setView] = useState('search');
  const [isSearching, setIsSearching] = useState(false);
  
  // Convex integration
  const leads = useQuery(api.leads.getLeads) || [];
  const insertLead = useMutation(api.leads.insertLead);
  const clearLeads = useMutation(api.leads.clearLeads);

  const handleSearch = async (params) => {
    setIsSearching(true);
    try {
      const response = await axios.post('http://localhost:3001/api/search', params);
      const foundLeads = response.data.leads || [];
      
      for (const lead of foundLeads) {
        await insertLead({
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
          createdAt: Date.now()
        });
      }
      
      setView('dashboard');
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Check if backend is running.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear all leads?')) {
      await clearLeads();
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <nav className="border-b border-black/5 py-6 px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tight cursor-pointer" onClick={() => setView('search')}>
            <div className="w-10 h-10 bg-black rounded-sm flex items-center justify-center transform rotate-3">
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
