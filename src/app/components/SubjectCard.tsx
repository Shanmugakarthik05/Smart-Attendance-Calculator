import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { Subject } from "./SubjectManager";
import { DAYS, Timetable, computeHoursPerDay } from "./TimetableManager";

interface SubjectCardProps {
  subject: Subject;
  totalHours: number;
  cancelledHours: number;
  scheduledHours: number;
  minAttendance: number;
  timetable: Timetable;
  dayCounts: Record<string, number>;
  onAttend: (id: string) => void;
  onMiss: (id: string) => void;
  onReset: (id: string) => void;
}

export function SubjectCard({
  subject,
  totalHours,
  cancelledHours,
  scheduledHours,
  minAttendance,
  timetable,
  dayCounts,
  onAttend,
  onMiss,
  onReset,
}: SubjectCardProps) {
  const hoursPerDay = computeHoursPerDay(timetable, subject.id);
  const activeDays = DAYS.filter(d => hoursPerDay[d] > 0);
  const totalClasses = totalHours;
  const attendedClasses = subject.attended;
  const missedClasses = subject.missed;
  const remainingClasses = totalClasses - attendedClasses - missedClasses;
  const attendancePercentage = totalClasses > 0 
    ? ((attendedClasses / (attendedClasses + missedClasses)) * 100) || 0
    : 0;
  const allowedLeaves = Math.floor(totalClasses * (100 - minAttendance) / 100);
  const leavesRemaining = allowedLeaves - missedClasses;
  
  const isBelow = attendancePercentage < minAttendance && (attendedClasses + missedClasses) > 0;
  const isWarning = leavesRemaining <= 2 && leavesRemaining > 0;

  return (
    <Card className={isBelow ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{subject.name}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {subject.classesPerWeek} hrs/week ·{" "}
              {activeDays.length > 0
                ? activeDays.map(d => `${d.slice(0, 3)} (${hoursPerDay[d]}h)`).join(", ")
                : "Not scheduled"}
            </p>
          </div>
          <div className="text-right">
            {isBelow ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Below {minAttendance}%
              </Badge>
            ) : isWarning ? (
              <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                Low Leaves
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                On Track
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Attendance</span>
            <span className={isBelow ? "text-destructive" : ""}>
              {attendancePercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={attendancePercentage} className="h-2" />
        </div>

        {/* Scheduled hours breakdown by day */}
        {activeDays.length > 0 && (
          <div className="p-2 bg-muted/60 rounded-lg border text-xs space-y-1">
            <p className="font-medium text-foreground">Semester total: {scheduledHours} hrs</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
              {activeDays.map(day => (
                <span key={day}>
                  {day.slice(0, 3)}: {dayCounts[day] ?? 0} × {hoursPerDay[day]}h = {(dayCounts[day] ?? 0) * hoursPerDay[day]}h
                </span>
              ))}
            </div>
          </div>
        )}

        {cancelledHours > 0 && (
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-xs">
            <p className="text-blue-600 dark:text-blue-400">
              {cancelledHours} hrs cancelled during holidays
            </p>
            <p className="text-muted-foreground">
              {scheduledHours} hrs scheduled → {totalClasses.toFixed(1)} hrs actual
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-muted-foreground">Attended</p>
            <p className="text-green-600 dark:text-green-400">
              {attendedClasses} / {totalClasses} hrs
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Missed</p>
            <p className="text-red-600 dark:text-red-400">
              {missedClasses} / {allowedLeaves} hrs
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Remaining</p>
            <p>{remainingClasses} hours</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Hours Left to Skip</p>
            <p className={leavesRemaining < 0 ? "text-destructive" : ""}>
              {leavesRemaining} {leavesRemaining < 0 ? "(over limit)" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Button
              onClick={() => onAttend(subject.id)}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={remainingClasses <= 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Attended
            </Button>
            <Button
              onClick={() => onMiss(subject.id)}
              variant="destructive"
              className="flex-1"
              disabled={remainingClasses <= 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Missed
            </Button>
          </div>
          <Button
            onClick={() => onReset(subject.id)}
            variant="outline"
            className="w-full"
            disabled={attendedClasses === 0 && missedClasses === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Attendance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
