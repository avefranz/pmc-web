import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsset, useDeleteAsset } from "@/lib/hooks/use-assets";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { useMe } from "@/lib/hooks/use-auth";
import { useEditorState } from "./use-editor";
import { EditorSidebar } from "./editor-sidebar";
import { SectionsList } from "./sections-list";
import { SECTIONS } from "./sections";
import { SECTION_GROUPS } from "./types";

// Outer route component re-keys the inner editor on route change so React
// remounts it cleanly. Without this, navigating /new → /:id or between two
// /:id values keeps stale draft state because both routes share the same
// element instance.
export function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <PropertyEditor key={id ?? "new"} id={id} />;
}

// Mirror of the filter inside SectionsList — kept tiny because section
// visibility comes from two signals only: editOnly + the two profile
// completeness flags.
function visibleGroupIds(editor: ReturnType<typeof useEditorState>): Set<string> {
  const visible = SECTIONS.filter((s) => {
    if (s.editOnly && editor.mode !== "edit") return false;
    if (s.id === "contact" && !editor.needsContactSection) return false;
    if (s.id === "payment" && !editor.needsPaymentSection) return false;
    return true;
  });
  return new Set(visible.map((s) => s.group));
}

function PropertyEditor({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const editor = useEditorState({ assetId: id });
  const { data: asset } = useAsset(id ?? "");
  const { data: me } = useMe();
  const { data: caps } = useCapabilities();
  const deleteAsset = useDeleteAsset();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // UX-312: show the chosen cover photo in the Live preview during create —
  // before it's uploaded — by rendering an object URL of the first pending
  // file. Revoked on change/unmount to avoid leaking blob URLs.
  const coverFile = editor.pendingPhotos[0];
  const [coverObjectUrl, setCoverObjectUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!coverFile) { setCoverObjectUrl(undefined); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  // BUG-331: when a draft is restored, the cover is the first restored staged
  // photo (no live File / object URL) — surface it so the live preview keeps
  // showing the photo after a reload.
  const previewImageUrl = asset?.primaryImageUrl ?? editor.stagedPhotos[0]?.url ?? coverObjectUrl;

  // Warn before navigating away with unsaved changes (create mode only —
  // edit mode auto-saves per section).
  useEffect(() => {
    if (editor.mode !== "create") return;
    // Empty draft has nothing to lose — only warn once user has made progress.
    if (editor.draft.title.trim() === "" && editor.draft.assetTypeId === null) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor.mode, editor.draft.title, editor.draft.assetTypeId]);

  if (editor.isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <Skeleton className="h-80 w-full lg:w-72" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // BE-40/41 frontend mitigation: block non-owners from editing someone else's
  // property. Managers can edit any managed asset; admins bypass the check.
  if (id && asset && me && asset.ownerId && asset.ownerId !== me.id && !caps?.isManager && !caps?.isAdmin) {
    return <Navigate to="/me/host/properties" replace />;
  }

  async function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    try {
      await deleteAsset.mutateAsync(id);
      toast.success("Property deleted");
      navigate("/me/host/properties", { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(detail ?? "Couldn't delete property. Please try again.");
    }
  }

  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* UX-343: shared back-link above both columns so the Live-preview card
            and the header banner align at the same top edge. */}
        <Link
          to="/me/host/properties"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <ArrowLeft size={14} /> Properties
        </Link>
        <div className="flex flex-col lg:flex-row gap-6">
          <EditorSidebar
            draft={editor.draft}
            groups={SECTION_GROUPS}
            visibleGroupIds={visibleGroupIds(editor)}
            mode={editor.mode}
            primaryImageUrl={previewImageUrl}
            occupancyStatus={asset?.occupancyStatus}
            onGroupClick={(groupId) => {
              const el = document.querySelector<HTMLElement>(`[data-group="${groupId}"]`);
              if (!el) return;
              // body { overflow-x: hidden } breaks smooth scroll in some
              // browsers — fall back to instant scroll for reliability.
              const TOPBAR_OFFSET = 96;
              const top = el.getBoundingClientRect().top + window.scrollY - TOPBAR_OFFSET;
              window.scrollTo(0, top);
            }}
            onDelete={editor.mode === "edit" ? () => setConfirmDelete(true) : undefined}
          />
          <SectionsList
            editor={editor}
            occupancyStatus={asset?.occupancyStatus}
            currentTenantName={asset?.currentTenantName}
          />
        </div>
      </div>

      {confirmDelete && (
        <Dialog open onOpenChange={(o) => { if (!o) { setConfirmDelete(false); setDeleteError(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this property?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-fg-muted">
              This is permanent. The listing, photos, and history will be removed.
              Properties with active bookings cannot be deleted.
            </p>
            {deleteError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setConfirmDelete(false); setDeleteError(null); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteAsset.isPending}
                onClick={handleDelete}
              >
                {deleteAsset.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
