import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Bot, Send, Sparkles } from 'lucide-react';

export default function AiCommandCenter() {
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'Hello! I am your GoGreen Logistics AI assistant, powered by live session telemetry and Groq intelligence. Ask me anything about your vehicles, drivers, or general sustainability goals.' }
  ]);
  
  const [stats, setStats] = useState({ totalVehicles: 0, totalDrivers: 0, pendingCount: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const vehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
    const approvals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
    const approvedDrivers = approvals.filter(d => (d.status || '').toLowerCase() === 'approved');
    const pendingDrivers = approvals.filter(d => (d.status || '').toLowerCase() === 'pending');

    setStats({
      totalVehicles: vehicles.length,
      totalDrivers: approvedDrivers.length,
      pendingCount: pendingDrivers.length
    });
  }, []);

  const handleAskAi = async (e) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userText = query.trim();
    const newLog = [...chatLog, { sender: 'user', text: userText }];
    setChatLog(newLog);
    setQuery('');
    setIsProcessing(true);

    try {
      const vehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
      const approvals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
      
      // Pre-format data into clean text summaries to prevent messy markdown tables
      const formattedFleet = vehicles.map(v => `- Vehicle ${v.regNo}: Type ${v.type}, Fuel ${v.fuel}, Payload ${v.capacity}kg, Driver: ${v.driver}`).join('\n');
      const formattedDrivers = approvals.map(d => `- Driver ${d.name}: Status [${d.status}], Email ${d.email}, License ${d.license || d.licenseNumber || 'N/A'}`).join('\n');

      const contextSummary = `
ACTIVE FLEET ASSETS:
${formattedFleet || 'None registered'}

DRIVER APPLICATIONS & ROSTER:
${formattedDrivers || 'None recorded'}

GENERAL AUDIT METRICS:
H1 2026 Audit Verified, Net CO2 Reduction: -24.5%
      `;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: `You are an expert enterprise fleet assistant. Use this clean application state summary to answer the admin's questions concisely in plain text or bullet points. NEVER output markdown tables, pipe symbols (|), or HTML tags.\n\n${contextSummary}`
            },
            ...newLog.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
          ],
          temperature: 0.3,
          max_tokens: 350
        })
      });

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "I processed your request, but received an empty telemetry response.";

      setChatLog([...newLog, { sender: 'ai', text: aiReply }]);
    } catch (err) {
      console.warn("API request failed:", err);
      const vehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
      setChatLog([...newLog, { sender: 'ai', text: `[Network Fallback] Active fleet vehicles: ${vehicles.length}.` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time database intelligence, telemetry diagnostics, and natural language assistant.</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2">
          <Sparkles size={14} /> Groq LLM Connected
        </div>
      </div>

      {/* Top Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Active Fleet Assets</span>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.totalVehicles} Vehicles</div>
          <div className="text-[11px] text-slate-500 font-medium">Synced with Vehicle Management</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Approved Drivers Pool</span>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.totalDrivers} Drivers</div>
          <div className="text-[11px] text-slate-500 font-medium">Ready for deployment</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pending Approvals Queue</span>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.pendingCount} Applications</div>
          <div className="text-[11px] text-slate-500 font-medium">Action required in Admin Tab</div>
        </div>
      </div>

      {/* Interactive AI Chat Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[500px]">
        
        {/* Chat Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">GoGreen Intelligence Assistant</h3>
              <p className="text-[10px] text-slate-500">Contextual RAG-lite over local session data via Groq</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Groq API Active
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {chatLog.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-4 text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-800 border border-slate-200/60'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 rounded-2xl p-3 text-xs font-mono animate-pulse">
                Querying Groq neural model with active fleet payload...
              </div>
            </div>
          )}
        </div>

        {/* Query Input Form */}
        <form onSubmit={handleAskAi} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about drivers, vehicles, or general sustainability goals..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
          />
          <Button
            type="submit"
            disabled={isProcessing}
            variant="primary"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
          >
            <Send size={15} /> {isProcessing ? 'Thinking...' : 'Send Query'}
          </Button>
        </form>

      </div>
    </div>
  );
}