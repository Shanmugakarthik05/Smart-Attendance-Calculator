import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Trash2, Palmtree, CalendarDays } from "lucide-react";
import { Subject } from "./SubjectManager";
import { Timetable, DAYS, DEFAULT_TIME_SLOTS, TimeSlot } from "./TimetableManager";

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cancelledHours: { subjectId: string; hours: number }[];
}

const JS_DAY_TO_NAME: Record<number, typeof DAYS[number]> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface DayBreakdown {
  date: string;         // ISO string
  dayName: string;
  subjects: { subjectId: string; name: string; hours: number }[];
}

function computeAutoHours(
  startDate: string,
  endDate: string,
  timetable: Timetable,
  subjects: Subject[],
  timeSlots: TimeSlot[],
): {
  cancelledHours: { subjectId: string; hours: number }[];
  breakdown: DayBreakdown[];
} {
  if (!startDate || !endDate) return { cancelledHours: [], breakdown: [] };

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (start > end) return { cancelledHours: [], breakdown: [] };

  const totals: Record<string, number> = {};
  const breakdown: DayBreakdown[] = [];

  const cur = new Date(start);
  while (cur <= end) {
    const dayName = JS_DAY_TO_NAME[cur.getDay()];
    if (dayName) {
      const daySubjects: DayBreakdown["subjects"] = [];
      for (const slot of timeSlots) {
        const subjectId = timetable[dayName]?.[slot.id];
        if (subjectId) {
          totals[subjectId] = (totals[subjectId] ?? 0) + slot.hours;
          const existing = daySubjects.find(s => s.subjectId === subjectId);
          if (existing) {
            existing.hours += slot.hours;
          } else {
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
              daySubjects.push({ subjectId, name: subject.name, hours: slot.hours });
            }
          }
        }
      }
      if (daySubjects.length > 0) {
        breakdown.push({
          date: cur.toISOString().split("T")[0],
          dayName,
          subjects: daySubjects,
        });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  const cancelledHours = Object.entries(totals).map(([subjectId, hours]) => ({
    subjectId,
    hours,
  }));

  return { cancelledHours, breakdown };
}

interface HolidayManagerProps {
  holidays: Holiday[];
  subjects: Subject[];
  timetable: Timetable;
  onAddHoliday: (holiday: Omit<Holiday, "id">) => void;
  onRemoveHoliday: (id: string) => void;
  totalWeeks: number;
  /** Custom time slots */
  timeSlots?: TimeSlot[];
}

export function HolidayManager({
  holidays,
  subjects,
  timetable,
  onAddHoliday,
  onRemoveHoliday,
  timeSlots,
}: HolidayManagerProps) {
  const activeSlots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  const [holidayName, setHolidayName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoResult, setAutoResult] = useState<{
    cancelledHours: { subjectId: string; hours: number }[];
    breakdown: DayBreakdown[];
  }>({ cancelledHours: [], breakdown: [] });

  // Recompute whenever dates or timetable change
  useEffect(() => {
    if (startDate && endDate) {
      setAutoResult(computeAutoHours(startDate, endDate, timetable, subjects, activeSlots));
    } else {
      setAutoResult({ cancelledHours: [], breakdown: [] });
    }
  }, [startDate, endDate, timetable, subjects, activeSlots]);

  // If only start date is selected, default end date to same day
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (!endDate) setEndDate(val);
  };

  const handleAddHoliday = () => {
    if (!holidayName.trim() || !startDate || !endDate) return;
    onAddHoliday({
      name: holidayName.trim(),
      startDate,
      endDate,
      cancelledHours: autoResult.cancelledHours,
    });
    setHolidayName("");
    setStartDate("");
    setEndDate("");
    setAutoResult({ cancelledHours: [], breakdown: [] });
  };

  const getSubjectName = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.name ?? "Unknown";

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const totalCancelled = autoResult.cancelledHours.reduce((s, c) => s + c.hours, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palmtree className="h-5 w-5" />
          Holiday & Break Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Form */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input
                id="holiday-name"
                placeholder="e.g., Pongal"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-start">Start Date</Label>
              <Input
                id="holiday-start"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-end">End Date</Label>
              <Input
                id="holiday-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-input-background"
              />
            </div>
          </div>

          {/* Auto-computed preview */}
          {startDate && endDate && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  Auto-detected classes in this period
                </span>
              </div>

              {autoResult.breakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {subjects.length === 0
                    ? "No subjects added yet."
                    : "No classes scheduled on those days (Sunday or timetable empty)."}
                </p>
              ) : (
                <>
                  {/* Per-day breakdown */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {autoResult.breakdown.map((day) => (
                      <div
                        key={day.date}
                        className="flex items-start gap-3 p-2 bg-background rounded-md border"
                      >
                        <div className="w-28 shrink-0">
                          <p className="font-medium text-sm">{day.dayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(day.date)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {day.subjects.map((s) => (
                            <Badge
                              key={s.subjectId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {s.name} — {s.hours} hr{s.hours !== 1 ? "s" : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary totals */}
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-sm font-medium">
                      Total cancelled: {totalCancelled} hrs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {autoResult.cancelledHours.map((ch) => (
                        <Badge key={ch.subjectId} variant="outline" className="text-xs">
                          {getSubjectName(ch.subjectId)}: {ch.hours} hrs
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <Button
            onClick={handleAddHoliday}
            className="w-full"
            disabled={
              !holidayName.trim() ||
              !startDate ||
              !endDate ||
              autoResult.cancelledHours.length === 0
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        </div>

        {/* Saved holidays list */}
        {holidays.length > 0 && (
          <div className="space-y-2 mt-6">
            <Label>Added Holidays</Label>
            <div className="space-y-2">
              {holidays.map((holiday) => {
                const start = new Date(holiday.startDate + "T00:00:00");
                const end = new Date(holiday.endDate + "T00:00:00");
                const days =
                  Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
                const totalHrs = holiday.cancelledHours.reduce(
                  (s, c) => s + c.hours,
                  0,
                );
                return (
                  <div key={holiday.id} className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Palmtree className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{holiday.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {formatDate(holiday.startDate)}
                            {holiday.startDate !== holiday.endDate &&
                              ` → ${formatDate(holiday.endDate)}`}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Badge variant="outline">
                            {days} day{days !== 1 ? "s" : ""}
                          </Badge>
                          {totalHrs > 0 && (
                            <Badge variant="secondary">{totalHrs} hrs</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveHoliday(holiday.id)}
                        className="text-destructive hover:text-destructive ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {holiday.cancelledHours.length > 0 && (
                      <div className="pl-7 flex flex-wrap gap-1.5">
                        {holiday.cancelledHours.map((ch) => (
                          <Badge key={ch.subjectId} variant="secondary" className="text-xs">
                            {getSubjectName(ch.subjectId)}: {ch.hours} hrs
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
