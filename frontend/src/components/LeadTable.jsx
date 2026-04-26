import ScoreBadge from './ScoreBadge';
import { ExternalLink, Mail, Link2, X } from 'lucide-react';

const LeadTable = ({ leads, onSelect, selectedIds }) => {
  return (
    <div className="overflow-x-auto rounded-3xl border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-black bg-brand-50 text-black text-[10px] font-black uppercase tracking-[0.2em]">
            <th className="p-6 w-12 text-center">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-2 border-black accent-black"
                onChange={(e) => onSelect(leads.map(l => l._id), e.target.checked)}
              />
            </th>
            <th className="p-6">Entity</th>
            <th className="p-6 text-center">Priority</th>
            <th className="p-6">Organization</th>
            <th className="p-6">Intelligence</th>
            <th className="p-6 text-right">Origin</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-black/5 font-medium">
          {leads.map((lead) => (
            <tr key={lead._id} className="hover:bg-brand-50 transition-colors">
              <td className="p-6 text-center">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-2 border-black accent-black"
                  checked={selectedIds.includes(lead._id)}
                  onChange={(e) => onSelect([lead._id], e.target.checked)}
                />
              </td>
              <td className="p-6">
                <div className="flex flex-col">
                  <span className="font-black text-lg text-black">
                    {lead.name}
                  </span>
                  <span className="text-[10px] text-black/30 font-bold uppercase truncate max-w-[200px]">
                    {lead.domain}
                  </span>
                </div>
              </td>
              <td className="p-6">
                <div className="flex justify-center">
                  <ScoreBadge label={lead.intentLabel} score={lead.intentScore} />
                </div>
              </td>
              <td className="p-6 text-black font-bold">
                {lead.company || 'Private'}
              </td>
              <td className="p-6">
                <div className="flex items-center gap-4">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} title={lead.email}>
                      <Mail className="w-5 h-5 hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {lead.linkedin && (
                    <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">
                      <Link2 className="w-5 h-5 hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {lead.twitter && (
                    <a href={`https://twitter.com/${lead.twitter}`} target="_blank" rel="noopener noreferrer">
                      <X className="w-5 h-5 hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {!lead.email && !lead.linkedin && !lead.twitter && <span className="text-black/10">-</span>}
                </div>
              </td>
              <td className="p-6 text-right">
                <a 
                  href={lead.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black hover:underline"
                >
                  {lead.source} <ExternalLink className="w-3 h-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
