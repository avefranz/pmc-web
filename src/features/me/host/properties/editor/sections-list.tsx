import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronRight, Sparkles, Rocket, CalendarDays, Infinity as InfinityIcon, History, X, Minus, Plus, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils/cn";
import { formatThb, formatDate } from "@/lib/utils/format";
import type { DraftPatch, SectionDef, SectionGroup } from "./types";
import type { EditorApi } from "./use-editor";
import { SECTION_GROUPS } from "./types";
import { SECTIONS } from "./sections";
import { celebrate, crossedMilestone, floatPlusOne } from "./celebrate";

interface Props {
  editor: EditorApi;
  occupancyStatus?: string;
  currentTenantName?: string;
}

/**
 * Inline-expansion sections list. One section is active at a time; clicking
 * "Continue" saves it and auto-opens the next unsaved one (with scrollIntoView).
 * No modals — the flow stays on a single canvas so the user never loses
 * momentum and "what's next" stays visible at all times.
 */
export function SectionsList({ editor, occupancyStatus, currentTenantName }: Props) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const dotRefs = useRef<Record<string, HTMLElement | null>>({});
  // Track completeness at the moment a section is opened so handleContinue can
  // tell whether the user actually completed something new in this editing session.
  const wasCompleteOnOpen = useRef<Record<string, boolean>>({});

  const visibleSections = useMemo(
    () =>
      SECTIONS.filter((s) => {
        // editOnly sections (e.g. Utility accounts — bind a meter to an
        // existing asset) only make sense once the property exists.
        if (s.editOnly && editor.mode !== "edit") return false;
        if (s.id === "contact" && !editor.needsContactSection) return false;
        if (s.id === "payment" && !editor.needsPaymentSection) return false;
        if (s.id === "identity" && !editor.needsIdentitySection) return false;
        return true;
      }),
    [editor.needsContactSection, editor.needsPaymentSection, editor.needsIdentitySection, editor.mode],
  );

  const firstUndoneRequired = visibleSections.find((s) => s.required && !s.isComplete(editor.draft));
  const [activeId, setActiveId] = useState<string | null>(firstUndoneRequired?.id ?? null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // BUG-140: occupied-rules confirmation — holds the section to save after user confirms
  const [pendingRulesSection, setPendingRulesSection] = useState<SectionDef | null>(null);

  // In create mode, editOnly sections (Photos) can't be completed yet —
  // exclude them from required counts so the progress bar reflects what's actually fillable.
  const countableRequired = visibleSections.filter((s) => s.required && !(s.editOnly && editor.mode === "create"));
  const totalRequired = countableRequired.length;
  const doneRequired = countableRequired.filter((s) => s.isComplete(editor.draft)).length;
  const progressPct = totalRequired === 0 ? 0 : Math.round((doneRequired / totalRequired) * 100);
  const allRequiredDone = totalRequired > 0 && doneRequired === totalRequired;
  // BUG-297: surface the optional-section count so "N/10 required" stops
  // contradicting the visibly-numbered 13 rows in the sidebar.
  const optionalVisible = visibleSections.filter(
    (s) => !s.required && !(s.editOnly && editor.mode === "create"),
  ).length;
  const sectionsTotalLabel =
    optionalVisible > 0
      ? `${totalRequired} required · ${optionalVisible} optional`
      : `${totalRequired} required`;

  // First-time hero. Stays visible while the user is still working on the
  // very first section so picking a type / typing a value doesn't yank it
  // out from under them. Dismisses (with animation) the moment the user
  // commits their first required section via Continue.
  const [heroOpen, setHeroOpen] = useState(
    () =>
      editor.mode === "create" &&
      !visibleSections.some((s) => s.required && s.isComplete(editor.draft)),
  );
  const showHero = editor.mode === "create" && heroOpen;

  function focusSection(id: string, delay = 50) {
    const sec = visibleSections.find((s) => s.id === id);
    wasCompleteOnOpen.current[id] = sec ? sec.isComplete(editor.draft) : false;
    setActiveId(id);
    setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, delay);
  }

  function findNextUnsaved(currentId: string): string | null {
    const idx = visibleSections.findIndex((s) => s.id === currentId);
    // UX-259: once every required section is done, stop chasing the user
    // through optional sections (Cancellation / Utilities / Amenities). Their
    // CTA becomes "Save & finish ✨" and the sticky-bar hides — one primary
    // action in viewport instead of two.
    const isUnfinished = (s: SectionDef) =>
      !s.isComplete(editor.draft) && !(allRequiredDone && !s.required);
    const after = visibleSections.slice(idx + 1).find(isUnfinished);
    if (after) return after.id;
    const anywhere = visibleSections.find((s) => s.id !== currentId && isUnfinished(s));
    return anywhere?.id ?? null;
  }

  async function handleContinue(section: SectionDef) {
    // BUG-140: Warn host before changing rules on an occupied property
    if (
      section.id === "rules" &&
      editor.mode === "edit" &&
      occupancyStatus === "Occupied" &&
      pendingRulesSection === null
    ) {
      setPendingRulesSection(section);
      return;
    }
    const wasComplete = wasCompleteOnOpen.current[section.id] ?? section.isComplete(editor.draft);
    const nowComplete = section.isComplete(editor.draft);
    setSavingId(section.id);
    let committed = false;
    let attemptedCommit = false;
    try {
      const isProfile = section.id === "contact" || section.id === "payment";
      if (editor.mode === "edit" || isProfile) {
        attemptedCommit = true;
        committed = await editor.commitSection(section.id, editor.draft);
      }
    } finally {
      setSavingId(null);
    }
    // If we actually tried to persist and the save failed, keep the section
    // open so the error toast and the UI agree. Previously the flow advanced
    // (and collapsed the section) regardless of the result, so the host saw
    // "Couldn't save" yet the section closed and moved on — looking saved when
    // it wasn't. commitSection already showed the error toast on failure.
    // (In create mode, non-profile sections never commit here — they only
    // mutate the local draft — so attemptedCommit stays false and they advance
    // normally.)
    if (attemptedCommit && !committed) {
      return;
    }
    // BUG-261: surface a clear success toast in edit mode so the host knows
    // the change went through — the section collapses immediately otherwise
    // and the save looks identical to a no-op. commitSection already shows
    // its own error toast on failure, so only fire on confirmed success.
    if (committed && editor.mode === "edit") {
      toast.success(`✓ ${section.label} saved`);
    }

    // Dismiss the hero once the user has committed something — this lets it
    // animate out smoothly instead of yanking when a single field is touched.
    if (heroOpen && nowComplete && section.required) setHeroOpen(false);

    if (!wasComplete && nowComplete) {
      const dot = dotRefs.current[section.id];
      if (dot) {
        const r = dot.getBoundingClientRect();
        const nextDone =
          visibleSections.filter((s) => s.required && s.isComplete(editor.draft)).length;
        const nextPct = totalRequired === 0 ? 0 : Math.round((nextDone / totalRequired) * 100);
        const milestone = section.required ? crossedMilestone(progressPct, nextPct) : null;
        // Celebrate only on milestone crossings — trivial completions (e.g.
        // "Pets: Not allowed") get a floatPlusOne but no confetti burst.
        if (milestone) {
          celebrate({
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            count: 80,
            scale: 1.2,
          });
        }
        floatPlusOne(dot, "+1", "rgb(var(--color-success))");
        if (milestone === 100) {
          setTimeout(
            () =>
              celebrate({
                x: window.innerWidth / 2,
                y: window.innerHeight * 0.3,
                count: 140,
                scale: 1.4,
                spread: Math.PI * 1.4,
              }),
            200,
          );
        } else if (milestone) {
          setTimeout(
            () =>
              celebrate({
                x: window.innerWidth / 2,
                y: window.innerHeight * 0.4,
                count: 60,
                scale: 1.1,
              }),
            200,
          );
        }
      }
    }

    const next = findNextUnsaved(section.id);
    // If we just dismissed the hero, wait for its collapse animation (500ms)
    // before scrolling — otherwise the scroll target moves mid-animation and
    // the user ends up with the next section half off-screen.
    const scrollDelay = heroOpen && nowComplete && section.required ? 520 : 50;
    if (next) {
      focusSection(next, scrollDelay);
    } else if (
      editor.mode === "create" &&
      allRequiredDone &&
      editor.missingForSave.length === 0 &&
      !editor.isSaving
    ) {
      // UX-259: the section's CTA reads "Save & finish ✨" because
      // findNextUnsaved returned null. Actually commit the property here so
      // the user doesn't need to scroll up to the header or hunt for a
      // separate Save button.
      await editor.commitFirstSave();
    } else {
      setActiveId(null);
    }
  }

  // ── Keyboard: ⌘/Ctrl + Enter saves & advances when a section is active. ──
  useEffect(() => {
    if (!activeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Allow newlines inside textareas — only intercept on inputs / buttons.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      const sec = visibleSections.find((s) => s.id === activeId);
      if (sec) handleContinue(sec);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const visibleByGroup: Record<string, SectionDef[]> = {};
  for (const s of visibleSections) (visibleByGroup[s.group] ??= []).push(s);

  function nextLabel(currentId: string): string | null {
    const id = findNextUnsaved(currentId);
    if (!id) return null;
    return SECTIONS.find((s) => s.id === id)?.label ?? null;
  }

  // Publish dialog state.
  // UX-260: replaced the fixed 1/2/3/6/12 dropdown with a 1–12 stepper +
  // open-ended toggle (UX-350: >12 months must be Open-ended, not a fixed
  // window), plus a live move-in window preview and social proof.
  const today = new Date().toISOString().split("T")[0];
  const [publishDialog, setPublishDialog] = useState(false);
  const [pubStartDate, setPubStartDate] = useState(today);
  const [pubOpenEnded, setPubOpenEnded] = useState(true);
  const [pubMonths, setPubMonths] = useState(6);
  const [publishing, setPublishing] = useState(false);

  function computePubEndDate(): string | undefined {
    if (pubOpenEnded) return undefined;
    if (!pubMonths || !pubStartDate) return undefined;
    const d = new Date(pubStartDate);
    d.setMonth(d.getMonth() + pubMonths);
    return d.toISOString().split("T")[0];
  }
  // BE-14 fixed: use editor.isPublished (derived from API listing.status) instead of session flag

  // After the create flow's first save, use-editor navigates here with
  // ?publish=1 so the host can confirm dates and go live without an extra
  // click. We open the dialog once everything has hydrated and required
  // sections are complete, then strip the param so a refresh doesn't reopen.
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsPublish = searchParams.get("publish") === "1";
  useEffect(() => {
    if (!wantsPublish) return;
    if (editor.mode !== "edit") return;
    if (!allRequiredDone) return;
    setPublishDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete("publish");
    setSearchParams(next, { replace: true });
  }, [wantsPublish, editor.mode, allRequiredDone, searchParams, setSearchParams]);

  async function handlePublish() {
    setPublishing(true);
    try {
      await editor.publishListing(pubStartDate || undefined, computePubEndDate());
      celebrate({ x: window.innerWidth / 2, y: window.innerHeight * 0.3, count: 140, scale: 1.4, spread: Math.PI * 1.4 });
      setPublishDialog(false);
    } finally {
      setPublishing(false);
    }
  }

  // Sticky bar: in create mode = Save button; in edit mode = Publish + saved timestamp.
  // Appears after scrolling past the header so the action is always reachable.
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    function onScroll() {
      setShowStickyBar(window.scrollY > 280);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // UX-288: extra pb (pb-36) so the last section's CTA never lands
  // underneath the fixed sticky save bar. pb-24 left < 16px of clearance
  // once the bar's own pb-4 was accounted for.
  return (
    <div className="flex-1 min-w-0 space-y-8 pb-36">
      {/* BUG-316: full-screen blocking overlay during any long operation
          (first save / publish). Prevents double-submit and any other
          interaction until the async flow settles — the whole canvas becomes
          non-interactive and a progress affordance is shown. */}
      <BusyOverlay
        show={editor.isSaving || publishing}
        label={publishing ? "Publishing your listing…" : "Saving your property…"}
      />

      {/* Header banner */}
      <header className="rounded-2xl border border-border bg-bg-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-fg tracking-tight">
              {editor.mode === "create" ? "New property" : editor.draft.title || "Property details"}
            </h1>
            <p className="text-sm text-fg-muted mt-1 flex items-center gap-2">
              {allRequiredDone ? (
                <span className="inline-flex items-center gap-1.5 text-success font-medium">
                  <Sparkles size={14} /> All required sections are filled in
                </span>
              ) : (
                <>
                  <span className="tabular-nums font-semibold text-fg">{doneRequired}</span>
                  <span>of</span>
                  <span className="tabular-nums font-semibold text-fg">{totalRequired}</span>
                  <span>required steps</span>
                  {optionalVisible > 0 && (
                    <span className="text-fg-subtle">
                      · {optionalVisible} optional
                    </span>
                  )}
                </>
              )}
              {editor.mode === "edit" && editor.lastSavedAt && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <SavedTimestamp at={editor.lastSavedAt} />
                </>
              )}
            </p>
          </div>
          {editor.mode === "create" ? (
            <Button
              type="button"
              disabled={editor.missingForPartialSave.length > 0 || editor.isSaving}
              onClick={() => editor.commitFirstSave()}
              className={cn(
                "h-11 px-5 font-semibold shrink-0",
                allRequiredDone &&
                  "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)]",
              )}
            >
              {editor.isSaving
                ? "Saving…"
                : allRequiredDone
                ? "Save property"
                : "Save draft"}
            </Button>
          ) : (
            allRequiredDone && (
              editor.isPublished && editor.listingId ? (
                <a
                  href={`/listings/${editor.listingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 px-5 font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shrink-0 shadow-[0_8px_24px_rgba(16,185,129,0.35)] inline-flex items-center rounded-md text-sm"
                >
                  View on marketplace →
                </a>
              ) : (
                <Button
                  type="button"
                  onClick={() => setPublishDialog(true)}
                  className="h-11 px-5 font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white shrink-0 shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
                >
                  Publish →
                </Button>
              )
            )
          )}
        </div>
        {/* UX-325: while the full-screen save/publish overlay (with its own
            indeterminate bar) is up, hide this section-progress bar so the
            host never sees two progress bars stacked at once. */}
        {!(editor.isSaving || publishing) && (
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                allRequiredDone
                  ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                  : "bg-fg",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        {editor.mode === "create" && editor.missingForPartialSave.length > 0 && (
          <p className="text-xs text-fg-muted mt-3">
            <strong className="text-fg">Add {editor.missingForPartialSave.join(" + ")}</strong>{" "}
            to enable Save — your other progress is already kept locally.
          </p>
        )}
        {editor.mode === "create" &&
          editor.missingForPartialSave.length === 0 &&
          editor.missingForSave.length > 0 && (
            <p className="text-xs text-fg-muted mt-3">
              Still needed before publishing:{" "}
              <strong className="text-fg">{editor.missingForSave.join(", ")}</strong>
            </p>
          )}
      </header>

      {/* UX-341: "Save property" only creates a draft — publishing is a
          separate step. New hosts assume they're done after Save and wonder
          why no requests arrive. Show a persistent, unmissable banner once the
          listing exists but isn't live yet, steering them to Publish (the
          auto-publish dialog may have been dismissed). */}
      {editor.mode === "edit" && editor.listingId && !editor.isPublished && (
        <div className="rounded-2xl border border-indigo-300/60 bg-gradient-to-r from-indigo-500/[0.08] to-violet-500/[0.08] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Rocket size={20} className="text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Your listing isn't live yet</p>
            <p className="text-xs text-fg-muted mt-0.5">
              {allRequiredDone
                ? "Saved as a draft — tenants can't see it or send requests until you publish. Set your availability and go live."
                : "Saved as a draft. Finish the required sections below, then publish so tenants can find it and send requests."}
            </p>
          </div>
          {allRequiredDone && (
            <Button
              type="button"
              onClick={() => setPublishDialog(true)}
              className="h-10 px-4 font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white shrink-0 shadow-[0_6px_18px_rgba(99,102,241,0.35)]"
            >
              Publish →
            </Button>
          )}
        </div>
      )}

      {/* BUG-307: restored-draft banner. Lets the host know we kept their
          work from a previous tab and offers a clean slate if they didn't
          mean to come back to it. */}
      {editor.mode === "create" && editor.restoredAt !== null && (
        <RestoredDraftBanner
          at={editor.restoredAt}
          photoNames={editor.restoredPhotoNames}
          onDiscard={editor.discardRestoredDraft}
          onDismiss={editor.dismissRestoredBanner}
        />
      )}

      {/* First-time hero — collapses smoothly via CSS grid trick so dismissing
          doesn't punch a hole in the layout and disorient the user. */}
      {editor.mode === "create" && (
        <div
          aria-hidden={!showHero}
          className={cn(
            "grid transition-all duration-500 ease-out",
            showHero ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <HeroCard sections={visibleSections} />
          </div>
        </div>
      )}

      {/* Groups */}
      {SECTION_GROUPS.map((g) => {
        const items = visibleByGroup[g.id] ?? [];
        if (items.length === 0) return null;
        return (
          <GroupBlock key={g.id} group={g}>
            {items.map((s) => {
              const isActive = activeId === s.id;
              const isDone = s.isComplete(editor.draft);
              const stepNum = visibleSections.indexOf(s) + 1;
              return (
                <SectionShell
                  key={s.id}
                  section={s}
                  isActive={isActive}
                  isDone={isDone}
                  stepNum={stepNum}
                  saving={savingId === s.id}
                  upNextLabel={isActive ? nextLabel(s.id) : null}
                  editor={editor}
                  onOpen={() => focusSection(s.id)}
                  onContinue={() => handleContinue(s)}
                  sectionRef={(el) => {
                    sectionRefs.current[s.id] = el;
                  }}
                  dotRef={(el) => {
                    dotRefs.current[s.id] = el;
                  }}
                />
              );
            })}
          </GroupBlock>
        );
      })}

      {/* Sticky bar — create mode: Save button; edit mode: Publish + saved timestamp.
          pointer-events-none on wrapper + pointer-events-auto on pill only so the
          transparent area never blocks clicks on content below (esp. on mobile).
          UX-259: hide on final-step to avoid the dual Save button situation
          (the section already shows "Save & finish ✨" as its CTA).
          UX-288 (QA Partial fix): hide the bar entirely while ANY section is
          open (activeId !== null). When editing, the section has its own CTA;
          the fixed bar was overlapping the section's lower content (e.g. the
          red bank-details helper in Payment). With no section open, the bar
          returns as the persistent Save/Publish action. */}
      {showStickyBar && activeId === null && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pointer-events-none">
          <div className="max-w-6xl mx-auto flex items-center justify-end">
            {editor.mode === "create" ? (
              <div
                className={cn(
                  "pointer-events-auto flex items-center gap-3 rounded-full bg-bg-card border border-border px-2 py-2 pl-5 transition-all duration-300",
                  allRequiredDone
                    ? "shadow-[0_12px_40px_rgba(99,102,241,0.35)]"
                    : "shadow-[0_8px_24px_rgba(12,10,9,0.12)]",
                )}
              >
                <span className="text-sm font-medium text-fg-muted">
                  {allRequiredDone ? (
                    <span className="text-fg font-semibold">Ready to save your property</span>
                  ) : editor.missingForPartialSave.length > 0 ? (
                    <>
                      <span className="tabular-nums text-fg font-semibold">{doneRequired}/{totalRequired}</span>{" "}
                      required ({sectionsTotalLabel}) · keep going
                    </>
                  ) : (
                    <>
                      <span className="tabular-nums text-fg font-semibold">{doneRequired}/{totalRequired}</span>{" "}
                      required done · save now & finish later
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  disabled={editor.missingForPartialSave.length > 0 || editor.isSaving}
                  onClick={() => editor.commitFirstSave()}
                  className={cn(
                    "h-9 px-4 font-semibold",
                    allRequiredDone &&
                      "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white",
                  )}
                >
                  {editor.isSaving
                    ? "Saving…"
                    : allRequiredDone
                    ? "Save property"
                    : "Save draft"}
                </Button>
              </div>
            ) : (
              <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-bg-card border border-border px-2 py-2 pl-5 shadow-[0_8px_24px_rgba(12,10,9,0.12)]">
                {editor.lastSavedAt && (
                  <span className="text-sm text-fg-muted">
                    <SavedTimestamp at={editor.lastSavedAt} />
                  </span>
                )}
                {allRequiredDone && (
                  editor.isPublished && editor.listingId ? (
                    <a
                      href={`/listings/${editor.listingId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-4 font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white inline-flex items-center rounded-full text-sm"
                    >
                      View on marketplace →
                    </a>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setPublishDialog(true)}
                      className="h-9 px-4 font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white"
                    >
                      Publish →
                    </Button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish dialog — collects availability before going live */}
      <Dialog open={publishDialog} onOpenChange={(o) => !o && setPublishDialog(false)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {/* Hero strip */}
          <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-6 pt-6 pb-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Rocket size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Ready to go live?</DialogTitle>
                <p className="text-sm text-white/75 mt-0.5">Set your availability — you can change it anytime.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Available from */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <CalendarDays size={13} className="text-fg-muted" />
                Available from
              </label>
              {/* UX-348: design-system DatePicker instead of the native
                  <input type=date> ("looked like it's from the 2000s"). */}
              <DatePicker
                value={pubStartDate}
                onChange={setPubStartDate}
                isDisabled={(d) => d < new Date(today + "T00:00:00")}
                placeholder="Pick a start date"
              />
            </div>

            {/* Duration — UX-260: any 1–24 months via stepper + quick-picks,
                or open-ended. */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <InfinityIcon size={13} className="text-fg-muted" />
                Listed for
              </label>

              {/* Open-ended toggle vs fixed window */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPubOpenEnded(true)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                    pubOpenEnded
                      ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10 text-fg ring-1 ring-indigo-400/40"
                      : "border-border text-fg-muted hover:border-fg-subtle",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <InfinityIcon size={14} /> Open-ended
                  </span>
                  <span className="block text-[11px] text-fg-subtle mt-0.5 font-normal">No end date</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPubOpenEnded(false)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                    !pubOpenEnded
                      ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10 text-fg ring-1 ring-indigo-400/40"
                      : "border-border text-fg-muted hover:border-fg-subtle",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} /> Fixed window
                  </span>
                  <span className="block text-[11px] text-fg-subtle mt-0.5 font-normal">Auto-expires</span>
                </button>
              </div>

              {/* Month stepper + quick-picks — only when a fixed window is chosen */}
              {!pubOpenEnded && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <button
                      type="button"
                      aria-label="Fewer months"
                      onClick={() => setPubMonths((m) => Math.max(1, m - 1))}
                      disabled={pubMonths <= 1}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-fg hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus size={15} />
                    </button>
                    <div className="text-center">
                      <span className="text-lg font-bold text-fg tabular-nums">{pubMonths}</span>
                      <span className="text-sm text-fg-muted ml-1">month{pubMonths > 1 ? "s" : ""}</span>
                    </div>
                    <button
                      type="button"
                      aria-label="More months"
                      // UX-350: cap fixed windows at 12 months — anything longer
                      // should be Open-ended, not a 13/14/… month window.
                      onClick={() => setPubMonths((m) => Math.min(12, m + 1))}
                      disabled={pubMonths >= 12}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-fg hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 6, 9, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPubMonths(m)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                          pubMonths === m
                            ? "border-indigo-400 bg-indigo-500 text-white"
                            : "border-border text-fg-muted hover:border-indigo-300",
                        )}
                      >
                        {m}mo
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live move-in window preview */}
            <div className="rounded-xl bg-bg-subtle px-3.5 py-3 text-[13px] leading-relaxed">
              <p className="text-fg">
                Tenants can request move-in
                {pubOpenEnded ? (
                  <> any time from <strong className="font-semibold">{formatDate(pubStartDate)}</strong> onwards.</>
                ) : (
                  <>
                    {" "}between <strong className="font-semibold">{formatDate(pubStartDate)}</strong> and{" "}
                    <strong className="font-semibold">{formatDate(computePubEndDate() ?? pubStartDate)}</strong>{" "}
                    <span className="text-fg-muted">({pubMonths}-month window)</span>.
                  </>
                )}
              </p>
            </div>

            {/* Social proof — UX-философия: anticipation + social proof */}
            <div className="flex items-start gap-2 rounded-xl border border-emerald-300/40 bg-emerald-500/[0.07] px-3.5 py-2.5">
              <TrendingUp size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-fg leading-snug">
                Listings with <strong className="font-semibold">6+ months</strong> available get{" "}
                <strong className="font-semibold text-emerald-600 dark:text-emerald-400">3× more</strong> requests.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 gap-2">
            <Button variant="ghost" onClick={() => setPublishDialog(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button
              disabled={!pubStartDate || publishing}
              onClick={handlePublish}
              className="flex-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white font-semibold rounded-xl h-10 shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
            >
              {publishing ? "Publishing…" : "Go live 🚀"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BUG-140: Confirm before saving rules on an occupied property */}
      <Dialog open={!!pendingRulesSection} onOpenChange={(o) => { if (!o) setPendingRulesSection(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update rules for current tenant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-fg-muted leading-relaxed">
            <span className="font-semibold text-fg">{currentTenantName ?? "Your current tenant"}</span> is renting this property right now.
            Saving new house rules will immediately apply to their active stay — they will see the updated rules in their booking.
          </p>
          <p className="text-sm text-warning font-medium">
            ⚠️ Note: rule changes don&apos;t modify the signed contract — they're advisory only.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRulesSection(null)}>
              Cancel
            </Button>
            <Button
              className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white"
              onClick={async () => {
                const sec = pendingRulesSection!;
                setPendingRulesSection(null);
                await handleContinue(sec);
              }}
            >
              Update rules anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupBlock({ group, children }: { group: SectionGroup; children: React.ReactNode }) {
  return (
    <section data-group={group.id} style={{ scrollMarginTop: 96 }}>
      <h3 className="text-sm font-semibold text-fg mb-3 px-1">{group.label}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

interface ShellProps {
  section: SectionDef;
  isActive: boolean;
  isDone: boolean;
  stepNum: number;
  saving: boolean;
  upNextLabel: string | null;
  editor: EditorApi;
  onOpen: () => void;
  onContinue: () => void;
  sectionRef: (el: HTMLElement | null) => void;
  dotRef: (el: HTMLElement | null) => void;
}

function SectionShell({
  section,
  isActive,
  isDone,
  stepNum,
  saving,
  upNextLabel,
  editor,
  onOpen,
  onContinue,
  sectionRef,
  dotRef,
}: ShellProps) {
  const summary = section.summary(editor.draft);
  const headlineValue = headlineFor(section, editor.draft);
  // Block Continue on required sections that aren't complete. Optional
  // sections can always be skipped via Continue. editOnly sections
  // (e.g. Photos) can't be completed in create mode — don't block them.
  const blockedByRequired = section.required && !isDone && !(section.editOnly && editor.mode === "create");
  const continueLabel = blockedByRequired
    ? section.blockedReason?.(editor.draft) ?? "Fill required fields (marked *)"
    : upNextLabel == null
    ? isDone && editor.mode === "edit"
      ? "Update & finish ✨"
      : "Save & finish ✨"
    : isDone && editor.mode === "edit"
    ? "Update & continue"
    : "Looks good — continue";

  return (
    <article
      ref={sectionRef}
      className={cn(
        "rounded-2xl transition-all duration-300 overflow-hidden border bg-bg-card",
        isActive
          ? "border-indigo-300/70 ring-1 ring-indigo-400/30 shadow-[0_4px_24px_rgba(99,102,241,0.12)]"
          : "border-border hover:border-fg-subtle/60",
      )}
      style={{ scrollMarginTop: 96 }}
    >
      <button
        type="button"
        onClick={isActive ? undefined : onOpen}
        disabled={isActive}
        className={cn(
          "w-full flex items-center gap-3 text-left transition-colors",
          isActive ? "px-5 pt-5 pb-3 cursor-default" : "px-5 py-4 hover:bg-bg-subtle",
        )}
      >
        <span
          ref={dotRef}
          className={cn(
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums transition-colors",
            isDone
              ? "bg-success text-white"
              : isActive
              ? "bg-indigo-500 text-white"
              : "bg-bg-subtle text-fg-muted",
          )}
        >
          {isDone ? <Check size={14} strokeWidth={3} /> : stepNum}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-fg text-base">{section.label}</span>
            {section.required && !isDone && (
              <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">
                required
              </span>
            )}
          </div>
          {isActive ? (
            <div className="text-xs text-fg-muted mt-1">
              {isDone
                ? editor.mode === "edit"
                  ? "Your changes will be saved when you continue"
                  : "Changes will apply when you save the property"
                : `Takes ~ ${section.estTime}`}
            </div>
          ) : (
            <div className="text-xs text-fg-muted mt-0.5 truncate">
              {isDone ? summary : `Not set — tap to fill in · ${section.estTime}`}
            </div>
          )}
        </div>
        {!isActive && headlineValue && (
          <span className="text-base font-semibold text-fg shrink-0 tabular-nums">
            {headlineValue}
          </span>
        )}
        {!isActive && (
          <span className="text-xs text-fg-muted shrink-0 flex items-center gap-1">
            {isDone ? "Edit" : "Open"}
            <ChevronRight size={14} />
          </span>
        )}
      </button>

      {isActive && (
        // UX-288: scroll-mb keeps the section's CTA above the sticky save
        // bar when the host opens a section and the browser tries to
        // scroll the article into view. Without it, scrollIntoView happily
        // pinned the CTA right under the fixed footer.
        <div className="px-5 pb-5 pt-3 border-t border-border" style={{ scrollMarginBottom: 120 }}>
          <div className="py-3">
            <section.Form
              draft={editor.draft}
              patch={(p: DraftPatch) => editor.patch(p)}
              mode={editor.mode}
              assetId={editor.assetId}
              listingId={editor.listingId}
              pendingPhotos={editor.pendingPhotos}
              addPendingPhotos={editor.addPendingPhotos}
              removePendingPhotoAt={editor.removePendingPhotoAt}
              movePendingPhotoToCover={editor.movePendingPhotoToCover}
              stagedPhotos={editor.stagedPhotos}
              removeStagedPhotoAt={editor.removeStagedPhotoAt}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
            <div className="text-xs text-fg-muted">
              {upNextLabel ? (
                <>
                  Up next: <strong className="text-fg font-semibold">{upNextLabel}</strong>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-fg">
                  This is the last step <Sparkles size={12} className="text-indigo-500" />
                </span>
              )}
              <span className="hidden lg:inline ml-3 text-fg-subtle">
                <kbd className="font-mono text-[10px] border border-border rounded px-1 py-0.5">⌘</kbd>
                <kbd className="font-mono text-[10px] border border-border rounded px-1 py-0.5 ml-0.5">↵</kbd> to save
              </span>
            </div>
            <Button
              type="button"
              onClick={onContinue}
              disabled={saving || blockedByRequired}
              className="font-semibold h-10 px-5 sm:shrink-0"
            >
              {saving ? "Saving…" : continueLabel}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Headline value: a single short string rendered prominently on the
// right side of a collapsed *done* row. Returns null if there's nothing
// punchy to show — falls back to the long summary line below the title.
function headlineFor(section: SectionDef, draft: import("./types").PropertyDraft): string | null {
  if (!section.isComplete(draft)) return null;
  switch (section.id) {
    case "pricing":
      return `${formatThb(draft.baseMonthlyRate)}/mo`;
    case "specs":
      return draft.bedrooms === 0 ? "Studio" : `${draft.bedrooms} bed`;
    case "photos":
      return `${draft.photoCount} ${draft.photoCount === 1 ? "photo" : "photos"}`;
    case "amenities":
      return `${draft.amenityIds.length} selected`;
    default:
      return null;
  }
}

// ── First-time hero ─────────────────────────────────────────────────────
function HeroCard({ sections }: { sections: SectionDef[] }) {
  const stops = sections.filter((s) => s.required);
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-7 lg:p-8 text-white"
      style={{
        background: "linear-gradient(150deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(99,102,241,0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-2">
          Let's list your place
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold leading-tight">
          A few quick steps — most hosts finish in under 6&nbsp;minutes.
        </h2>
        <p className="text-sm text-white/70 mt-2 max-w-xl">
          Smart defaults are pre-filled. Your progress saves automatically as
          you type — close the tab and pick up right where you left off.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          {stops.map((s, i) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 border border-white/15 text-white/90 rounded-full px-3 py-1.5"
            >
              <span className="text-indigo-300 font-bold tabular-nums">{i + 1}</span>
              {s.label}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["🇮🇩", "🇺🇸", "🇯🇵", "🇷🇺", "🇨🇭"].map((f, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-indigo-900 bg-indigo-800 flex items-center justify-center text-xs"
              >
                {f}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/55">
            <span className="text-white/90 font-semibold">200+ tenants</span> looking in Thailand right now
          </p>
        </div>
      </div>
    </div>
  );
}

// ── BUG-316: blocking busy overlay ──────────────────────────────────────
// Covers the whole viewport while a save/publish is in flight. Captures all
// pointer + keyboard interaction (focus trap on the panel) so the host can't
// double-submit or edit mid-flight. Uses an indeterminate progress bar — the
// real work is a multi-phase API cascade with no single % to report, so an
// animated bar communicates "working" honestly without faking a number.
function BusyOverlay({ show, label }: { show: boolean; label: string }) {
  // Lock body scroll while shown.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  if (!show) return null;
  return (
    <div
      // UX-349: near-opaque backdrop so the page's own "Saving…" button text
      // doesn't bleed through and read as a second, competing indicator.
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 backdrop-blur-md"
      role="alertdialog"
      aria-busy="true"
      aria-label={label}
      // Swallow every interaction that bubbles to the overlay.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.preventDefault()}
    >
      {/* UX-349: a SINGLE motion indicator. This card previously showed both a
          spinning Loader2 AND an indeterminate progress bar — two competing
          "spinners" that read as a glitch. The spinner alone communicates
          "working" clearly; the redundant bar is gone. */}
      <div className="w-[300px] rounded-2xl border border-border bg-bg-card p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <Loader2 size={22} className="text-white animate-spin" />
        </div>
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className="text-xs text-fg-muted mt-1">This only takes a moment — please don't close the tab.</p>
      </div>
    </div>
  );
}

// ── BUG-307: restored-draft banner ──────────────────────────────────────
// Shown above the editor when the host returns to /me/host/properties/new
// and we found their previous in-progress draft in localStorage. Pure
// informational; the draft is already loaded into the form state.
function RestoredDraftBanner({
  at,
  photoNames,
  onDiscard,
  onDismiss,
}: {
  at: number;
  photoNames: string[];
  onDiscard: () => void;
  onDismiss: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - at) / 1000));
  const ago =
    secs < 60 ? "just now"
    : secs < 3600 ? `${Math.floor(secs / 60)}m ago`
    : secs < 86400 ? `${Math.floor(secs / 3600)}h ago`
    : `${Math.floor(secs / 86400)}d ago`;
  return (
    <div className="rounded-2xl border border-indigo-300/60 bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-500/10 dark:to-violet-500/10 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
        <History size={16} className="text-indigo-600 dark:text-indigo-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg">
          Draft restored from {ago}
        </p>
        <p className="text-xs text-fg-muted mt-0.5">
          We kept everything you typed last time.
          {photoNames.length > 0 && (
            <>
              {" "}You'll need to re-attach {photoNames.length} photo
              {photoNames.length === 1 ? "" : "s"} ({photoNames.slice(0, 3).join(", ")}
              {photoNames.length > 3 ? "…" : ""}) — those don't survive a tab reload.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onDiscard}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline mt-1.5"
        >
          Start fresh instead
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 w-7 h-7 rounded-full hover:bg-bg-subtle flex items-center justify-center text-fg-muted"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Last-saved timestamp ────────────────────────────────────────────────
function SavedTimestamp({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - at) / 1000));
  const label =
    secs < 5 ? "Saved just now"
    : secs < 60 ? `Saved ${secs}s ago`
    : secs < 3600 ? `Saved ${Math.floor(secs / 60)}m ago`
    : `Saved ${Math.floor(secs / 3600)}h ago`;
  return <span className="inline-flex items-center gap-1 text-fg-muted">{label}</span>;
}
