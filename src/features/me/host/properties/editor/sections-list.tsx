import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Sparkles, Rocket, CalendarDays, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";
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
        if (s.id === "contact" && !editor.needsContactSection) return false;
        if (s.id === "payment" && !editor.needsPaymentSection) return false;
        return true;
      }),
    [editor.needsContactSection, editor.needsPaymentSection],
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
    const after = visibleSections.slice(idx + 1).find((s) => !s.isComplete(editor.draft));
    if (after) return after.id;
    const anywhere = visibleSections.find((s) => s.id !== currentId && !s.isComplete(editor.draft));
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
    try {
      const isProfile = section.id === "contact" || section.id === "payment";
      if (editor.mode === "edit" || isProfile) {
        await editor.commitSection(section.id, editor.draft);
      }
    } finally {
      setSavingId(null);
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
    if (next) focusSection(next, scrollDelay);
    else setActiveId(null);
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

  // Publish dialog state
  const today = new Date().toISOString().split("T")[0];
  const [publishDialog, setPublishDialog] = useState(false);
  const [pubStartDate, setPubStartDate] = useState(today);
  const [pubDurationMonths, setPubDurationMonths] = useState<string>("open");
  const [publishing, setPublishing] = useState(false);

  function computePubEndDate(): string | undefined {
    if (pubDurationMonths === "open") return undefined;
    const months = Number(pubDurationMonths);
    if (!months || !pubStartDate) return undefined;
    const d = new Date(pubStartDate);
    d.setMonth(d.getMonth() + months);
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

  return (
    <div className="flex-1 min-w-0 space-y-8 pb-24">
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
              disabled={editor.missingForSave.length > 0 || editor.isSaving}
              onClick={() => editor.commitFirstSave()}
              className={cn(
                "h-11 px-5 font-semibold shrink-0",
                editor.missingForSave.length === 0 &&
                  "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)]",
              )}
            >
              {editor.isSaving ? "Saving…" : "Save property"}
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
        {editor.mode === "create" && editor.missingForSave.length > 0 && (
          <p className="text-xs text-fg-muted mt-3">
            Still needed: <strong className="text-fg">{editor.missingForSave.join(", ")}</strong>
          </p>
        )}
      </header>

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
          transparent area never blocks clicks on content below (esp. on mobile). */}
      {showStickyBar && (
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
                  ) : (
                    <>
                      <span className="tabular-nums text-fg font-semibold">{doneRequired}/{totalRequired}</span>{" "}
                      required steps · keep going
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  disabled={!allRequiredDone || editor.isSaving}
                  onClick={() => editor.commitFirstSave()}
                  className={cn(
                    "h-9 px-4 font-semibold",
                    allRequiredDone &&
                      "bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white",
                  )}
                >
                  {editor.isSaving ? "Saving…" : "Save property"}
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
              <Input
                type="date"
                value={pubStartDate}
                min={today}
                onChange={(e) => setPubStartDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <InfinityIcon size={13} className="text-fg-muted" />
                Listed for
              </label>
              <Select value={pubDurationMonths} onValueChange={setPubDurationMonths}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="2">2 months</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="open">Open-ended (no end date)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-fg-muted">
                {pubDurationMonths === "open"
                  ? "Your listing stays live until you take it down manually."
                  : `Listing auto-expires ${Number(pubDurationMonths)} month${Number(pubDurationMonths) > 1 ? "s" : ""} after the start date.`}
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
    ? "Fill required fields (marked *)"
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
        <div className="px-5 pb-5 pt-3 border-t border-border">
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
          Smart defaults are pre-filled. You can change anything, in any order — your data saves when you click "Save property".
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
