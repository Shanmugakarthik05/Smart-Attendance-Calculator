import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { BarChart3, PieChart, TrendingUp, FileText, FileSpreadsheet } from "lucide-react";
import { Subject } from "./SubjectManager";
import { Holiday } from "./HolidayManager";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface AttendanceDashboardProps {
  subjects: Subject[];
  holidays: Holiday[];
  getTotalHours: (subjectId: string) => number;
  getCancelledHours: (subjectId: string) => number;
  totalWeeks: number;
  minAttendance: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function AttendanceDashboard({
  subjects,
  holidays,
  getTotalHours,
  getCancelledHours,
  totalWeeks,
  minAttendance,
  onExportCSV,
  onExportPDF,
}: AttendanceDashboardProps) {
  if (subjects.length === 0) {
    return null;
  }

  const totalClasses = subjects.reduce((sum, s) => {
    return sum + getTotalHours(s.id);
  }, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalMissed = subjects.reduce((sum, s) => sum + s.missed, 0);
  const totalRemaining = totalClasses - totalAttended - totalMissed;
  const overallAttendance = (totalAttended + totalMissed) > 0 
    ? (totalAttended / (totalAttended + totalMissed)) * 100 
    : 0;
  const totalAllowedLeaves = Math.floor(totalClasses * (100 - minAttendance) / 100);
  const leavesRemaining = totalAllowedLeaves - totalMissed;

  // Data for pie chart
  const pieData = [
    { name: 'Attended', value: totalAttended, color: '#22c55e' },
    { name: 'Missed', value: totalMissed, color: '#ef4444' },
    { name: 'Remaining', value: totalRemaining, color: '#94a3b8' },
  ].filter(item => item.value > 0);

  // Data for bar chart
  const barData = subjects.map(subject => {
    const total = getTotalHours(subject.id);
    const attended = subject.attended;
    const missed = subject.missed;
    const remaining = total - attended - missed;
    return {
      name: subject.name.length > 15 ? subject.name.substring(0, 15) + '...' : subject.name,
      Attended: attended,
      Missed: missed,
      Remaining: remaining,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Statistics
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={onExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">Overall Attendance</p>
              <div className="flex items-baseline gap-2">
                <p className={overallAttendance < minAttendance ? "text-destructive" : "text-green-600 dark:text-green-400"}>
                  {overallAttendance.toFixed(1)}%
                </p>
                {overallAttendance < minAttendance && (
                  <Badge variant="destructive">Below Target</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Total Hours</p>
              <p>{totalClasses} hrs</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Hours Attended</p>
              <p className="text-green-600 dark:text-green-400">{totalAttended} hrs</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Hours Can Skip</p>
              <p className={leavesRemaining < 0 ? "text-destructive" : ""}>
                {leavesRemaining} / {totalAllowedLeaves}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Overall Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subject-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Attended" fill="#22c55e" />
                <Bar dataKey="Missed" fill="#ef4444" />
                <Bar dataKey="Remaining" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
