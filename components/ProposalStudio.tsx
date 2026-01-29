
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles, Loader2, Download, FileText, Layout,
  Bold, Italic, List, Search, Plus, Trash2,
  ChevronDown, Archive, Edit3,
  Link2, BookOpen, Eye, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Heading3, FileEdit
} from 'lucide-react';
import { BidRecord, BidStatus, ProposalSection, TechnicalDocument } from '../types.ts';
import { draftProposalSection, extractProposalOutline } from '../services/gemini.ts';
import { clsx } from 'clsx';

interface ProposalStudioProps {
  bids: BidRecord[];
  onUpdateBid: (bid: BidRecord) => void;
  vaultAssets: TechnicalDocument[];
}

const ProposalStudio: React.FC<ProposalStudioProps> = ({ bids, onUpdateBid, vaultAssets }) => {
  const [selectedBidId, setSelectedBidId] = useState<string>('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingOutline, setIsExtractingOutline] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resourceTab, setResourceTab] = useState<'bid' | 'vault'>('bid');
  const [searchAsset, setSearchAsset] = useState('');

  // Persistence Control
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const activeBids = useMemo(() => bids.filter(b => b.status === BidStatus.ACTIVE), [bids]);
  const selectedBid = useMemo(() => bids.find(b => b.id === selectedBidId), [bids, selectedBidId]);

  const sections = selectedBid?.proposalSections || [];
  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  useEffect(() => {
    const triggerAutoScan = async () => {
      if (selectedBid && (!selectedBid.proposalSections || selectedBid.proposalSections.length === 0)) {
        const tenderDoc = selectedBid.technicalDocuments.find(d => d.category === 'Tender' || d.tags?.includes('RFP'));
        if (tenderDoc?.fileData) {
          await handleScanTender(selectedBid);
        }
      }
    };
    if (selectedBidId) {
      triggerAutoScan();
    }
  }, [selectedBidId]);

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const bidDocuments = selectedBid?.technicalDocuments || [];

  const filteredAssets = useMemo(() => {
    const source = resourceTab === 'bid' ? bidDocuments : vaultAssets;
    return source.filter(a => a.name.toLowerCase().includes(searchAsset.toLowerCase()));
  }, [resourceTab, bidDocuments, vaultAssets, searchAsset]);

  const handleScanTender = async (targetBid?: BidRecord) => {
    const bidToScan = targetBid || selectedBid;
    if (!bidToScan) return;

    const tenderDoc = bidToScan.technicalDocuments.find(d => d.category === 'Tender' || d.tags?.includes('RFP'));
    if (!tenderDoc?.fileData) return;

    setIsExtractingOutline(true);
    try {
      const result = await extractProposalOutline(tenderDoc.fileData);
      if (result?.sections && result.sections.length > 0) {
        const newSections: ProposalSection[] = result.sections.map((s: any) => ({
          id: s.id || `sec-${Math.random().toString(36).substr(2, 9)}`,
          title: s.title,
          content: '',
          status: 'pending',
          wordCount: 0,
          description: s.description,
          type: s.type || 'narrative'
        }));
        onUpdateBid({ ...bidToScan, proposalSections: newSections });
        if (!activeSectionId) setActiveSectionId(newSections[0].id);
      }
    } catch (err) {
      console.error("Mapping failed", err);
    } finally {
      setIsExtractingOutline(false);
    }
  };

  const applyFormatting = (tag: string) => {
    if (!textAreaRef.current || !activeSection || isPreviewMode) return;
    const { selectionStart, selectionEnd } = textAreaRef.current;
    const text = activeSection.content;
    const selectedText = text.substring(selectionStart, selectionEnd);
    let newText = '';

    if (tag === 'bold') newText = `**${selectedText}**`;
    else if (tag === 'italic') newText = `*${selectedText}*`;
    else if (tag === 'list') newText = `\n- ${selectedText}`;
    else if (tag === 'h3') newText = `\n### ${selectedText}`;

    const updatedContent = text.substring(0, selectionStart) + newText + text.substring(selectionEnd);
    handleUpdateContent(updatedContent);
  };

  const handleLinkAssetAndDraft = async (asset: any) => {
    if (!selectedBid || !activeSection) return;

    setIsGenerating(true);
    try {
      const assetContext = `Asset Source: ${asset.name}. Summary: ${asset.summary || 'Analyze credentials'}.`;
      const draft = await draftProposalSection(
        activeSection.title,
        `Generate professional technical response for "${activeSection.title}" strictly replicating RFP forms/tables and populating them with data from ${asset.name}.`,
        selectedBid,
        assetContext
      );

      const updatedContent = activeSection.content.trim()
        ? `${activeSection.content}\n\n${draft}`
        : draft;

      handleUpdateContent(updatedContent);
    } catch (err) {
      console.error("Drafting failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSection = () => {
    if (!selectedBid) return;
    const newId = `sec-${Math.random().toString(36).substr(2, 9)}`;
    const newSection: ProposalSection = {
      id: newId,
      title: 'New Response Chapter',
      content: '',
      status: 'pending',
      wordCount: 0
    };
    onUpdateBid({ ...selectedBid, proposalSections: [...sections, newSection] });
    setActiveSectionId(newId);
  };

  const handleDeleteSection = (id: string) => {
    if (!selectedBid) return;
    const updated = sections.filter(s => s.id !== id);
    onUpdateBid({ ...selectedBid, proposalSections: updated });
    if (activeSectionId === id) setActiveSectionId(updated[0]?.id || '');
  };

  const handleUpdateSectionTitle = (id: string, newTitle: string) => {
    if (!selectedBid) return;
    const updated = sections.map(s => s.id === id ? { ...s, title: newTitle } as ProposalSection : s);
    onUpdateBid({ ...selectedBid, proposalSections: updated });
  };

  const handleUpdateContent = (content: string) => {
    if (!selectedBid) return;
    const updatedSections = sections.map(s =>
      s.id === activeSectionId ? {
        ...s,
        content,
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        status: content.length > 50 ? 'complete' : 'in-progress'
      } as ProposalSection : s
    );
    onUpdateBid({ ...selectedBid, proposalSections: updatedSections });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 py-20 opacity-50">
        <div className="p-8 bg-slate-50 rounded-full animate-pulse"><Edit3 size={48} /></div>
        <p className="italic text-sm font-bold uppercase tracking-widest text-center">Synthesis Pending...</p>
      </div>
    );

    return (
      <div className="technical-renderer animate-in fade-in duration-500 text-left">
        {text.split('\n').map((line, i) => {
          let content = line.trim();
          if (!content) return <div key={i} className="h-6"></div>;

          if (content.startsWith('|')) {
            const cells = content.split('|').filter(c => c.length > 0).map(c => c.trim().replace(/\*\*/g, ''));
            if (cells.every(c => c.match(/^[\-\:]+$/))) return null;
            return (
              <div key={i} className="overflow-x-auto my-6 border border-slate-100 rounded-xl">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-slate-50/50">
                      {cells.map((cell, idx) => (
                        <td key={idx} className="px-5 py-3 border-r border-slate-100 last:border-0 font-bold text-slate-700">{cell}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }

          if (content.startsWith('### ')) {
            return <h3 key={i} className="text-2xl font-black text-[#1E3A5F] mt-12 mb-6 border-b-4 border-[#D32F2F] pb-3 tracking-tighter uppercase">{content.replace(/^###\s*/, '').replace(/\*\*/g, '')}</h3>;
          }
          if (content.startsWith('#### ')) {
            return <h4 key={i} className="text-xl font-bold text-slate-800 mt-10 mb-5 tracking-tight">{content.replace(/^####\s*/, '').replace(/\*\*/g, '')}</h4>;
          }

          if (content.startsWith('- ') || content.startsWith('* ')) {
            const listText = content.replace(/^[\-\*]\s*/, '');
            const formatted = listText
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
            return (
              <div key={i} className="flex gap-4 ml-6 mb-4 items-start">
                <span className="text-[#D32F2F] font-black text-xl leading-none mt-1">•</span>
                <p className="text-[17px] text-slate-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: formatted }} />
              </div>
            );
          }

          const formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');

          return <p key={i} className="text-[17px] text-slate-700 leading-[1.8] mb-6 text-justify" dangerouslySetInnerHTML={{ __html: formatted }} />;
        })}
      </div>
    );
  };

  const handleAIGenerateSection = async () => {
    if (!selectedBid || !activeSection) return;
    setIsGenerating(true);

    // Provide full context: all technical documents summaries + bid details
    const docContext = bidDocuments
      .map(d => `[${d.name}] (${d.category}): ${d.summary || 'No summary available.'}`)
      .join('\n\n');

    try {
      const draft = await draftProposalSection(
        activeSection.title,
        (activeSection as any).description || 'Draft a professional technical response.',
        selectedBid,
        docContext
      );
      handleUpdateContent(draft);
    } catch (err) {
      console.error("AI Generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedBid || sections.length === 0) return;
    setIsExporting(true);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Technical Proposal - ${selectedBid.projectName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.6; color: #1e293b; background: #fff; margin: 0; padding: 0; }
          .canvas { padding: 40mm 25mm; max-width: 210mm; margin: 0 auto; }
          .page-break { page-break-after: always; }
          .cover { height: 260mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 20px solid #D32F2F; margin: -10mm; padding: 20mm; position: relative; }
          .jazz-logo { color: #D32F2F; font-weight: 800; font-size: 72px; border: 12px solid #D32F2F; padding: 25px 50px; margin-bottom: 80px; letter-spacing: -2px; }
          .subtitle { font-size: 18px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 10px; margin-bottom: 30px; }
          h1 { font-size: 64px; font-weight: 800; color: #1e3a5f; text-transform: uppercase; margin-bottom: 40px; letter-spacing: -3px; line-height: 1.1; }
          .client-box { margin-top: 60px; padding: 40px; border-top: 2px solid #e2e8f0; width: 100%; }
          .client-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 15px; }
          .client-name { font-size: 32px; font-weight: 800; color: #D32F2F; }
          .chapter-header { font-size: 32px; color: #D32F2F; border-bottom: 6px solid #D32F2F; padding-bottom: 20px; margin-top: 60px; text-transform: uppercase; font-weight: 800; letter-spacing: -1px; }
          .section-num { color: #94a3b8; font-weight: 800; font-size: 14px; letter-spacing: 3px; margin-bottom: 10px; }
          p { margin-bottom: 25px; text-align: justify; font-size: 17px; color: #334155; line-height: 1.8; }
          h3 { color: #1e3a5f; font-size: 24px; font-weight: 800; margin-top: 45px; margin-bottom: 20px; text-transform: uppercase; }
          h4 { font-size: 20px; font-weight: 700; color: #334155; margin-top: 35px; margin-bottom: 15px; }
          strong { color: #000; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          th { background: #1e3a5f; color: white; font-weight: 700; text-transform: uppercase; font-size: 12px; padding: 16px; text-align: left; }
          td { border: 1px solid #e2e8f0; padding: 14px; text-align: left; font-size: 15px; color: #475569; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .bullet-line { margin-left: 25px; margin-bottom: 12px; font-size: 17px; display: flex; gap: 12px; }
          .bullet { color: #D32F2F; font-weight: 900; }
          .footer { position: absolute; bottom: 20mm; width: 100%; text-align: center; font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 5px; }
        </style>
      </head>
      <body>
        <div class="canvas">
          <div class="cover page-break">
            <div class="jazz-logo">JAZZ BUSINESS</div>
            <div class="subtitle">Technical Proposal</div>
            <h1>${selectedBid.projectName}</h1>
            <div class="client-box">
               <div class="client-label">Prepared for</div>
               <div class="client-name">${selectedBid.customerName}</div>
            </div>
            <div class="footer">CONFIDENTIAL | PMCL PROPRIETARY</div>
          </div>
          ${sections.map((s, i) => `
            <div class="page-break">
              <div class="section-num">SECTION 0${i + 1}</div>
              <h2 class="chapter-header">${s.title}</h2>
              <div style="margin-top: 60px;">
                ${s.content.split('\n').map(l => {
      let line = l.trim();
      if (!line) return '';

      // Simple markdown parsing for export
      if (line.startsWith('### ')) return `<h3>${line.replace(/^###\s*/, '').replace(/\*\*/g, '')}</h3>`;
      if (line.startsWith('#### ')) return `<h4>${line.replace(/^####\s*/, '').replace(/\*\*/g, '')}</h4>`;
      if (line.startsWith('- ') || line.startsWith('* ')) return `<div class="bullet-line"><span class="bullet">•</span><span>${line.replace(/^[\-\*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span></div>`;

      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.length > 0);
        if (cells.every(c => c.match(/^[\-\:]+$/))) return '';
        // Check if it's a header row (often first row)
        const isHeader = i === 0 || (sections[i].content.split('\n')[i - 1]?.includes('---'));
        const tag = isHeader ? 'th' : 'td';
        return `<table><tr>${cells.map(c => `<${tag}>${c.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</${tag}>`).join('')}</tr></table>`;
      }

      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return `<p>${formatted}</p>`;
    }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const filename = `Jazz_Proposal_${selectedBid.projectName.replace(/\s+/g, '_')}.html`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const compiledDoc: TechnicalDocument = {
        id: `compiled-${Date.now()}`,
        name: filename,
        type: 'HTML/Compiled',
        category: 'Technical',
        uploadDate: new Date().toLocaleDateString(),
        tags: ['Compiled', 'Final', 'RFP-Replicated'],
        summary: 'Technical response document replicated from RFP templates.'
      };
      onUpdateBid({ ...selectedBid, technicalDocuments: [...selectedBid.technicalDocuments, compiledDoc] });
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Persistence failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-left">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-50 shrink-0">
        <div className="flex items-center gap-10 flex-1 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-[#D32F2F] text-white rounded-2xl shadow-xl shadow-red-100/50"><FileEdit size={20} /></div>
            <div className="hidden sm:block">
              <h1 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none">Proposal Studio</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
                <Sparkles size={10} className="text-[#FFC107] animate-pulse" /> Unified Jazz Editor
              </p>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100 shrink-0 mx-2"></div>
          <div className="relative max-w-sm w-full group shrink-1 min-w-[200px]">
            <select
              value={selectedBidId}
              onChange={(e) => setSelectedBidId(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3 text-xs font-black text-slate-700 focus:ring-4 focus:ring-red-50 focus:border-[#D32F2F] outline-none appearance-none cursor-pointer hover:bg-white transition-all shadow-inner truncate"
            >
              <option value="" disabled>Activate Opportunity Context...</option>
              {activeBids.map(b => <option key={b.id} value={b.id}>{b.projectName}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0 ml-4 min-w-max">
          <div className="flex bg-slate-100/50 p-1.5 rounded-[1.2rem] border border-slate-200 shadow-inner shrink-0">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={clsx("p-2.5 rounded-lg transition-all shrink-0", leftPanelOpen ? "text-[#D32F2F] bg-white shadow-md" : "text-slate-400 hover:text-slate-700")}
              title="Toggle Section Map"
            >
              {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={clsx("p-2.5 rounded-lg transition-all shrink-0", rightPanelOpen ? "text-[#D32F2F] bg-white shadow-md" : "text-slate-400 hover:text-slate-700")}
              title="Toggle Asset Intelligence"
            >
              {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>

          <button
            onClick={handleFinalize}
            disabled={isExporting || !selectedBid || sections.length === 0}
            className="flex items-center gap-3 px-8 py-3 bg-[#1E3A5F] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-2xl hover:bg-blue-900 transition-all disabled:opacity-50 transform active:scale-95 shrink-0"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Finalize Proposal
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Sidebar: Section Map */}
        <aside className={clsx(
          "bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 h-full",
          leftPanelOpen ? "w-72" : "w-0 overflow-hidden border-none"
        )}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2.5"><Layout size={14} /> Section Map</h3>
            <button onClick={handleAddSection} className="p-2.5 bg-white text-[#D32F2F] rounded-xl border border-slate-200 hover:bg-red-50 transition-all shadow-sm"><Plus size={16} /></button>
          </div>

          {isExtractingOutline && (
            <div className="mx-5 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-pulse shadow-sm">
              <Loader2 size={16} className="animate-spin text-[#D32F2F]" />
              <span className="text-[9px] font-black text-[#D32F2F] uppercase tracking-widest leading-none">Scanning RFP Structure...</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            {sections.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setActiveSectionId(s.id)}
                className={clsx(
                  "p-5 rounded-[2rem] border cursor-pointer transition-all group relative animate-in fade-in slide-in-from-left-4",
                  activeSectionId === s.id
                    ? "bg-[#D32F2F] text-white shadow-2xl shadow-red-100/50 border-[#D32F2F] -translate-y-0.5"
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={clsx("text-[9px] font-black uppercase tracking-widest", activeSectionId === s.id ? "text-red-100" : "text-slate-300")}>Chapter 0{idx + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(s.id); }} className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-white/20 rounded"><Trash2 size={12} /></button>
                </div>
                <input
                  value={s.title}
                  onChange={(e) => handleUpdateSectionTitle(s.id, e.target.value)}
                  className={clsx("text-xs font-black uppercase w-full bg-transparent border-none p-0 focus:ring-0 truncate", activeSectionId === s.id ? "text-white" : "text-slate-900")}
                  placeholder="Draft Chapter..."
                />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Document Workspace */}
        <main className="flex-1 flex flex-col bg-[#F1F5F9] overflow-hidden relative h-full">
          {selectedBid && activeSection ? (
            <>
              {/* Document Toolbar */}
              <div className="px-10 py-3 bg-white border-b border-slate-200 flex justify-between items-center z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                    <button onClick={() => applyFormatting('h3')} className="p-2.5 text-slate-400 hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-all" title="Add Heading"><Heading3 size={18} /></button>
                    <button onClick={() => applyFormatting('bold')} className="p-2.5 text-slate-400 hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-all" title="Bold Text"><Bold size={18} /></button>
                    <button onClick={() => applyFormatting('italic')} className="p-2.5 text-slate-400 hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-all" title="Italic Text"><Italic size={18} /></button>
                    <button onClick={() => applyFormatting('list')} className="p-2.5 text-slate-400 hover:text-[#D32F2F] hover:bg-red-50 rounded-lg transition-all" title="Bullet List"><List size={18} /></button>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={clsx(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      isPreviewMode ? "bg-[#1E3A5F] text-white shadow-lg" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
                    )}
                  >
                    {isPreviewMode ? <Edit3 size={14} /> : <Eye size={14} />}
                    {isPreviewMode ? 'Return to Editing' : 'Review High-Fidelity'}
                  </button>
                </div>
                <button onClick={handleAIGenerateSection} disabled={isGenerating} className="px-8 py-2.5 bg-[#D32F2F] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-2xl hover:bg-red-700 transition-all flex items-center gap-3 disabled:opacity-50 transform active:scale-95 shrink-0">
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Saturate with AI
                </button>
              </div>

              {/* Central Sheet View */}
              <div className="flex-1 overflow-y-auto p-12 flex justify-center scrollbar-hide">
                <div className="w-full max-w-[850px] bg-white rounded-sm border border-slate-200 shadow-2xl min-h-[1100px] p-20 flex flex-col relative animate-in zoom-in-95 duration-500">
                  <div className="mb-14 pb-10 border-b-2 border-slate-50 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black text-[#D32F2F] uppercase tracking-[0.4em] bg-red-50 px-2 py-0.5 rounded">Technical Proposal Component</span>
                      <h2 className="text-4xl font-black text-slate-900 mt-4 tracking-tighter leading-tight">{activeSection.title}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Opportunity</p>
                      <p className="text-xs font-black text-[#1E3A5F] uppercase truncate max-w-[200px]">{selectedBid.projectName}</p>
                    </div>
                  </div>

                  {isPreviewMode ? (
                    <div className="flex-1 text-left">
                      {renderMarkdown(activeSection.content)}
                    </div>
                  ) : (
                    <textarea
                      ref={textAreaRef}
                      value={activeSection.content}
                      onChange={(e) => handleUpdateContent(e.target.value)}
                      placeholder="Synthesize technical response here... (Markdown supported)"
                      className="flex-1 w-full text-slate-700 leading-[2.6] text-[18px] font-medium outline-none resize-none placeholder:text-slate-200 selection:bg-red-50 bg-transparent"
                    />
                  )}

                  <div className="mt-20 pt-10 border-t border-slate-50 flex justify-between items-center opacity-30 pointer-events-none">
                    <span className="text-[9px] font-black uppercase text-slate-400">Section Completion Index: {activeSection.status === 'complete' ? '100%' : '20%'}</span>
                    <span className="text-[9px] font-black uppercase text-slate-400">© Jazz Business Governance Engine</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10 bg-slate-50 h-full">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 relative group animate-in zoom-in duration-500 shrink-0">
                <BookOpen size={32} className="opacity-10 text-[#D32F2F]" />
                <div className="absolute inset-0 border-4 border-dashed border-red-200 rounded-[2rem] animate-[spin_60s_linear_infinite]"></div>
                <div className="absolute -top-2 -right-2 p-3 bg-[#D32F2F] text-white rounded-[1rem] shadow-2xl animate-bounce"><Sparkles size={16} /></div>
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.3em]">Studio Ready</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3 text-center max-w-[280px] leading-relaxed">Select an opportunity context to begin AI synthesis.</p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Asset Bank */}
        <aside className={clsx(
          "bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 h-full",
          rightPanelOpen ? "w-[440px]" : "w-0 overflow-hidden border-none"
        )}>
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3 mb-8"><Archive size={18} /> Asset Intelligence</h3>
            <div className="flex p-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
              <button onClick={() => setResourceTab('bid')} className={clsx("flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-[1.8rem] transition-all", resourceTab === 'bid' ? "bg-[#1E3A5F] text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700")}>Bid Assets</button>
              <button onClick={() => setResourceTab('vault')} className={clsx("flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-[1.8rem] transition-all", resourceTab === 'vault' ? "bg-[#1E3A5F] text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700")}>Vault Assets</button>
            </div>
          </div>

          <div className="p-8 border-b border-slate-100 relative bg-white group shrink-0">
            <Search size={22} className="absolute left-14 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D32F2F] transition-colors" />
            <input type="text" placeholder="Search resources..." value={searchAsset} onChange={(e) => setSearchAsset(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 pl-16 pr-10 text-sm font-black focus:border-[#D32F2F] outline-none shadow-inner transition-all placeholder:text-slate-200" />
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-[#FBFCFE] min-h-0">
            {filteredAssets.map((asset: any) => (
              <div key={asset.id} className="p-8 bg-white rounded-[3.5rem] border-2 border-slate-100 hover:border-[#D32F2F] transition-all group shadow-sm flex flex-col h-fit shrink-0">
                <div className="flex items-center gap-5 mb-6">
                  <div className="p-4 bg-slate-50 rounded-[1.8rem] text-slate-300 group-hover:text-[#D32F2F] group-hover:bg-red-50 transition-all border border-slate-100 shadow-inner"><FileText size={28} /></div>
                  <div className="min-w-0 flex-1 text-left">
                    <h5 className="text-base font-black text-slate-900 truncate uppercase tracking-tight mb-2.5">{asset.name}</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-[#D32F2F] uppercase bg-red-50 px-2.5 py-1 rounded-xl border border-red-100 leading-none">{asset.category || 'Asset'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleLinkAssetAndDraft(asset)} disabled={isGenerating || !activeSection || isPreviewMode} className="w-full py-5 bg-[#1E3A5F] text-[11px] font-black uppercase tracking-widest rounded-2xl text-white hover:bg-[#D32F2F] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 transform disabled:opacity-50">
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
                  Integrate with AI
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProposalStudio;
