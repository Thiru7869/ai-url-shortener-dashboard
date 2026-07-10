import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Link } from "../types/link";
import StatusBadge from "./StatusBadge";
import { useToast } from "./ToastProvider";
import { useUpdateLinkStatus } from "../hooks/useLinks";

interface LinksTableProps {
  links: Link[];
  isLoading: boolean;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
}

export default function LinksTable({ links, isLoading, onEdit, onDelete }: LinksTableProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const updateStatus = useUpdateLinkStatus();

  const handleCopy = async (shortUrl: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast("Short URL copied to clipboard", "success");
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const handleToggleStatus = async (link: Link) => {
    const nextStatus = link.rawStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateStatus.mutateAsync({ id: link.id, status: nextStatus });
      showToast(nextStatus === "DISABLED" ? "Link disabled" : "Link enabled", "success");
    } catch {
      showToast("Failed to update link status", "error");
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading links…</div>;
  }

  if (links.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-slate-500">No links found. Create your first short link to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {["Title", "Original URL", "Short URL", "Status", "Clicks", "Created", "Actions"].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {links.map((link) => (
            <tr key={link.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[180px] truncate" title={link.title}>
                {link.title}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 max-w-[220px] truncate" title={link.originalUrl}>
                <a href={link.originalUrl} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                  {link.originalUrl}
                </a>
              </td>
              <td className="px-4 py-3 text-sm">
                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {link.shortUrl.replace(/^https?:\/\//, "")}
                </a>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={link.status} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">{link.clickCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{format(new Date(link.createdAt), "MMM d, yyyy")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.shortUrl)}
                    className="text-slate-500 hover:text-brand-600"
                    title="Copy URL"
                    aria-label={`Copy short URL for ${link.title}`}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(link)}
                    className="text-slate-500 hover:text-brand-600"
                    title="Edit"
                    aria-label={`Edit ${link.title}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(link)}
                    className="text-slate-500 hover:text-brand-600"
                    title={link.rawStatus === "ACTIVE" ? "Disable" : "Enable"}
                    aria-label={`${link.rawStatus === "ACTIVE" ? "Disable" : "Enable"} ${link.title}`}
                  >
                    {link.rawStatus === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/links/${link.id}/analytics`)}
                    className="text-slate-500 hover:text-brand-600"
                    title="View Analytics"
                    aria-label={`View analytics for ${link.title}`}
                  >
                    Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(link)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                    aria-label={`Delete ${link.title}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
