import React, { useState, useMemo } from "react";
import { Building2, Search, ExternalLink, Activity, Globe, ShieldCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export interface CompanyItem {
  id: string;
  name: string;
  ats_provider: string;
  ats_identifier: string;
  careers_url: string;
  priority: number;
  tier: "Fortune 500" | "Global Tech" | "Growth Tech";
  enabled: boolean;
  health_status: "healthy" | "warning" | "inactive";
  response_time_ms: number;
  indian_hubs: string[];
  jobs_found: number;
  last_checked_at: string;
}

interface CompaniesPageProps {
  companies: CompanyItem[];
  onSelectCompany: (companyName: string) => void;
  onOpenAddModal: () => void;
}

export const CompaniesPage: React.FC<CompaniesPageProps> = ({
  companies,
  onSelectCompany,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedAts, setSelectedAts] = useState("all");
  const [selectedHub, setSelectedHub] = useState("all");
  const [probingId, setProbingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Stats calculation
  const stats = useMemo(() => {
    const f500 = companies.filter((c) => c.tier === "Fortune 500").length;
    const globalTech = companies.filter((c) => c.tier === "Global Tech").length;
    const healthy = companies.filter((c) => c.health_status === "healthy").length;
    const totalJobs = companies.reduce((acc, c) => acc + (c.jobs_found || 0), 0);
    return { f500, globalTech, healthy, totalJobs };
  }, [companies]);

  // Filtering
  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      if (selectedTier !== "all" && comp.tier !== selectedTier) return false;
      if (selectedAts !== "all" && comp.ats_provider !== selectedAts) return false;
      if (selectedHub !== "all" && !comp.indian_hubs.includes(selectedHub)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchAts = comp.ats_provider.toLowerCase().includes(q);
        const matchId = comp.ats_identifier.toLowerCase().includes(q);
        if (!matchName && !matchAts && !matchId) return false;
      }
      return true;
    });
  }, [companies, selectedTier, selectedAts, selectedHub, searchQuery]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage]);

  const probeHealth = (id: string) => {
    setProbingId(id);
    setTimeout(() => {
      setProbingId(null);
    }, 1200);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "Fortune 500":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold";
      case "Global Tech":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Total Employers</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{companies.length.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Fortune 500 & Leaders</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.f500 + stats.globalTech}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Portal Health Rate</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {companies.length > 0 ? `${Math.round((stats.healthy / companies.length) * 100)}%` : "100%"}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Active Indian Postings</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalJobs.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name or ATS slug..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={onOpenAddModal}
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New Company ATS</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-400 dark:text-slate-500">Tier:</span>
            {["all", "Fortune 500", "Global Tech", "Growth Tech"].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setSelectedTier(tier);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  selectedTier === tier
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {tier === "all" ? "All Tiers" : tier}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-semibold text-slate-400 dark:text-slate-500">ATS Platform:</span>
            <select
              value={selectedAts}
              onChange={(e) => {
                setSelectedAts(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Platforms</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="workday">Workday</option>
              <option value="ashby">Ashby</option>
              <option value="lever">Lever</option>
              <option value="smartrecruiters">SmartRecruiters</option>
              <option value="custom">Custom Portal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Tier & Priority</th>
                <th className="py-3.5 px-4">ATS Feed & Identifier</th>
                <th className="py-3.5 px-4">Indian Hubs</th>
                <th className="py-3.5 px-4">Portal Health</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No companies match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((comp) => {
                  const isProbing = probingId === comp.id;
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                            {comp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block leading-tight">{comp.name}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">~{comp.jobs_found} Indian positions</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getTierBadge(comp.tier)}`}>
                          {comp.tier}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase">{comp.ats_provider}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({comp.ats_identifier})</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {comp.indian_hubs.map((hub) => (
                            <span key={hub} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {hub}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Healthy</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({comp.response_time_ms}ms)</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => probeHealth(comp.id)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Probe live portal health"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin text-indigo-600" : ""}`} />
                          </button>

                          <button
                            onClick={() => onSelectCompany(comp.name)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors"
                          >
                            View Jobs
                          </button>

                          {comp.careers_url && (
                            <a
                              href={comp.careers_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Visit official careers portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredCompanies.length)} of {filteredCompanies.length} companies
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 dark:text-white">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
