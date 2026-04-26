import React, { useState } from 'react';
import { Download, MailPlus, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';

const ExportBar = ({ selectedLeads }) => {
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);

  const handleExport = () => {
    if (selectedLeads.length === 0) return;

    const data = selectedLeads.map(lead => ({
      Name: lead.name,
      Email: lead.email,
      Company: lead.company,
      'Company Size': lead.companySize,
      Location: lead.location,
      LinkedIn: lead.linkedin,
      Twitter: lead.twitter,
      Reddit: lead.reddit,
      'Source Platform': lead.source,
      'Source URL': lead.sourceUrl,
      'Intent Score': lead.intentScore,
      'Intent Label': lead.intentLabel,
      'Outreach Draft': lead.outreachDraft,
      'Date Found': new Date(lead.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "LeadScout_Export.xlsx");
  };

  const handleGmailDrafts = async () => {
    if (selectedLeads.length === 0) return;
    
    setIsCreatingDrafts(true);
    try {
      const response = await axios.post('http://localhost:3001/api/gmail/drafts', {
        leads: selectedLeads
      });
      
      const successCount = response.data.results.filter(r => r.success).length;
      alert(`Created ${successCount} drafts.`);
    } catch (error) {
      console.error('Gmail Draft Error:', error);
      const authResponse = await axios.get('http://localhost:3001/api/gmail/auth');
      window.open(authResponse.data.url, '_blank');
      alert('Authentication required. Check the new tab.');
    } finally {
      setIsCreatingDrafts(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-8 bg-black text-white rounded-[2rem] mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]">
      <div className="text-lg font-black uppercase tracking-widest">
        <span className="text-white/50">{selectedLeads.length}</span> Objects Identified
      </div>
      <div className="flex gap-6">
        <button 
          onClick={handleGmailDrafts}
          disabled={selectedLeads.length === 0 || isCreatingDrafts}
          className="inline-flex items-center gap-3 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-20"
        >
          {isCreatingDrafts ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MailPlus className="w-5 h-5" />
          )}
          Prepare Drafts
        </button>
        <button 
          onClick={handleExport}
          disabled={selectedLeads.length === 0}
          className="inline-flex items-center gap-3 px-8 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 disabled:opacity-20"
        >
          <Download className="w-5 h-5" />
          Export XLSX
        </button>
      </div>
    </div>
  );
};

export default ExportBar;
