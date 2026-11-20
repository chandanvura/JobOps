import React, { useState, useMemo } from "react";
import { Building2, Search, ExternalLink, Activity, Globe, ShieldCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { sanitizeExternalUrl } from "../utils/jobUtils";

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

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchAts = comp.ats_provider.toLowerCase().includes(q);
        const matchId = comp.ats_identifier.toLowerCase().includes(q);
        if (!matchName && !matchAts && !matchId) return false;
      }
      return true;
    });
  }, [companies, selectedTier, selectedAts, searchQuery]);

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
        return "bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold font-mono";
      case "Global Tech":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30 font-semibold font-mono";
      default:
        return "bg-brand-elevated text-brand-secondary border-brand-border font-medium font-mono";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center text-brand-primary flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Direct Employers
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-brand-text">
              {companies.length.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              100% Native ATS Endpoints
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-accent border border-brand-primary/40 flex items-center justify-center text-brand-primary flex-shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Enterprise & Global Tech
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-brand-text">
              {stats.f500 + stats.globalTech}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              {stats.f500} F500 • {stats.globalTech} Global Leaders
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Portal Health Rate
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-500">
              {companies.length > 0 ? `${Math.round((stats.healthy / companies.length) * 100)}%` : "100%"}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              Active HTTP 200 Handshakes
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center text-brand-gold flex-shrink-0">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Active Postings
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-brand-text">
              {stats.totalJobs.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              Strict 24h & Active Openings
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Search employer by name or ATS slug..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-brand-elevated border border-brand-border text-brand-text rounded-xl focus:outline-none focus:border-brand-primary placeholder:text-brand-muted"
            />
          </div>

          <button
            onClick={onOpenAddModal}
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New Company ATS</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-brand-border text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-brand-secondary">Tier:</span>
            {["all", "Fortune 500", "Global Tech", "Growth Tech"].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setSelectedTier(tier);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  selectedTier === tier
                    ? "bg-brand-primary text-white border-brand-primary font-semibold"
                    : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text"
                }`}
              >
                {tier === "all" ? "All Tiers" : tier}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-medium text-brand-secondary">ATS:</span>
            <select
              value={selectedAts}
              onChange={(e) => {
                setSelectedAts(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-brand-border bg-brand-elevated text-brand-text font-medium focus:outline-none focus:border-brand-primary text-xs"
            >
              <option value="all">All Platforms</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="workday">Workday</option>
              <option value="ashby">Ashby</option>
              <option value="lever">Lever</option>
              <option value="smartrecruiters">SmartRecruiters</option>
              <option value="eightfold">Eightfold</option>
              <option value="darwinbox">Darwinbox</option>
              <option value="phenom">Phenom</option>
              <option value="amazon">Amazon Jobs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Directory Table */}
      <div className="bg-brand-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-elevated/70 border-b border-brand-border text-brand-secondary uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Tier & Priority</th>
                <th className="py-3 px-4">ATS Feed & Slug</th>
                <th className="py-3 px-4">Indian Hubs</th>
                <th className="py-3 px-4">Portal Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No employers match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((comp) => {
                  const isProbing = probingId === comp.id;
                  const safeCareersUrl = sanitizeExternalUrl(comp.careers_url);

                  return (
                    <tr key={comp.id} className="hover:bg-brand-elevated/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-elevated border border-brand-border flex items-center justify-center font-bold text-brand-text text-xs flex-shrink-0">
                            {comp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-brand-text block leading-tight">{comp.name}</span>
                            <span className="text-[11px] font-mono text-brand-muted">~{comp.jobs_found} Indian positions</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getTierBadge(comp.tier)}`}>
                          {comp.tier}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-brand-text uppercase">{comp.ats_provider}</span>
                          <span className="text-[10px] text-brand-muted font-mono">({comp.ats_identifier})</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {comp.indian_hubs.map((hub) => (
                            <span key={hub} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-elevated text-brand-secondary border border-brand-border">
                              {hub}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-medium text-emerald-500">Healthy</span>
                          <span className="text-[10px] text-brand-muted font-mono">({comp.response_time_ms}ms)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => probeHealth(comp.id)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors"
                            title="Probe live portal health handshake"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin text-brand-primary" : ""}`} />
                          </button>

                          <button
                            onClick={() => onSelectCompany(comp.name)}
                            className="px-2.5 py-1 rounded-lg bg-brand-accent hover:bg-brand-primary/20 text-brand-text font-semibold text-[11px] transition-colors border border-brand-primary/40"
                          >
                            View Jobs
                          </button>

                          {safeCareersUrl !== "#" && (
                            <a
                              href={safeCareersUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors"
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
          <div className="p-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-secondary">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredCompanies.length)} of {filteredCompanies.length} employers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-elevated disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-brand-text font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-elevated disabled:opacity-40 transition-colors"
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
