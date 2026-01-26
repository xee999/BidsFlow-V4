
import React, { useState, useRef, useMemo } from 'react';
import { 
  Archive, Search, Plus, FileText, 
  Award, Layers, Loader2, Download, 
  Sparkles, Filter, Clock, 
  Edit3, Tag, 
  BookOpen, X, Save,
  FolderOpen, Hash, Trash2,
  FileCode, ShieldCheck, Database, Activity,
  Calendar, Users, BadgeDollarSign, Megaphone, 
  FileBox, Globe, Zap
} from 'lucide-react';
import { TechnicalDocument } from '../types.ts';
import { indexVaultDocument } from '../services/gemini.ts';
import { clsx } from 'clsx';

const CorporateVault: React.FC<{ assets: TechnicalDocument[]; setAssets: any }> = ({ assets, setAssets }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All Documents');
  const [editingAsset, setEditingAsset] = useState<TechnicalDocument | null>(null);
  const [viewingAsset, setViewingAsset] = useState<TechnicalDocument | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    assets.forEach(a => { if (a.category) cats.add(a.category); });
    return Array.from(cats).sort();
  }, [assets]);

  const dynamicTags = useMemo(() => {
    const tags = new Set<string>();
    assets.forEach(a => a.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).slice(0, 12);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            a.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            a.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All Documents' || a.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchTerm, activeCategory]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsIndexing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const aiResult = await indexVaultDocument(file.name, base64);
        const newAsset: TechnicalDocument = {
          id: `v-${Date.now()}`,
          name: file.name,
          type: 'PDF',
          category: aiResult?.category || 'General',
          uploadDate: new Date().toLocaleDateString(),
          tags: aiResult?.tags || ['Uploaded'],
          summary: aiResult?.summary || 'No summary available.',
          fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          lastModified: 'Just now',
          timesUsed: 0
        };
        setAssets((prev: any) => [newAsset, ...prev]);
        setViewingAsset(newAsset);
      } catch (err) {
        console.error("Indexing failed", err);
      } finally {
        setIsIndexing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setAssets((prev: any) => prev.map((a: any) => a.id === editingAsset.id ? editingAsset : a));
    setEditingAsset(null);
  };

  const deleteAsset = (id: string) => {
    if (confirm("Remove this asset from the library?")) {
      setAssets((prev: any) => prev.filter((a: any) => a.id !== id));
      if (viewingAsset?.id === id) setViewingAsset(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('hr') || c.includes('human') || c.includes('people') || c.includes('talent') || c.includes('experience')) return <Users size={16} />;
    if (c.includes('finance') || c.includes('price') || c.includes('budget') || c.includes('billing')) return <BadgeDollarSign size={16} />;
    if (c.includes('sales') || c.includes('marketing') || c.includes('branding')) return <Megaphone size={16} />;
    if (c.includes('tech') || c.includes('it') || c.includes('code') || c.includes('solution') || c.includes('architecture')) return <FileCode size={16} />;
    if (c.includes('legal') || c.includes('compliance') || c.includes('contract') || c.includes('iso')) return <ShieldCheck size={16} />;
    if (c.includes('case') || c.includes('win') || c.includes('award') || c.includes('credential')) return <Award size={16} />;
    if (c.includes('template') || c.includes('standard')) return <Layers size={16} />;
    return <FileBox size={16} />;
  };

  const getCategoryColor = (category: string) => {
    const colors = [
      'text-blue-600 bg-blue-50 border-blue-100', 
      'text-red-600 bg-red-50 border-red-100', 
      'text-amber-600 bg-amber-50 border-amber-100', 
      'text-emerald-600 bg-emerald-50 border-emerald-100', 
      'text-purple-600 bg-purple-50 border-purple-100'
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-left font-sans">
      {/* Header */}
      <div className="px-10 py-8 flex flex-col gap-6 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Database className="text-[#D32F2F]" size={20} />
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Corporate Vault</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-8">Technical Library • {assets.length} Assets</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-700 hover:bg-slate-100 transition-all shadow-sm uppercase">
                <Sparkles size={16} className="text-amber-500" /> Auto-Group Files
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-8 py-3 bg-[#D32F2F] text-white rounded-2xl text-[11px] font-black shadow-2xl hover:bg-red-700 transition-all active:scale-95 uppercase tracking-widest"
             >
                <Plus size={18} /> New File
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D32F2F] transition-colors" />
            <input 
              type="text"
              placeholder="Quick search by name, tag, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F1F5F9] border-2 border-transparent rounded-[1.5rem] py-5 pl-16 pr-8 text-sm font-bold focus:bg-white focus:border-slate-100 transition-all shadow-inner outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation */}
        <aside className="w-80 flex flex-col p-8 space-y-12 shrink-0 bg-white border-r border-slate-100 overflow-y-auto scrollbar-hide">
          <section className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 shadow-inner">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 px-2 flex items-center justify-between">
              Categories
              <FolderOpen size={12} className="opacity-40" />
            </h3>
            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveCategory('All Documents')}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-4 rounded-2xl text-[13px] transition-all",
                  activeCategory === 'All Documents' 
                    ? "bg-white text-[#D32F2F] font-black shadow-md border border-red-50" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 font-bold"
                )}
              >
                <div className="flex items-center gap-4"><Archive size={16} /> All Files</div>
                <span className="text-[10px] font-black opacity-30">{assets.length}</span>
              </button>
              <div className="h-px bg-slate-200/50 my-6 mx-2"></div>
              {dynamicCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-4 rounded-2xl text-[13px] transition-all group",
                    activeCategory === cat 
                      ? "bg-white text-[#D32F2F] font-black shadow-md border border-red-50" 
                      : "text-slate-500 hover:bg-white hover:text-slate-900 font-bold"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={clsx("transition-colors", activeCategory === cat ? "text-[#D32F2F]" : "text-slate-300 group-hover:text-slate-600")}>
                      {getCategoryIcon(cat)}
                    </span>
                    <span className="truncate max-w-[160px]">{cat}</span>
                  </div>
                  <span className="text-[10px] font-black opacity-30">{assets.filter(a => a.category === cat).length}</span>
                </button>
              ))}
            </nav>
          </section>

          <section className="px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
              Topic Tags
              <Tag size={12} className="opacity-40" />
            </h3>
            <div className="flex flex-wrap gap-2">
              {dynamicTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSearchTerm(tag)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase hover:bg-red-50 hover:text-[#D32F2F] hover:border-red-100 transition-all shadow-sm"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC] scrollbar-hide">
          {isIndexing ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 py-20 bg-white rounded-[4rem] border border-slate-100 shadow-2xl animate-pulse">
              <Loader2 size={64} className="animate-spin text-[#D32F2F]" />
              <div className="text-center">
                <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-900 mb-2">Scanning File</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating categories and dynamic tags...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
              {filteredAssets.map(asset => {
                const colorStyles = getCategoryColor(asset.category || 'General');
                return (
                  <div 
                    key={asset.id}
                    onClick={() => setViewingAsset(asset)}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all group relative flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-2 h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={clsx("p-2.5 rounded-xl border transition-all", colorStyles)}>
                        {getCategoryIcon(asset.category || '')}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <Activity size={10} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-900">{asset.timesUsed || 0}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 mb-6">
                      <h4 className="text-[14px] font-black text-slate-900 group-hover:text-[#D32F2F] transition-colors line-clamp-2 uppercase">
                        {asset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {asset.summary}
                      </p>
                    </div>

                    {/* High Visibility Dynamic Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                       {(asset.tags || []).slice(0, 4).map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-[#1E3A5F] text-white text-[8px] font-black rounded uppercase tracking-tighter shadow-sm border border-white/10">
                             {tag}
                          </span>
                       ))}
                       {asset.tags && asset.tags.length > 4 && (
                          <span className="text-[8px] font-black text-slate-300 self-center">+{asset.tags.length - 4}</span>
                       )}
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", colorStyles)}>
                        {asset.category}
                      </span>
                      <span className="text-[9px] font-black text-slate-300 uppercase">{asset.uploadDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Detail Card */}
      {viewingAsset && !editingAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-left">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl p-12 shadow-2xl animate-in zoom-in duration-300 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                 {getCategoryIcon(viewingAsset.category || '')}
              </div>

              <div className="flex items-center justify-between relative z-10 mb-10">
                 <div className="flex items-center gap-5">
                    <div className={clsx("p-4 rounded-[1.5rem] shadow-inner border", getCategoryColor(viewingAsset.category || ''))}>
                       {getCategoryIcon(viewingAsset.category || '')}
                    </div>
                    <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Library File</span>
                       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mt-1">{viewingAsset.name}</h3>
                    </div>
                 </div>
                 <button onClick={() => setViewingAsset(null)} className="p-4 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={28} /></button>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-10 relative z-10">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">File Category</h4>
                       <div className={clsx("flex items-center gap-3 p-4 rounded-2xl border font-black text-xs uppercase", getCategoryColor(viewingAsset.category || ''))}>
                          <Hash size={14} /> {viewingAsset.category}
                       </div>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Simple Summary</h4>
                    <p className="text-[13px] font-medium leading-relaxed text-slate-600 italic">"{viewingAsset.summary}"</p>
                 </div>
              </div>

              <div className="mb-10 relative z-10">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Keywords</h4>
                 <div className="flex flex-wrap gap-2">
                    {(viewingAsset.tags || []).map(tag => (
                       <span key={tag} className="px-4 py-2 bg-[#1E3A5F] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                          {tag}
                       </span>
                    ))}
                 </div>
              </div>

              <div className="flex gap-4 relative z-10 border-t border-slate-100 pt-10">
                 <button className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm">
                    <Download size={18} /> Download
                 </button>
                 <button onClick={() => setEditingAsset(viewingAsset)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm">
                    <Edit3 size={18} /> Edit Details
                 </button>
                 <button onClick={() => deleteAsset(viewingAsset.id)} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                    <Trash2 size={24} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Editor Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 text-left">
          <form onSubmit={handleUpdateAsset} className="bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl animate-in zoom-in duration-300 space-y-8 border border-slate-100 relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-50 text-[#D32F2F] rounded-[1.5rem] shadow-inner border border-red-100">
                  <Edit3 size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Edit Info</h3>
              </div>
              <button type="button" onClick={() => setEditingAsset(null)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={24} /></button>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">File Name</label>
                <input 
                  type="text" 
                  value={editingAsset.name} 
                  onChange={(e) => setEditingAsset({...editingAsset, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-sm font-bold focus:bg-white focus:border-[#D32F2F] outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tags (Comma separated)</label>
                <input 
                  type="text" 
                  value={editingAsset.tags?.join(', ') || ''} 
                  onChange={(e) => setEditingAsset({...editingAsset, tags: e.target.value.split(',').map(t => t.trim())})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-sm font-bold focus:bg-white focus:border-[#D32F2F] outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-6 flex gap-4 relative z-10">
              <button type="button" onClick={() => setEditingAsset(null)} className="flex-1 py-4 bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100">Discard</button>
              <button type="submit" className="flex-2 py-4 bg-[#D32F2F] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 w-3/5">
                <Save size={18} /> Save Asset
              </button>
            </div>
          </form>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
    </div>
  );
};

export default CorporateVault;
