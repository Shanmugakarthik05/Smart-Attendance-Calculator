import { useState, useRef, useEffect, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, X } from "lucide-react";
import { Subject } from "./SubjectManager";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Day = typeof DAYS[number];

// ─── Dynamic Time Slot type ───────────────────────────────────
export interface TimeSlot {
  id: string;
  label: string;
  hours: number;
}

/** Default time slots */
export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: "slot1", label: "8:00 AM to 9:30 AM", hours: 1.5 },
  { id: "slot2", label: "9:45 AM to 11:15 AM", hours: 1.5 },
  { id: "slot3", label: "11:30 AM to 12:15 PM", hours: 0.75 },
  { id: "slot4", label: "12:15 PM to 1:00 PM", hours: 0.75 },
  { id: "slot5", label: "1:15 PM to 2:45 PM", hours: 1.5 },
  { id: "slot6", label: "3:00 PM to 4:30 PM", hours: 1.5 },
];

// Keep backward-compat alias used elsewhere
export const TIME_SLOTS = DEFAULT_TIME_SLOTS;
export type SlotId = string; // now dynamic; no longer a finite union

export type Timetable = {
  [day in Day]?: {
    [slotId: string]: string | null; // subjectId or null
  };
};

const SUBJECT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

interface TimetableManagerProps {
  timetable: Timetable;
  subjects: Subject[];
  dayCounts: Record<string, number>;
  onTimetableChange: (timetable: Timetable) => void;
  /** Custom time slots; falls back to DEFAULT_TIME_SLOTS */
  timeSlots?: TimeSlot[];
}

export function getSubjectColorIndex(subjects: Subject[], subjectId: string) {
  const idx = subjects.findIndex(s => s.id === subjectId);
  return idx >= 0 ? idx % SUBJECT_COLORS.length : 0;
}

type ActiveCell = { day: Day; slotId: string } | null;

export function TimetableManager({ timetable, subjects, dayCounts, onTimetableChange, timeSlots }: TimetableManagerProps) {
  const slots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getCell = (day: Day, slotId: string): string | null =>
    timetable[day]?.[slotId] ?? null;

  const setCell = (day: Day, slotId: string, subjectId: string | null) => {
    onTimetableChange({
      ...timetable,
      [day]: { ...timetable[day], [slotId]: subjectId },
    });
    setActiveCell(null);
  };

  const toggleCell = (day: Day, slotId: string) => {
    if (activeCell?.day === day && activeCell?.slotId === slotId) {
      setActiveCell(null);
    } else {
      setActiveCell({ day, slotId });
    }
  };

  const getHoursPerWeek = (subjectId: string) => {
    let count = 0;
    for (const day of DAYS)
      for (const slot of slots)
        if (getCell(day, slot.id) === subjectId) count += slot.hours;
    return count;
  };

  const getTotalSemesterHours = (subjectId: string) =>
    computeSubjectTotalHours(timetable, subjectId, dayCounts as Record<Day, number>, slots);

  const isOpen = (day: Day, slotId: string) =>
    activeCell?.day === day && activeCell?.slotId === slotId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Weekly Timetable</CardTitle>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { step: "1", text: "Click any empty cell" },
            { step: "2", text: "Pick a subject from the list" },
            { step: "3", text: "Click again to change or clear it" },
          ].map(({ step, text }) => (
            <div
              key={step}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border text-sm"
            >
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {step}
              </span>
              <span className="text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {subjects.map((subject, idx) => (
              <Badge
                key={subject.id}
                className={`${SUBJECT_COLORS[idx % SUBJECT_COLORS.length]} text-white border-0`}
              >
                {subject.name} · {getHoursPerWeek(subject.id)} hrs/wk · {getTotalSemesterHours(subject.id)} hrs total
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {subjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            Add subjects first, then assign them to time slots here.
          </p>
        ) : (
          <div ref={pickerRef} className="space-y-0">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground font-medium w-36">
                    Time Slot
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="p-2 text-center text-muted-foreground font-medium">
                      <div className="hidden md:block">{day}</div>
                      <div className="md:hidden">{day.slice(0, 3)}</div>
                      <div className="text-xs font-normal opacity-60">{dayCounts[day] ?? 0} days</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, slotIdx) => (
                  <Fragment key={slot.id}>
                    <tr className={slotIdx % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="p-2 text-sm font-medium whitespace-nowrap">
                        <div>{slot.label}</div>
                        <div className="text-xs text-muted-foreground">{slot.hours} hrs</div>
                      </td>
                      {DAYS.map(day => {
                        const subjectId = getCell(day, slot.id);
                        const subject = subjectId ? subjects.find(s => s.id === subjectId) : null;
                        const colorIdx = subject ? getSubjectColorIndex(subjects, subject.id) : -1;
                        const open = isOpen(day, slot.id);

                        return (
                          <td key={day} className="p-1.5">
                            <button
                              onClick={() => toggleCell(day, slot.id)}
                              className={`w-full min-h-[56px] rounded-lg border-2 transition-all duration-150 text-xs font-medium px-2 py-1.5 flex flex-col items-center justify-center gap-0.5
                                ${open
                                  ? "ring-2 ring-primary ring-offset-1 border-primary bg-primary/5"
                                  : subject
                                    ? `${SUBJECT_COLORS[colorIdx]} text-white border-transparent shadow-sm hover:opacity-90`
                                    : "border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 text-muted-foreground"
                                }`}
                            >
                              {subject ? (
                                <span className="line-clamp-2 leading-tight text-center">{subject.name}</span>
                              ) : (
                                <span className="flex flex-col items-center gap-0.5 opacity-50">
                                  <span className="text-[10px] font-semibold tracking-wide uppercase">Free</span>
                                  <span className="text-[9px] opacity-70">No Class</span>
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Horizontal picker bar — rendered as full-width row below the clicked slot's row */}
                    {activeCell?.slotId === slot.id && (
                      <tr key={`${slot.id}-picker`}>
                        <td colSpan={DAYS.length + 1} className="px-2 pb-2">
                          <div className="rounded-xl border bg-popover shadow-md overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {activeCell.day} · {slot.label} — choose a subject
                              </p>
                              <button
                                onClick={() => setActiveCell(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Horizontal subject chips */}
                            <div className="flex flex-wrap gap-2 px-4 py-3">
                              {subjects.map((s, i) => {
                                const currentSubjectId = getCell(activeCell.day, slot.id);
                                const selected = currentSubjectId === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => setCell(activeCell.day, slot.id, s.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all
                                      ${selected
                                        ? `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]} text-white border-transparent shadow`
                                        : "border-border hover:border-primary hover:bg-muted"
                                      }`}
                                  >
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]} ${selected ? "bg-white/70" : ""}`}
                                    />
                                    {s.name}
                                    {selected && <span className="text-xs opacity-80">✓</span>}
                                  </button>
                                );
                              })}

                              {/* Clear button — only if a subject is assigned */}
                              {getCell(activeCell.day, slot.id) && (
                                <button
                                  onClick={() => setCell(activeCell.day, slot.id, null)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all"
                                >
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
      </CardContent>
    </Card>
  );
}

/** Compute hours-per-week for every subject from the timetable (for display) */
export function computeHoursPerWeek(timetable: Timetable, subjectId: string, timeSlots?: TimeSlot[]): number {
  const slots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  let total = 0;
  for (const day of DAYS) {
    for (const slot of slots) {
      if (timetable[day]?.[slot.id] === subjectId) {
        total += slot.hours;
      }
    }
  }
  return total;
}

/** Map JS getDay() → Day name (Mon–Sat only; Sun is ignored) */
const JS_DAY_TO_DAY: Record<number, Day> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * Count how many times each weekday (Mon–Sat) occurs between startDate and endDate inclusive.
 * Dates are ISO strings "YYYY-MM-DD".
 */
export function countDayOccurrences(startDate: string, endDate: string): Record<Day, number> {
  const counts = Object.fromEntries(DAYS.map(d => [d, 0])) as Record<Day, number>;
  if (!startDate || !endDate) return counts;

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (start > end) return counts;

  const cur = new Date(start);
  while (cur <= end) {
    const day = JS_DAY_TO_DAY[cur.getDay()];
    if (day) counts[day]++;
    cur.setDate(cur.getDate() + 1);
  }
  return counts;
}

/**
 * Compute the total scheduled hours for a subject across the entire semester,
 * based on the actual number of each weekday that falls between the semester dates.
 */
export function computeSubjectTotalHours(
  timetable: Timetable,
  subjectId: string,
  dayCounts: Record<Day, number>,
  timeSlots?: TimeSlot[],
): number {
  const slots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  let total = 0;
  for (const day of DAYS) {
    for (const slot of slots) {
      if (timetable[day]?.[slot.id] === subjectId) {
        total += slot.hours * (dayCounts[day] ?? 0);
      }
    }
  }
  return total;
}

/**
 * Per-day breakdown: hours scheduled on that day for a subject.
 */
export function computeHoursPerDay(timetable: Timetable, subjectId: string, timeSlots?: TimeSlot[]): Record<Day, number> {
  const slots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  const result = Object.fromEntries(DAYS.map(d => [d, 0])) as Record<Day, number>;
  for (const day of DAYS) {
    for (const slot of slots) {
      if (timetable[day]?.[slot.id] === subjectId) {
        result[day] += slot.hours;
      }
    }
  }
  return result;
}
