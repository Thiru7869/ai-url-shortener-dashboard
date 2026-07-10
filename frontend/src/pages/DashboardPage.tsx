import { useState } from "react";
import StatTile from "../components/StatTile";
import LinksTable from "../components/LinksTable";
import Pagination from "../components/Pagination";
import LinkFormModal from "../components/LinkFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/ToastProvider";
import { useDashboardStats, useDeleteLink, useLinksList } from "../hooks/useLinks";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EffectiveStatus, Link } from "../types/link";

const STATUS_FILTERS: { label: string; value: EffectiveStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Disabled", value: "DISABLED" },
  { label: "Expired", value: "EXPIRED" },
];

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<EffectiveStatus | "ALL">("ALL");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [deletingLink, setDeletingLink] = useState<Link | null>(null);

  const search = useDebouncedValue(searchInput);
  const { showToast } = useToast();

  const { data: stats } = useDashboardStats();
  const { data, isLoading } = useLinksList({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const deleteLink = useDeleteLink();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (value: EffectiveStatus | "ALL") => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLink) return;
    try {
      await deleteLink.mutateAsync(deletingLink.id);
      showToast("Link deleted", "success");
    } catch {
      showToast("Failed to delete link", "error");
    } finally {
      setDeletingLink(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Create, manage, and track your short links.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          + Create Link
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Links" value={stats?.totalLinks ?? "—"} icon="🔗" accent="brand" />
        <StatTile label="Total Clicks" value={stats?.totalClicks ?? "—"} icon="👆" accent="emerald" />
        <StatTile label="Active Links" value={stats?.activeLinks ?? "—"} icon="✅" accent="emerald" />
        <StatTile label="Expired Links" value={stats?.expiredLinks ?? "—"} icon="⌛" accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by title or original URL…"
            aria-label="Search links by title or original URL"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex gap-1.5" role="group" aria-label="Filter links by status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleStatusChange(filter.value)}
                aria-pressed={statusFilter === filter.value}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  statusFilter === filter.value
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <LinksTable
          links={data?.items ?? []}
          isLoading={isLoading}
          onEdit={(link) => setEditingLink(link)}
          onDelete={(link) => setDeletingLink(link)}
        />

        {data && data.pagination.total > 0 && <Pagination pagination={data.pagination} onPageChange={setPage} />}
      </div>

      <LinkFormModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
      <LinkFormModal isOpen={Boolean(editingLink)} onClose={() => setEditingLink(null)} link={editingLink} />

      <ConfirmDialog
        isOpen={Boolean(deletingLink)}
        title="Delete this link?"
        message={`"${deletingLink?.title}" will be removed from your active links. This action can be reversed only by an administrator.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingLink(null)}
      />
    </div>
  );
}
