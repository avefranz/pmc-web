import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsset, useDeleteAsset } from "@/lib/hooks/use-assets";
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
  const deleteAsset = useDeleteAsset();
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteAsset.mutateAsync(id);
      toast.success("Property deleted");
      navigate("/me/host/properties", { replace: true });
    } catch {
      toast.error("Couldn't delete");
    }
  }

  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <EditorSidebar
            draft={editor.draft}
            groups={SECTION_GROUPS}
            visibleGroupIds={visibleGroupIds(editor)}
            mode={editor.mode}
            primaryImageUrl={asset?.primaryImageUrl}
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
          <SectionsList editor={editor} />
        </div>
      </div>

      {confirmDelete && (
        <Dialog open onOpenChange={(o) => !o && setConfirmDelete(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this property?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-fg-muted">
              This is permanent. The listing, photos, and history will be removed.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
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
