import React, { useState, useEffect, useCallback, useMemo } from "react";

export interface LiveEarningsCall {
  id: string;
  title: string;
  timestamp: string;
  link?: string;
  company?: string;
  source: string;
  type: 'earnings_call' | 'result_announcement' | 'conference' | 'investor_meeting';
  priority: 'high' | 'medium' | 'low';
  fetched_at: string;
}

export interface LiveEarningsData {
  fetched_at: string;
  live_calls: LiveEarningsCall[];
  total_unique: number;
  sources_queried: string[];
}

interface LiveEarningsFeedProps {
  initialData: LiveEarningsData | null;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export default function LiveEarningsFeed({
  initialData,
  onManualRefresh,
  isRefreshing
}: LiveEarningsFeedProps) {
  const [data, setData] = useState<LiveEarningsData | null>(initialData);
  const [isLive, setIsLive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'earnings_call' | 'result_announcement' | 'conference' | 'investor_meeting'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [newItemsCount, setNewItemsCount] = useState(0);

  // Real-time SSE connection
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectSSE = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('[Live Earnings] Max reconnect attempts reached, stopping');
        setConnectionStatus('error');
        return;
      }

      setConnectionStatus('connecting');
      console.log('[Live Earnings] Connecting to SSE stream...');

      eventSource = new EventSource('/api/live-earnings/stream');

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        setIsLive(true);
        reconnectAttempts = 0;
        console.log('[Live Earnings] SSE connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'initial' || message.type === 'update') {
            const incomingData = message.data as LiveEarningsData;

            if (message.type === 'update' && data) {
              // Count new items
              const existingIds = new Set(data.live_calls.map(c => c.id));
              const newCalls = incomingData.live_calls.filter(c => !existingIds.has(c.id));
              if (newCalls.length > 0) {
                setNewItemsCount(prev => prev + newCalls.length);
              }
            }

            setData(incomingData);
            setConnectionStatus('connected');
          }
        } catch (err) {
          console.error('[Live Earnings] Parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[Live Earnings] SSE error:', err);
        setConnectionStatus('error');
        setIsLive(false);
        eventSource?.close();

        // Attempt reconnect with exponential backoff
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`[Live Earnings] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

        setTimeout(() => {
          if (reconnectAttempts < maxReconnectAttempts) {
            connectSSE();
          }
        }, delay);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('[Live Earnings] SSE connection closed');
      }
    };
  }, []); // Only run once on mount

  // Filter and search
  const filteredCalls = useMemo(() => {
    if (!data?.live_calls) return [];

    let filtered = [...data.live_calls];

    // Priority filter
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.priority === filter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [data, filter, typeFilter, searchQuery]);

  // Get unique sources for display
  const sources = useMemo(() => {
    if (!data?.live_calls) return [];
    const uniqueSources = new Set(data.live_calls.map(c => c.source));
    return Array.from(uniqueSources);
  }, [data]);

  // Stats
  const stats = useMemo(() => {
    if (!data?.live_calls) return { high: 0, medium: 0, low: 0, total: 0 };
    return {
      high: data.live_calls.filter(c => c.priority === 'high').length,
      medium: data.live_calls.filter(c => c.priority === 'medium').length,
      low: data.live_calls.filter(c => c.priority === 'low').length,
      total: data.live_calls.length
    };
  }, [data]);

  const getStatusColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-rose-950/40 text-rose-400 border-rose-500/25';
      case 'medium': return 'bg-amber-950/40 text-amber-400 border-amber-500/25';
      case 'low': return 'bg-blue-950/40 text-blue-400 border-blue-500/25';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earnings_call': return 'phone_in_talk';
      case 'result_announcement': return 'description';
      case 'conference': return 'groups';
      case 'investor_meeting': return 'business_center';
      default: return 'article';
    }
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'Moneycontrol': 'text-blue-400',
      'BSE India': 'text-amber-400',
      'NSE India': 'text-cyan-400',
      'Economic Times': 'text-emerald-400',
      'Finology': 'text-violet-400'
    };
    return colors[source] || 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METADATA SUMMARY & CONTROL HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Card A: Live Status */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/10 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant/50 uppercase tracking-widest">Live Feed Status</span>
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
              connectionStatus === 'error' ? 'bg-rose-500' :
              'bg-zinc-600'
            }`}></span>
          </div>
          <div className="mt-4">
            <h4 className="font-sans text-2xl font-black text-white/95 leading-tight tracking-tight">
              {isLive ? 'LIVE' : 'OFFLINE'}
            </h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-sm font-bold text-emerald-400">
                {connectionStatus === 'connected' ? 'Streaming' :
                 connectionStatus === 'connecting' ? 'Reconnecting...' :
                 connectionStatus === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-on-surface-variant/60 font-mono">
            <span>Auto-refresh: 60s</span>
            <span>{data?.fetched_at ? new Date(data.fetched_at).toLocaleTimeString() : '--:--'}</span>
          </div>
        </div>

        {/* Card B: Priority Distribution */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/10 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant/50 uppercase tracking-widest">Priority Matrix</span>
            <span className="font-mono text-[10px] text-white/70">Total: {stats.total}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/10">
              <span className="font-mono text-[8px] text-rose-400/60 uppercase block">High</span>
              <span className="font-mono text-lg font-black text-rose-400 mt-1 block">{stats.high}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/10">
              <span className="font-mono text-[8px] text-amber-400/60 uppercase block">Medium</span>
              <span className="font-mono text-lg font-black text-amber-400 mt-1 block">{stats.medium}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/10">
              <span className="font-mono text-[8px] text-blue-400/60 uppercase block">Low</span>
              <span className="font-mono text-lg font-black text-blue-400 mt-1 block">{stats.low}</span>
            </div>
          </div>
          <div className="mt-4 pt-1">
            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden flex">
              <div className="bg-rose-500 h-full" style={{ width: `${(stats.high / Math.max(stats.total, 1)) * 100}%` }}></div>
              <div className="bg-amber-500 h-full" style={{ width: `${(stats.medium / Math.max(stats.total, 1)) * 100}%` }}></div>
              <div className="bg-blue-500 h-full" style={{ width: `${(stats.low / Math.max(stats.total, 1)) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Card C: Sources Coverage */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/10 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant/50 uppercase tracking-widest">Data Sources</span>
            <span className="font-mono text-[10px] text-blue-400">{sources.length} Active</span>
          </div>
          <div className="mt-4">
            <span className="font-mono text-[8px] text-white/40 uppercase block">Primary Feeds</span>
            <div className="flex flex-wrap gap-1 mt-2">
              {sources.slice(0, 4).map((source, idx) => (
                <span key={idx} className={`text-[9px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 font-mono ${getSourceColor(source)}`}>
                  {source}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-on-surface-variant/60">
            <span>Unique items: {data?.total_unique || 0}</span>
            <span>Last poll: 60s ago</span>
          </div>
        </div>

        {/* Card D: Manual Refresh Control */}
        <div className="bg-gradient-to-br from-cyan-950/40 via-black/40 to-black/40 backdrop-blur-3xl rounded-2xl border border-cyan-500/10 p-5 flex flex-col justify-between hover:border-cyan-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">Manual Refresh</span>
            {newItemsCount > 0 && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                +{newItemsCount} new
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="font-sans text-xs text-on-surface-variant/80 leading-relaxed">
              Trigger instant refresh using Playwright-enhanced multi-source scraper.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setNewItemsCount(0);
                onManualRefresh();
              }}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-950/50 text-white font-mono text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_20px_rgba(34,211,238,0.25)] cursor-pointer disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin"></span>
                  Polling...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">sync</span>
                  Refresh Now
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* 2. FILTERS & SEARCH */}
      <div className="bg-black/30 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl p-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b border-white/5">
          <div>
            <h3 className="font-sans text-lg font-bold text-white/90">Live Earnings Feed</h3>
            <p className="font-sans text-[11px] text-on-surface-variant/60 mt-0.5">
              Real-time earnings calls, result announcements, and investor conferences
            </p>
          </div>

          {/* Priority filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 'all', label: 'All Priorities', count: stats.total },
              { id: 'high', label: 'High', count: stats.high },
              { id: 'medium', label: 'Medium', count: stats.medium },
              { id: 'low', label: 'Low', count: stats.low }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setFilter(preset.id as any)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  filter === preset.id
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                {preset.label} ({preset.count})
              </button>
            ))}
          </div>
        </div>

        {/* Search and type filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-6">

          <div className="md:col-span-4 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 material-symbols-outlined text-lg">search</span>
            <input
              type="text"
              placeholder="Search by company, title or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 font-mono text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/15 focus:bg-black/50 transition-all"
            />
          </div>

          <div className="md:col-span-4">
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full appearance-none bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 font-mono text-xs text-white cursor-pointer focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="earnings_call">Earnings Calls</option>
                <option value="result_announcement">Result Announcements</option>
                <option value="conference">Conferences</option>
                <option value="investor_meeting">Investor Meetings</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 material-symbols-outlined text-base pointer-events-none">unfold_more</span>
            </div>
          </div>

          <div className="md:col-span-4">
            <button
              onClick={() => {
                setFilter('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
              disabled={filter === 'all' && typeFilter === 'all' && searchQuery === ''}
              className="w-full h-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-mono text-[9px] uppercase tracking-wider font-extrabold border border-white/5 hover:border-white/10 hover:bg-white/5 text-on-surface-variant hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset Filters
            </button>
          </div>
        </div>

        {/* RESULTS LIST */}
        <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto">
          {filteredCalls.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant/40 font-mono text-sm border border-dashed border-white/5 rounded-xl bg-black/10">
              <span className="material-symbols-outlined text-4xl text-white/20 block mb-2">phone_disabled</span>
              No live earnings calls matching current filters.
              <br />
              <span className="text-[10px]">Try adjusting filters or wait for live updates.</span>
            </div>
          ) : (
            filteredCalls.map((call) => (
              <div
                key={call.id}
                className="p-4 bg-black/30 border border-white/5 hover:border-white/15 rounded-xl transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        call.priority === 'high' ? 'bg-rose-500' :
                        call.priority === 'medium' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`}></span>
                      <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tight border ${getStatusColor(call.priority)}`}>
                        {call.priority}
                      </span>
                      <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-white/60 font-mono uppercase">
                        {call.type.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-mono font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {call.title}
                    </h4>

                    <div className="flex items-center gap-3 mt-2 text-[9px] text-on-surface-variant/60 font-mono">
                      {call.company && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">business</span>
                          {call.company}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${getSourceColor(call.source)}`}>
                        <span className="material-symbols-outlined text-xs">source</span>
                        {call.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {call.timestamp}
                      </span>
                    </div>
                  </div>

                  {call.link && (
                    <a
                      href={call.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-400/20 hover:bg-blue-400 hover:text-black text-blue-400 text-[9px] font-mono rounded-lg whitespace-nowrap transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                      View
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer stats */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-on-surface-variant/50 font-mono">
          <span>
            Showing {filteredCalls.length} of {data?.live_calls?.length || 0} live calls
          </span>
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
              connectionStatus === 'connecting' ? 'bg-amber-500' :
              'bg-rose-500'
            }`}></span>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Reconnecting...' :
             connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </span>
        </div>

      </div>
    </div>
  );
}
