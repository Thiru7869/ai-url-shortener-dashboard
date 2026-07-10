import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateLink, useUpdateLink } from "../hooks/useLinks";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { useModalA11y } from "../hooks/useModalA11y";
import { Link } from "../types/link";

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  originalUrl: z
    .string()
    .trim()
    .min(1, "Original URL is required")
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "Must be a valid http:// or https:// URL"),
  customAlias: z
    .string()
    .trim()
    .max(30, "Alias must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]*$/, "Only letters, numbers, hyphens, and underscores allowed")
    .optional()
    .or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface LinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  link?: Link | null;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function LinkFormModal({ isOpen, onClose, link }: LinkFormModalProps) {
  const isEditMode = Boolean(link);
  const { showToast } = useToast();
  const createLink = useCreateLink();
  const updateLink = useUpdateLink(link?.id ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, dialogRef);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", originalUrl: "", customAlias: "", expiresAt: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: link?.title ?? "",
        originalUrl: link?.originalUrl ?? "",
        customAlias: "",
        expiresAt: toDateInputValue(link?.expiresAt ?? null),
      });
    }
  }, [isOpen, link, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: FormValues) => {
    const expiresAt = values.expiresAt ? new Date(`${values.expiresAt}T23:59:59.000Z`).toISOString() : null;

    try {
      if (isEditMode && link) {
        await updateLink.mutateAsync({
          title: values.title,
          originalUrl: values.originalUrl,
          expiresAt,
        });
        showToast("Link updated successfully", "success");
      } else {
        await createLink.mutateAsync({
          title: values.title,
          originalUrl: values.originalUrl,
          customAlias: values.customAlias ? values.customAlias : null,
          expiresAt,
        });
        showToast("Short link created", "success");
      }
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      showToast(message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4" role="dialog" aria-modal="true" aria-labelledby="link-form-modal-title">
      <div ref={dialogRef} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="link-form-modal-title" className="text-lg font-semibold text-slate-900">{isEditMode ? "Edit Link" : "Create Short Link"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              {...register("title")}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Summer Sale Campaign"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="originalUrl" className="block text-sm font-medium text-slate-700">
              Original URL
            </label>
            <input
              id="originalUrl"
              type="text"
              {...register("originalUrl")}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="https://example.com/landing-page"
            />
            {errors.originalUrl && <p className="mt-1 text-xs text-red-600">{errors.originalUrl.message}</p>}
          </div>

          {!isEditMode && (
            <div>
              <label htmlFor="customAlias" className="block text-sm font-medium text-slate-700">
                Custom Alias <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="customAlias"
                type="text"
                {...register("customAlias")}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="summer26"
              />
              {errors.customAlias && <p className="mt-1 text-xs text-red-600">{errors.customAlias.message}</p>}
            </div>
          )}

          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-slate-700">
              Expiry Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="expiresAt"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              {...register("expiresAt")}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
