import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Calendar } from "lucide-react";

interface SemesterFormProps {
  startDate: string;
  endDate: string;
  minAttendance: number;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onMinAttendanceChange: (percentage: number) => void;
  totalWeeks: number;
}

export function SemesterForm({
  startDate,
  endDate,
  minAttendance,
  onStartDateChange,
  onEndDateChange,
  onMinAttendanceChange,
  totalWeeks,
}: SemesterFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Semester Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start-date">Semester Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-input-background"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">Semester End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-input-background"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min-attendance">Minimum Attendance (%)</Label>
            <Input
              id="min-attendance"
              type="number"
              min="0"
              max="100"
              value={minAttendance}
              onChange={(e) => onMinAttendanceChange(Number(e.target.value))}
              className="bg-input-background"
            />
          </div>
        </div>
        
        {startDate && endDate && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
            <p className="text-muted-foreground text-center">
              Total Semester Duration: <span className="text-foreground">{totalWeeks} weeks</span>
            </p>
            <p className="text-muted-foreground text-center mt-1">
              Working weeks vary by subject based on holidays
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
