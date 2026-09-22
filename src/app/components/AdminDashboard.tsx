import { useState, useEffect, useRef, Fragment } from "react";
import { useAuth } from "../context/AuthContext";
import { Subject } from "./SubjectManager";
import { Holiday } from "./HolidayManager";
import {
  Timetable,
  TimeSlot,
  DEFAULT_TIME_SLOTS,
  DAYS,
  computeHoursPerWeek,
  countDayOccurrences,
} from "./TimetableManager";
import { ThemeToggle } from "./ThemeToggle";
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  BookOpen,
  Grid3X3,
  Palmtree,
  LogOut,
  Save,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  BarChart3,
  CalendarDays,
  Sparkles,
  AlertCircle,
  ClockIcon,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./ui/sonner";

export const ADMIN_CONFIG_KEY = "adminConfig";
export const ADMIN_CHANNEL = "adminConfigChannel";

type NavItem = "overview" | "subjects" | "timeslots" | "timetable" | "holidays";

const SUBJECT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
  "bg-yellow-500", "bg-cyan-500",
];

const JS_DAY_TO_NAME: Record<number, typeof DAYS[number]> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday",
};

function computeAutoHoliday(startDate: string, endDate: string, timetable: Timetable, subjects: Subject[], timeSlots: TimeSlot[]) {
  if (!startDate || !endDate) return { cancelledHours: [], breakdown: [] as any[] };
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (start > end) return { cancelledHours: [], breakdown: [] as any[] };
  const totals: Record<string, number> = {};
  const breakdown: any[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dayName = JS_DAY_TO_NAME[cur.getDay()];
    if (dayName) {
      const daySubjects: any[] = [];
      for (const slot of timeSlots) {
        const subjectId = timetable[dayName]?.[slot.id];
        if (subjectId) {
          totals[subjectId] = (totals[subjectId] ?? 0) + slot.hours;
          const ex = daySubjects.find((s: any) => s.subjectId === subjectId);
          if (ex) ex.hours += slot.hours;
          else {
            const subj = subjects.find(s => s.id === subjectId);
            if (subj) daySubjects.push({ subjectId, name: subj.name, hours: slot.hours });
          }
        }
      }
      if (daySubjects.length > 0) breakdown.push({ date: cur.toISOString().split("T")[0], dayName, subjects: daySubjects });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { cancelledHours: Object.entries(totals).map(([subjectId, hours]) => ({ subjectId, hours })), breakdown };
}

export function AdminDashboard() {
  const { logout } = useAuth();
  const [activeNav, setActiveNav] = useState<NavItem>("overview");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<Timetable>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // Load from adminConfig on mount
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSubjects(data.subjects || []);
        setTimetable(data.timetable || {});
        setHolidays(data.holidays || []);
        setTimeSlots(data.timeSlots && data.timeSlots.length > 0 ? data.timeSlots : DEFAULT_TIME_SLOTS);
        setPublishedAt(data.publishedAt || null);
        setIsPublished(true);
      } catch { /* ignore */ }
    }
  }, []);

  const buildConfig = () => ({
    subjects, timetable, holidays, timeSlots,
    publishedAt: new Date().toISOString(),
  });

  const handleSaveDraft = () => {
    localStorage.setItem(ADMIN_CONFIG_KEY + "_draft", JSON.stringify(buildConfig()));
    toast.success("Draft saved", { description: "Your changes are saved but not yet live for users." });
  };

  const handlePublish = () => {
    const config = buildConfig();
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
    setPublishedAt(config.publishedAt);
    setIsPublished(true);
    try {
      const bc = new BroadcastChannel(ADMIN_CHANNEL);
      bc.postMessage({ type: "ADMIN_PUBLISHED", config });
      bc.close();
    } catch { /* BroadcastChannel not supported */ }
    toast.success("Published! 🚀", { description: "All changes are now live on every user dashboard." });
  };

  // ---- NAV ITEMS ----
  const navItems: { key: NavItem; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "subjects", label: "Subjects", icon: <BookOpen className="h-4 w-4" /> },
    { key: "timeslots", label: "Course Timings", icon: <ClockIcon className="h-4 w-4" /> },
    { key: "timetable", label: "Timetable", icon: <Grid3X3 className="h-4 w-4" /> },
    { key: "holidays", label: "Holidays", icon: <Palmtree className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />
      <style>{`
        .admin-sidebar-item { transition: all 0.15s ease; }
        .admin-sidebar-item:hover { background: rgba(99,102,241,0.08); }
        .admin-sidebar-item.active { background: rgba(99,102,241,0.15); color: #6366f1; }
        .admin-publish-btn { 
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          transition: all 0.2s ease;
        }
        .admin-publish-btn:hover { 
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(99,102,241,0.55);
        }
        .admin-save-btn { transition: all 0.15s ease; }
        .admin-save-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Semester Attendance Calculator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {publishedAt && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Published {new Date(publishedAt).toLocaleTimeString()}
              </div>
            )}
            <ThemeToggle />
            <button
              onClick={handleSaveDraft}
              className="admin-save-btn flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button
              onClick={handlePublish}
              className="admin-publish-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Publish</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── SIDEBAR ── */}
        <aside className="w-56 shrink-0 border-r border-border p-4 hidden md:flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2 mt-1">
            Navigation
          </p>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              className={`admin-sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left ${activeNav === item.key ? "active" : "text-muted-foreground"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-border">
            <div className="px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-0.5">Logged in as</p>
              <p className="opacity-70">Leodas (Admin)</p>
            </div>
          </div>
        </aside>

        {/* ── MOBILE NAV ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-md flex justify-around px-1 py-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all ${activeNav === item.key ? "text-indigo-500" : "text-muted-foreground"}`}
            >
              {item.icon}
              <span>{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 p-6 pb-28 md:pb-6 overflow-auto">

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          {activeNav === "overview" && (
            <OverviewPanel
              subjects={subjects}
              holidays={holidays}
              timetable={timetable}
              timeSlots={timeSlots}
              publishedAt={publishedAt}
              isPublished={isPublished}
              onPublish={handlePublish}
            />
          )}

          {/* ═══════════════ SUBJECTS ═══════════════ */}
          {activeNav === "subjects" && (
            <AdminSubjectsPanel
              subjects={subjects}
              timetable={timetable}
              setSubjects={setSubjects}
              setTimetable={setTimetable}
            />
          )}

          {/* ═══════════════ COURSE TIMINGS ═══════════════ */}
          {activeNav === "timeslots" && (
            <AdminTimeSlotsPanel
              timeSlots={timeSlots}
              setTimeSlots={setTimeSlots}
            />
          )}

          {/* ═══════════════ TIMETABLE ═══════════════ */}
          {activeNav === "timetable" && (
            <AdminTimetablePanel
              subjects={subjects}
              timetable={timetable}
              timeSlots={timeSlots}
              setTimetable={setTimetable}
            />
          )}

          {/* ═══════════════ HOLIDAYS ═══════════════ */}
          {activeNav === "holidays" && (
            <AdminHolidaysPanel
              holidays={holidays}
              subjects={subjects}
              timetable={timetable}
              timeSlots={timeSlots}
              setHolidays={setHolidays}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW PANEL
// ─────────────────────────────────────────────────────────────
function OverviewPanel({ subjects, holidays, timetable, timeSlots, publishedAt, isPublished, onPublish }: any) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-500" />
          Overview
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Summary of what users will see when you <strong>Publish</strong>. Users control their own semester dates.
        </p>
      </div>

      {/* Info callout: what admin controls vs user controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Admin Controls
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ Subjects (names & list)</li>
            <li>✅ Course timings (slot durations)</li>
            <li>✅ Weekly timetable</li>
            <li>✅ Holidays & cancelled hours</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> User Controls (their own)
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>📅 Semester start & end dates</li>
            <li>📊 Minimum attendance %</li>
            <li>✏️ Attended / Missed tracking</li>
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <BookOpen className="h-5 w-5 text-blue-500" />, label: "Subjects", value: subjects.length, bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
          { icon: <ClockIcon className="h-5 w-5 text-purple-500" />, label: "Time Slots", value: timeSlots.length, bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
          { icon: <Palmtree className="h-5 w-5 text-green-500" />, label: "Holidays", value: holidays.length, bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
          { icon: <BarChart3 className="h-5 w-5 text-orange-500" />, label: "Total Hrs/Day", value: timeSlots.reduce((s: number, t: TimeSlot) => s + t.hours, 0), bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
            <div className="flex items-center gap-2">
              {stat.icon}
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Time slots summary */}
      <div className="rounded-xl border border-border p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-purple-500" />
          Current Course Timings
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {timeSlots.map((slot: TimeSlot, i: number) => (
            <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">{slot.label}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                {slot.hours} {slot.hours === 1 ? "hr" : "hrs"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects summary */}
      {subjects.length > 0 && (
        <div className="rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Subjects ({subjects.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s: Subject, i: number) => {
              const hrs = computeHoursPerWeek(timetable, s.id, timeSlots);
              return (
                <span key={s.id}
                  className={`px-3 py-1.5 rounded-full text-sm text-white font-medium ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`}>
                  {s.name}{hrs > 0 ? ` · ${hrs} hrs/wk` : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Publish CTA */}
      {!isPublished && (
        <div className="rounded-xl p-5 flex items-start gap-4"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <Sparkles className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Ready to go live?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Click <strong>Publish</strong> to push your configuration to all user dashboards instantly.
            </p>
          </div>
          <button
            onClick={onPublish}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <Send className="h-4 w-4" />
            Publish Now
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COURSE TIMINGS (TIME SLOTS) PANEL
// ─────────────────────────────────────────────────────────────
function AdminTimeSlotsPanel({
  timeSlots,
  setTimeSlots,
}: {
  timeSlots: TimeSlot[];
  setTimeSlots: React.Dispatch<React.SetStateAction<TimeSlot[]>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editHours, setEditHours] = useState<number>(2);
  const [newLabel, setNewLabel] = useState("");
  const [newHours, setNewHours] = useState<number>(2);

  const startEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setEditLabel(slot.label);
    setEditHours(slot.hours);
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim() || editHours <= 0) return;
    setTimeSlots(prev => prev.map(s => s.id === id ? { ...s, label: editLabel.trim(), hours: editHours } : s));
    setEditingId(null);
    toast.success("Course timing updated");
  };

  const handleRemove = (id: string) => {
    if (timeSlots.length <= 1) { toast.error("At least one time slot is required"); return; }
    setTimeSlots(prev => prev.filter(s => s.id !== id));
    toast.info("Time slot removed");
  };

  const handleAdd = () => {
    if (!newLabel.trim() || newHours <= 0) return;
    const slot: TimeSlot = {
      id: `slot_${Date.now()}`,
      label: newLabel.trim(),
      hours: newHours,
    };
    setTimeSlots(prev => [...prev, slot]);
    setNewLabel(""); setNewHours(2);
    toast.success(`"${slot.label}" added`);
  };

  const PRESET_DURATIONS = [0.5, 1, 1.5, 2, 2.5, 3];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-purple-500" />
          Course Timings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure how long each class period lasts (e.g., 1 hr, 1.5 hrs, 2 hrs). Changes here affect all attendance calculations.
        </p>
      </div>

      {/* Existing slots */}
      <div className="space-y-3">
        {timeSlots.map((slot, i) => (
          <div key={slot.id} className="rounded-xl border border-border p-4">
            {editingId === slot.id ? (
              /* Edit mode */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Time Label</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="e.g., 8:00 – 9:30 AM"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Duration (hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="6"
                      value={editHours}
                      onChange={(e) => setEditHours(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                {/* Quick presets */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Quick presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_DURATIONS.map(d => (
                      <button key={d} onClick={() => setEditHours(d)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${editHours === d ? "border-indigo-500 text-indigo-500 bg-indigo-500/10" : "border-border hover:border-indigo-500/50"}`}>
                        {d} hr{d !== 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(slot.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${260 + i * 30}, 80%, 60%), hsl(${280 + i * 30}, 80%, 50%))` }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{slot.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-purple-400">{slot.hours} {slot.hours === 1 ? "hr" : "hrs"}</span> per class
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(slot)}
                    className="p-2 rounded-lg hover:bg-muted border border-border transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleRemove(slot.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 border border-border transition-colors text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new slot */}
      <div className="rounded-xl border border-dashed border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-500" />
          Add New Time Slot
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Time Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g., 5:00 – 6:30 PM"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Duration (hours)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="6"
              value={newHours}
              onChange={(e) => setNewHours(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        {/* Quick presets for new slot */}
        <div className="flex flex-wrap gap-1.5">
          {[0.5, 1, 1.5, 2, 2.5, 3].map(d => (
            <button key={d} onClick={() => setNewHours(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${newHours === d ? "border-indigo-500 text-indigo-500 bg-indigo-500/10" : "border-border hover:border-indigo-500/50"}`}>
              {d} hr{d !== 1 ? "s" : ""}
            </button>
          ))}
        </div>
        <button
          onClick={handleAdd}
          disabled={!newLabel.trim() || newHours <= 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: newLabel.trim() && newHours > 0 ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.3)", cursor: newLabel.trim() && newHours > 0 ? "pointer" : "not-allowed" }}
        >
          <Plus className="h-4 w-4" />
          Add Time Slot
        </button>
      </div>

      <div className="rounded-xl p-4 text-sm"
        style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
        <p className="text-muted-foreground">
          💡 <strong>Tip:</strong> After editing timings, click <strong>Publish</strong> in the header to push changes to all user dashboards. All attendance calculations will automatically update with the new durations.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUBJECTS PANEL
// ─────────────────────────────────────────────────────────────
function AdminSubjectsPanel({
  subjects,
  timetable,
  setSubjects,
  setTimetable,
}: {
  subjects: Subject[];
  timetable: Timetable;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setTimetable: React.Dispatch<React.SetStateAction<Timetable>>;
}) {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (subjects.find(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Subject already exists"); return;
    }
    const subject: Subject = { id: Date.now().toString(), name: trimmed, classesPerWeek: 0, attended: 0, missed: 0 };
    setSubjects(prev => [...prev, subject]);
    setNewName("");
    toast.success(`"${trimmed}" added`);
  };

  const handleRemove = (id: string) => {
    const name = subjects.find(s => s.id === id)?.name;
    setSubjects(prev => prev.filter(s => s.id !== id));
    setTimetable(prev => {
      const next = { ...prev };
      for (const day of DAYS) {
        if (next[day]) {
          const daySlots = { ...next[day] };
          for (const slotId in daySlots) { if (daySlots[slotId] === id) daySlots[slotId] = null; }
          next[day] = daySlots;
        }
      }
      return next;
    });
    if (name) toast.info(`"${name}" removed`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Subjects
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Add or remove subjects. Assign them to time slots in the Timetable section.
        </p>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g., Mathematics"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: newName.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.3)", cursor: newName.trim() ? "pointer" : "not-allowed" }}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No subjects yet. Add your first subject above.
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject, i) => {
              const hrs = computeHoursPerWeek(timetable, subject.id);
              return (
                <div key={subject.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`} />
                    <span className="font-medium text-sm">{subject.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {hrs > 0 ? `${hrs} hrs/wk` : "Not scheduled"}
                    </span>
                  </div>
                  <button onClick={() => handleRemove(subject.id)}
                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TIMETABLE PANEL
// ─────────────────────────────────────────────────────────────
function AdminTimetablePanel({
  subjects,
  timetable,
  timeSlots,
  setTimetable,
}: {
  subjects: Subject[];
  timetable: Timetable;
  timeSlots: TimeSlot[];
  setTimetable: React.Dispatch<React.SetStateAction<Timetable>>;
}) {
  type ActiveCell = { day: typeof DAYS[number]; slotId: string } | null;
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setActiveCell(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getCell = (day: typeof DAYS[number], slotId: string) => timetable[day]?.[slotId] ?? null;

  const setCell = (day: typeof DAYS[number], slotId: string, subjectId: string | null) => {
    setTimetable(prev => ({ ...prev, [day]: { ...prev[day], [slotId]: subjectId } }));
    setActiveCell(null);
  };

  const toggleCell = (day: typeof DAYS[number], slotId: string) => {
    if (activeCell?.day === day && activeCell?.slotId === slotId) setActiveCell(null);
    else setActiveCell({ day, slotId });
  };

  const slots = timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-purple-500" />
          Weekly Timetable
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Click any cell to assign a subject. Slot durations are configured in <strong>Course Timings</strong>.
        </p>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s, i) => (
            <span key={s.id} className={`px-3 py-1.5 rounded-full text-sm text-white font-medium ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`}>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          <Grid3X3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Add subjects first, then configure your timetable here.
        </div>
      ) : (
        <div ref={pickerRef} className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground w-40 border-b border-border">Time Slot</th>
                {DAYS.map(day => (
                  <th key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b border-border">
                    <div className="hidden md:block">{day}</div>
                    <div className="md:hidden">{day.slice(0, 3)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, slotIdx) => (
                <Fragment key={slot.id}>
                  <tr className={slotIdx % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="p-3 text-sm font-medium border-b border-border/50">
                      <div>{slot.label}</div>
                      <div className="text-xs text-purple-400 font-semibold mt-0.5">{slot.hours} hr{slot.hours !== 1 ? "s" : ""}</div>
                    </td>
                    {DAYS.map(day => {
                      const subjectId = getCell(day, slot.id);
                      const subject = subjectId ? subjects.find(s => s.id === subjectId) : null;
                      const colorIdx = subject ? subjects.findIndex(s => s.id === subject.id) % SUBJECT_COLORS.length : -1;
                      const open = activeCell?.day === day && activeCell?.slotId === slot.id;
                      return (
                        <td key={day} className="p-1.5 border-b border-border/50">
                          <button
                            onClick={() => toggleCell(day, slot.id)}
                            className={`w-full min-h-[52px] rounded-lg border-2 transition-all text-xs font-medium px-2 py-1.5 flex flex-col items-center justify-center gap-0.5
                              ${open ? "ring-2 ring-indigo-500 ring-offset-1 border-indigo-500 bg-indigo-500/5"
                              : subject ? `${SUBJECT_COLORS[colorIdx]} text-white border-transparent shadow-sm hover:opacity-90`
                              : "border-border bg-muted/40 hover:bg-muted hover:border-indigo-500/50 text-muted-foreground"}`}
                          >
                            {subject ? (
                              <span className="line-clamp-2 leading-tight text-center">{subject.name}</span>
                            ) : (
                              <span className="flex flex-col items-center gap-0.5 opacity-50">
                                <span className="text-[10px] font-semibold uppercase tracking-wide">Free</span>
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {activeCell?.slotId === slot.id && (
                    <tr key={`${slot.id}-picker`}>
                      <td colSpan={DAYS.length + 1} className="px-3 pb-3">
                        <div className="rounded-xl border bg-popover shadow-md overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {activeCell.day} · {slot.label} ({slot.hours} hr{slot.hours !== 1 ? "s" : ""}) — pick a subject
                            </p>
                            <button onClick={() => setActiveCell(null)} className="text-muted-foreground hover:text-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 px-4 py-3">
                            {subjects.map((s, i) => {
                              const selected = getCell(activeCell.day, slot.id) === s.id;
                              return (
                                <button key={s.id} onClick={() => setCell(activeCell.day, slot.id, s.id)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                                    ${selected ? `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]} text-white border-transparent shadow` : "border-border hover:border-indigo-500 hover:bg-muted"}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`} />
                                  {s.name}
                                  {selected && <span className="text-xs opacity-80">✓</span>}
                                </button>
                              );
                            })}
                            {getCell(activeCell.day, slot.id) && (
                              <button onClick={() => setCell(activeCell.day, slot.id, null)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10">
                                <X className="h-3.5 w-3.5" />
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOLIDAYS PANEL
// ─────────────────────────────────────────────────────────────
function AdminHolidaysPanel({
  holidays, subjects, timetable, timeSlots, setHolidays,
}: {
  holidays: Holiday[];
  subjects: Subject[];
  timetable: Timetable;
  timeSlots: TimeSlot[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
}) {
  const [hName, setHName] = useState("");
  const [hStart, setHStart] = useState("");
  const [hEnd, setHEnd] = useState("");
  const [autoResult, setAutoResult] = useState<{ cancelledHours: { subjectId: string; hours: number }[]; breakdown: any[] }>({ cancelledHours: [], breakdown: [] });

  const activeSlots = timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;

  useEffect(() => {
    if (hStart && hEnd) setAutoResult(computeAutoHoliday(hStart, hEnd, timetable, subjects, activeSlots));
    else setAutoResult({ cancelledHours: [], breakdown: [] });
  }, [hStart, hEnd, timetable, subjects, activeSlots]);

  const handleAdd = () => {
    if (!hName.trim() || !hStart || !hEnd) return;
    const holiday: Holiday = {
      id: Date.now().toString(), name: hName.trim(), startDate: hStart, endDate: hEnd,
      cancelledHours: autoResult.cancelledHours,
    };
    setHolidays(prev => [...prev, holiday]);
    toast.success(`Holiday "${hName.trim()}" added`);
    setHName(""); setHStart(""); setHEnd("");
    setAutoResult({ cancelledHours: [], breakdown: [] });
  };

  const handleRemove = (id: string) => {
    const name = holidays.find(h => h.id === id)?.name;
    setHolidays(prev => prev.filter(h => h.id !== id));
    if (name) toast.info(`"${name}" removed`);
  };

  const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? "Unknown";
  const totalCancelled = autoResult.cancelledHours.reduce((s, c) => s + c.hours, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palmtree className="h-5 w-5 text-green-500" />
          Holidays & Breaks
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Add holidays — cancelled hours are auto-calculated from the timetable using your configured course timings.
        </p>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Holiday Name</label>
            <input type="text" placeholder="e.g., Pongal" value={hName}
              onChange={(e) => setHName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <input type="date" value={hStart}
              onChange={(e) => { setHStart(e.target.value); if (!hEnd) setHEnd(e.target.value); }}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <input type="date" value={hEnd} min={hStart}
              onChange={(e) => setHEnd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm outline-none focus:border-indigo-500 transition-colors" />
          </div>
        </div>

        {hStart && hEnd && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              Auto-detected cancelled classes (using your course timings)
            </div>
            {autoResult.breakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {subjects.length === 0 ? "No subjects added yet." : "No classes scheduled on those days."}
              </p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {autoResult.breakdown.map((day: any) => (
                    <div key={day.date} className="flex items-start gap-3 p-2 bg-background rounded-lg border border-border/50">
                      <div className="w-24 shrink-0">
                        <p className="font-medium text-sm">{day.dayName}</p>
                        <p className="text-xs text-muted-foreground">{fmt(day.date)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {day.subjects.map((s: any) => (
                          <span key={s.subjectId} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">
                            {s.name} – {s.hours} hr{s.hours !== 1 ? "s" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-border">
                  <p className="text-sm font-medium">Total cancelled: <span className="text-indigo-500">{totalCancelled} hrs</span></p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {autoResult.cancelledHours.map(ch => (
                      <span key={ch.subjectId} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                        {getSubjectName(ch.subjectId)}: {ch.hours} hrs
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button onClick={handleAdd}
          disabled={!hName.trim() || !hStart || !hEnd || autoResult.cancelledHours.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all w-full justify-center"
          style={{ background: (hName.trim() && hStart && hEnd && autoResult.cancelledHours.length > 0) ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.3)", cursor: (hName.trim() && hStart && hEnd && autoResult.cancelledHours.length > 0) ? "pointer" : "not-allowed" }}>
          <Plus className="h-4 w-4" />
          Add Holiday
        </button>

        {hName && hStart && hEnd && autoResult.cancelledHours.length === 0 && subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertCircle className="h-4 w-4" />
            No classes scheduled on these dates — holiday will have no cancelled hours.
          </div>
        )}
      </div>

      {holidays.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest">Added Holidays ({holidays.length})</h3>
          {holidays.map((holiday) => {
            const start = new Date(holiday.startDate + "T00:00:00");
            const end = new Date(holiday.endDate + "T00:00:00");
            const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
            const totalHrs = holiday.cancelledHours.reduce((s, c) => s + c.hours, 0);
            return (
              <div key={holiday.id} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.1)" }}>
                      <Palmtree className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(holiday.startDate)}{holiday.startDate !== holiday.endDate ? ` → ${fmt(holiday.endDate)}` : ""} · {days} day{days !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalHrs > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border font-medium">
                        {totalHrs} hrs cancelled
                      </span>
                    )}
                    <button onClick={() => handleRemove(holiday.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {holiday.cancelledHours.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-10">
                    {holiday.cancelledHours.map(ch => (
                      <span key={ch.subjectId} className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                        {getSubjectName(ch.subjectId)}: {ch.hours} hrs
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
