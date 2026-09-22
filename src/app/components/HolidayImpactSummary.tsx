import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Subject } from "./SubjectManager";
import { Timetable, TimeSlot, DEFAULT_TIME_SLOTS, countDayOccurrences, computeSubjectTotalHours } from "./TimetableManager";
import { Holiday } from "./HolidayManager";
import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { CalendarDays, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";

interface HolidayImpactSummaryProps {
  startDate: string;
  endDate: string;
  holidays: Holiday[];
  subjects: Subject[];
  timetable: Timetable;
  timeSlots?: TimeSlot[];
}

const JS_DAY_TO_NAME: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

export function HolidayImpactSummary({ startDate, endDate, holidays, subjects, timetable, timeSlots }: HolidayImpactSummaryProps) {
  const activeSlots = timeSlots && timeSlots.length > 0 ? timeSlots : DEFAULT_TIME_SLOTS;
  
  if (!startDate || !endDate) return null;

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Calculate total days
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayCounts = countDayOccurrences(startDate, endDate);

  // Flatten holidays to find individual holiday dates
  const holidayDates = new Set<string>();
  let totalHolidaysDetected = 0;
  
  const subjectImpacts: Record<string, number> = {};

  holidays.forEach(holiday => {
    const hStart = new Date(holiday.startDate + "T00:00:00");
    const hEnd = new Date(holiday.endDate + "T00:00:00");
    
    let cur = new Date(hStart);
    while (cur <= hEnd) {
      holidayDates.add(cur.toISOString().split("T")[0]);
      totalHolidaysDetected++;
      cur.setDate(cur.getDate() + 1);
    }

    // Tally up the subject impact
    holiday.cancelledHours.forEach(ch => {
      subjectImpacts[ch.subjectId] = (subjectImpacts[ch.subjectId] || 0) + ch.hours;
    });
  });

  const totalWorkingDays = totalDays - holidayDates.size;
  
  // Custom modifiers for calendar
  const holidayDateObjects = Array.from(holidayDates).map(dateStr => new Date(dateStr + "T00:00:00"));

  const modifiers = {
    holiday: holidayDateObjects,
  };
  
  const modifiersStyles = {
    holiday: {
      color: 'white',
      backgroundColor: '#ef4444',
      fontWeight: 'bold'
    }
  };

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name ?? "Unknown";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            Semester Calendar
          </CardTitle>
          <CardDescription>Visual overview of your working days and holidays</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <DayPicker
            mode="multiple"
            selected={holidayDateObjects}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            defaultMonth={start}
            fromDate={start}
            toDate={end}
            className="border rounded-xl p-4 shadow-sm"
          />
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Holiday Analysis Summary
          </CardTitle>
          <CardDescription>Impact of holidays on your subjects and attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold">{totalDays}</span>
              <span className="text-sm text-muted-foreground">Total Semester Days</span>
            </div>
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold">{totalWorkingDays}</span>
              <span className="text-sm">Working Days</span>
            </div>
            <div className="bg-red-500/10 text-red-700 dark:text-red-400 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold">{totalHolidaysDetected}</span>
              <span className="text-sm">Total Holidays</span>
            </div>
            <div className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold">{Object.keys(subjectImpacts).length}</span>
              <span className="text-sm">Subjects Affected</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Subject-wise Missed Classes
            </h3>
            {Object.keys(subjectImpacts).length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
                No classes are affected by the current holidays.
              </p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {Object.entries(subjectImpacts).sort((a, b) => b[1] - a[1]).map(([subjectId, hours]) => {
                  const subject = subjects.find(s => s.id === subjectId);
                  const scheduledHours = computeSubjectTotalHours(timetable, subjectId, dayCounts, activeSlots);
                  // Approximate classes based on default slot size if needed, but hours is safer
                  
                  return (
                    <div key={subjectId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{subject?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{hours} hours cancelled out of {scheduledHours} total</p>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        -{hours} hrs
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
