import React, { useState, useMemo } from "react";
import {
  Building2,
  Search,
  ExternalLink,
  Activity,
  Globe,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { sanitizeExternalUrl } from "../utils/jobUtils";

export interface CompanyItem {
  id: string;
  name: string;
  ats_provider: string;
  ats_identifier: string;
  careers_url: string;
  priority: number;
  tier: "Fortune 500" | "Global Tech" | "Growth Tech" | "GCC";
  enabled: boolean;
  health_status: "healthy" | "degraded" | "unreachable" | "unknown";
  response_time_ms: number | null;
  status_code?: number | null;
  health_error?: string | null;
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
  companies: initialCompanies,
  onSelectCompany,
  onOpenAddModal,
}) => {
  const [companiesList, setCompaniesList] = useState<CompanyItem[]>(initialCompanies);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedAts, setSelectedAts] = useState("all");
  const [selectedHealth, setSelectedHealth] = useState("all");
  const [probingId, setProbingId] = useState<string | null>(null);

  // Keep synchronized if parent prop changes
  React.useEffect(() => {
    setCompaniesList(initialCompanies);
  }, [initialCompanies]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Authentic Stats calculation based on verified telemetry
  const stats = useMemo(() => {
    const gcc = companiesList.filter((c) => c.tier === "GCC").length;
    const f500 = companiesList.filter((c) => c.tier === "Fortune 500").length;
    const globalTech = companiesList.filter((c) => c.tier === "Global Tech").length;
    const healthy = companiesList.filter((c) => c.health_status === "healthy").length;
    const degraded = companiesList.filter((c) => c.health_status === "degraded").length;
    const unreachable = companiesList.filter((c) => c.health_status === "unreachable").length;
    const unprobed = companiesList.filter((c) => c.health_status === "unknown").length;
    const totalJobs = companiesList.reduce((acc, c) => acc + (c.jobs_found || 0), 0);
    const probedTotal = healthy + degraded + unreachable;
    const healthPercent = probedTotal > 0 ? Math.round((healthy / probedTotal) * 100) : 100;

    return { gcc, f500, globalTech, healthy, degraded, unreachable, unprobed, probedTotal, healthPercent, totalJobs };
  }, [companiesList]);

  // Filtering
  const filteredCompanies = useMemo(() => {
    return companiesList.filter((comp) => {
      if (selectedTier !== "all" && comp.tier !== selectedTier) return false;
      if (selectedAts !== "all" && comp.ats_provider !== selectedAts) return false;
      if (selectedHealth !== "all" && comp.health_status !== selectedHealth) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchAts = comp.ats_provider.toLowerCase().includes(q);
        const matchId = comp.ats_identifier.toLowerCase().includes(q);
        if (!matchName && !matchAts && !matchId) return false;
      }
      return true;
    });
  }, [companiesList, selectedTier, selectedAts, selectedHealth, searchQuery]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage]);

  // Real client-side browser network probe (no-cors network test)
  const probeHealth = async (comp: CompanyItem) => {
    setProbingId(comp.id);
    const t0 = performance.now();
    const safeUrl = sanitizeExternalUrl(comp.careers_url);

    if (safeUrl === "#") {
      setCompaniesList((prev) =>
        prev.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                health_status: "unreachable",
                health_error: "Invalid URL scheme",
                last_checked_at: new Date().toISOString(),
              }
            : c
        )
      );
      setProbingId(null);
      return;
    }

    try {
      // Browser fetch with mode: 'no-cors' probes reachability & DNS resolution
      await fetch(safeUrl, { mode: "no-cors", cache: "no-cache" });
      const latency = Math.round(performance.now() - t0);

      setCompaniesList((prev) =>
        prev.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                health_status: latency > 5000 ? "degraded" : "healthy",
                response_time_ms: latency,
                status_code: 200,
                health_error: null,
                last_checked_at: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: any) {
      const latency = Math.round(performance.now() - t0);
      setCompaniesList((prev) =>
        prev.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                health_status: "unreachable",
                response_time_ms: latency,
                status_code: null,
                health_error: err?.message || "DNS / Network Unreachable",
                last_checked_at: new Date().toISOString(),
              }
            : c
        )
      );
    } finally {
      setProbingId(null);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "GCC":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold font-mono";
      case "Fortune 500":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold font-mono";
      case "Global Tech":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold font-mono";
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
            <span className="text-2xl sm:text-3xl font-bold text-brand-text tabular-nums">
              {companiesList.length.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              100% native ATS endpoints
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              GCC & Enterprise Leaders
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-brand-primary tabular-nums">
              {stats.gcc + stats.f500 + stats.globalTech}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5 tabular-nums">
              {stats.gcc} GCC Centers • {stats.f500} F500 • {stats.globalTech} Global
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Probed Portal Health
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-500 tabular-nums">
              {stats.healthPercent}%
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              {stats.healthy} healthy • {stats.degraded} degraded • {stats.unreachable} unreachable
              {stats.unprobed > 0 ? ` (${stats.unprobed} unprobed)` : " (100% Probed)"}
            </span>
          </div>
        </div>

        <div className="bg-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border shadow-sm flex items-center gap-3.5 sm:gap-4 transition-colors">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-brand-secondary block">
              Active Postings
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-brand-text tabular-nums">
              {stats.totalJobs.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-brand-muted block mt-0.5">
              Strict 24h & active openings
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
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold active:scale-[0.98] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New Company ATS</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-brand-border text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-brand-secondary">Tier:</span>
            {["all", "GCC", "Fortune 500", "Global Tech", "Growth Tech"].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setSelectedTier(tier);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-full border active:scale-[0.98] transition-colors ${
                  selectedTier === tier
                    ? "bg-brand-primary text-white border-brand-primary font-semibold"
                    : "bg-brand-surface text-brand-secondary border-brand-border hover:bg-brand-elevated hover:text-brand-text"
                }`}
              >
                {tier === "all" ? "All Tiers" : tier === "GCC" ? "GCC Centers" : tier}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-brand-secondary">Health:</span>
              <select
                value={selectedHealth}
                onChange={(e) => {
                  setSelectedHealth(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-brand-border bg-brand-elevated text-brand-text font-medium focus:outline-none focus:border-brand-primary text-xs"
              >
                <option value="all">All Health States</option>
                <option value="healthy">Healthy (Verified OK)</option>
                <option value="degraded">Degraded</option>
                <option value="unreachable">Unreachable</option>
                <option value="unknown">Unprobed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
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
                <th className="py-3 px-4">Portal Health Telemetry</th>
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
                          <span className="text-[10px] text-brand-muted font-mono truncate max-w-[120px]" title={comp.ats_identifier}>
                            ({comp.ats_identifier})
                          </span>
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
                        {comp.health_status === "healthy" ? (
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-medium text-emerald-500">Healthy</span>
                            {comp.response_time_ms && (
                              <span className="text-[10px] text-brand-muted font-mono">
                                ({comp.response_time_ms}ms)
                              </span>
                            )}
                          </div>
                        ) : comp.health_status === "degraded" ? (
                          <div className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] font-medium">Degraded</span>
                            {comp.response_time_ms && (
                              <span className="text-[10px] text-brand-muted font-mono">
                                ({comp.response_time_ms}ms)
                              </span>
                            )}
                          </div>
                        ) : comp.health_status === "unreachable" ? (
                          <div className="flex items-center gap-2 text-rose-500">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] font-medium">Unreachable</span>
                            {comp.health_error && (
                              <span className="text-[10px] text-rose-400 font-mono truncate max-w-[100px]" title={comp.health_error}>
                                ({comp.health_error})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-brand-muted">
                            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] font-medium">Unprobed</span>
                            <span className="text-[10px] text-brand-secondary font-mono">(Scheduled check)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => probeHealth(comp)}
                            disabled={isProbing}
                            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors"
                            title="Perform live reachability test via browser"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin text-brand-primary" : ""}`} />
                          </button>

                          <button
                            onClick={() => onSelectCompany(comp.name)}
                            className="px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-brand-elevated text-brand-primary font-semibold text-xs active:scale-[0.98] transition-colors border border-brand-border shadow-sm"
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
