import { useState } from 'react';
import { Search as SearchIcon, Sparkles, Target } from 'lucide-react';

const Search = ({ onSearch, isSearching }) => {
  const [keyword, setKeyword] = useState('');
  const [niche, setNiche] = useState('');
  const [count, setCount] = useState(25);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keyword || !niche) return;
    onSearch({ keyword, niche, targetCount: count });
  };

  return (
    <div className="max-w-3xl mx-auto py-24 px-8">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8">
          <Sparkles className="w-3 h-3" />
          AI Intelligence
        </div>
        <h1 className="text-7xl font-black text-black mb-8 tracking-tighter leading-[0.9]">
          Discover <br/> Leads. <br/> <span className="text-black/20">Automated.</span>
        </h1>
        <p className="text-black/40 text-xl font-medium max-w-lg mx-auto">
          High-performance lead generation. <br/>
          Simple. Fast. Effective.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border-2 border-black p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-widest text-black/50">Discovery Keyword</label>
          <div className="relative">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/20" />
            <input 
              type="text" 
              placeholder="e.g. looking for web developers"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-brand-50 border-2 border-black/5 rounded-2xl text-black font-bold placeholder:text-black/10 focus:outline-none focus:border-black transition-all text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Your Niche</label>
            <div className="relative">
              <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
              <input 
                type="text" 
                placeholder="e.g. Agency"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full pl-16 pr-6 py-4 bg-brand-50 border-2 border-black/5 rounded-xl text-black font-bold placeholder:text-black/10 focus:outline-none focus:border-black transition-all"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Sample Size</label>
            <select 
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-6 py-4 bg-brand-50 border-2 border-black/5 rounded-xl text-black font-bold focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
            >
              <option value={10}>10 Leads</option>
              <option value={25}>25 Leads</option>
              <option value={50}>50 Leads</option>
              <option value={100}>100 Leads</option>
            </select>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSearching}
          className="w-full py-6 bg-black text-white rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-4"
        >
          {isSearching ? (
            <>
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Generate Leads Now'
          )}
        </button>
      </form>
    </div>
  );
};

export default Search;
