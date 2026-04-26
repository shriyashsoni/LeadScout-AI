import React, { useState } from 'react';
import LeadTable from '../components/LeadTable';
import ExportBar from '../components/ExportBar';
import { Filter, Search as SearchIcon, ArrowLeft, RefreshCw } from 'lucide-react';

const Dashboard = ({ leads, onBack, onRefresh }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === 'all' || lead.intentLabel.toLowerCase() === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleSelect = (ids, checked) => {
    if (checked) {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    } else {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const selectedLeads = leads.filter(l => selectedIds.includes(l._id));

  return (
    <div className="max-w-7xl mx-auto py-16 px-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-8">
        <div className="flex items-center gap-8">
          <button 
            onClick={onBack}
            className="p-4 border-2 border-black rounded-full hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-6xl font-black text-black tracking-tighter">Lead Feed</h1>
            <p className="text-black/30 text-sm font-bold uppercase tracking-widest mt-2">
              Analyzed {leads.length} records &bull; {selectedIds.length} selected
            </p>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-black text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        >
          <RefreshCw className="w-5 h-5" />
          Synchronize
        </button>
      </div>

      <ExportBar selectedLeads={selectedLeads} />

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/20" />
          <input 
            type="text" 
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-4 bg-brand-50 border-2 border-black rounded-2xl text-black font-bold focus:outline-none focus:ring-0 transition-all"
          />
        </div>
        <div className="flex items-center gap-4 px-6 bg-brand-50 border-2 border-black rounded-2xl">
          <Filter className="w-5 h-5 text-black/40" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-black font-black uppercase tracking-widest text-xs py-4 focus:outline-none appearance-none cursor-pointer pr-8"
          >
            <option value="all">Everywhere</option>
            <option value="hot">High Intent</option>
            <option value="warm">Moderate</option>
            <option value="cold">Dormant</option>
          </select>
        </div>
      </div>

      <LeadTable 
        leads={filteredLeads} 
        onSelect={handleSelect} 
        selectedIds={selectedIds} 
      />
      
      {filteredLeads.length === 0 && (
        <div className="py-32 text-center bg-brand-50 rounded-[3rem] border-4 border-dashed border-black/5">
          <p className="text-black/20 font-black text-2xl uppercase tracking-tighter">No Matches Found</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
