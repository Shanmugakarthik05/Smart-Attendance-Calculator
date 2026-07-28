import { useState, useEffect } from "react";
import { SemesterForm } from "./components/SemesterForm";
import { SubjectManager, Subject } from "./components/SubjectManager";
import { SubjectCard } from "./components/SubjectCard";
import { AttendanceDashboard } from "./components/AttendanceDashboard";
import { HolidayManager, Holiday } from "./components/HolidayManager";
import { ThemeToggle } from "./components/ThemeToggle";
import { Footer } from "./components/Footer";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";
import { RotateCcw, GraduationCap } from "lucide-react";

export default function App() {
  // Get dates for default semester (current date + 16 weeks)
  const getDefaultDates = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 16 * 7); // 16 weeks
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [minAttendance, setMinAttendance] = useState(75);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Calculate total weeks
  const calculateTotalWeeks = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  const totalWeeks = calculateTotalWeeks();

  // Calculate cancelled hours for a specific subject from all holidays
  const getCancelledHoursForSubject = (subjectId: string) => {
    let totalCancelledHours = 0;
    holidays.forEach(holiday => {
      const cancelledHour = holiday.cancelledHours.find(ch => ch.subjectId === subjectId);
      if (cancelledHour) {
        totalCancelledHours += cancelledHour.hours;
      }
    });
    return totalCancelledHours;
  };

  // Calculate total hours for a subject (including cancelled hours)
  const getTotalHoursForSubject = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return 0;
    
    const scheduledHours = subject.classesPerWeek * totalWeeks;
    const cancelledHours = getCancelledHoursForSubject(subjectId);
    return Math.max(0, scheduledHours - cancelledHours);
  };

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('attendanceData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStartDate(data.startDate || defaultDates.start);
        setEndDate(data.endDate || defaultDates.end);
        setMinAttendance(data.minAttendance || 75);
        setSubjects(data.subjects || []);
        setHolidays(data.holidays || []);
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    const data = {
      startDate,
      endDate,
      minAttendance,
      subjects,
      holidays,
    };
    localStorage.setItem('attendanceData', JSON.stringify(data));
  }, [startDate, endDate, minAttendance, subjects, holidays]);

  // Check for low attendance and show notifications
  useEffect(() => {
    subjects.forEach(subject => {
      const totalClasses = getTotalHoursForSubject(subject.id);
      const attendedClasses = subject.attended;
      const missedClasses = subject.missed;
      const attendancePercentage = (attendedClasses + missedClasses) > 0
        ? (attendedClasses / (attendedClasses + missedClasses)) * 100
        : 0;
      
      if (attendancePercentage < minAttendance && attendancePercentage > 0) {
        const deficit = minAttendance - attendancePercentage;
        if (deficit >= 5) {
          // Only show notification if significantly below
          const lastNotification = sessionStorage.getItem(`notification-${subject.id}`);
          if (!lastNotification) {
            toast.error(`Low Attendance Alert`, {
              description: `${subject.name} is at ${attendancePercentage.toFixed(1)}% (below ${minAttendance}%)`,
            });
            sessionStorage.setItem(`notification-${subject.id}`, 'shown');
          }
        }
      }
    });
  }, [subjects, minAttendance, holidays]);

  const handleAddSubject = (newSubject: Omit<Subject, 'id' | 'attended' | 'missed'>) => {
    const subject: Subject = {
      ...newSubject,
      id: Date.now().toString(),
      attended: 0,
      missed: 0,
    };
    setSubjects([...subjects, subject]);
    toast.success(`${subject.name} added successfully`);
  };

  const handleRemoveSubject = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    setSubjects(subjects.filter(s => s.id !== id));
    if (subject) {
      toast.info(`${subject.name} removed`);
    }
  };

  const handleAttend = (id: string) => {
    setSubjects(subjects.map(s => 
      s.id === id ? { ...s, attended: s.attended + 1 } : s
    ));
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      toast.success(`Hour attended`, {
        description: `${subject.name} - Total attended: ${subject.attended + 1} hrs`,
      });
    }
  };

  const handleMiss = (id: string) => {
    setSubjects(subjects.map(s => 
      s.id === id ? { ...s, missed: s.missed + 1 } : s
    ));
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      toast.warning(`Hour missed`, {
        description: `${subject.name} - Total missed: ${subject.missed + 1} hrs`,
      });
    }
  };

  const handleResetSubject = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    if (subject && confirm(`Reset attendance for ${subject.name}? This will clear all attended and missed hours.`)) {
      setSubjects(subjects.map(s => 
        s.id === id ? { ...s, attended: 0, missed: 0 } : s
      ));
      toast.success(`Attendance reset`, {
        description: `${subject.name} attendance has been reset to 0`,
      });
    }
  };

  const handleAddHoliday = (newHoliday: Omit<Holiday, 'id'>) => {
    const holiday: Holiday = {
      ...newHoliday,
      id: Date.now().toString(),
    };
    setHolidays([...holidays, holiday]);
    toast.success(`${holiday.name} added`, {
      description: 'Total hours recalculated',
    });
  };

  const handleRemoveHoliday = (id: string) => {
    const holiday = holidays.find(h => h.id === id);
    setHolidays(holidays.filter(h => h.id !== id));
    if (holiday) {
      toast.info(`${holiday.name} removed`, {
        description: 'Total hours recalculated',
      });
    }
  };

  const getExportData = () => {
    return subjects.map(subject => {
      const scheduledHours = subject.classesPerWeek * totalWeeks;
      const cancelledHours = getCancelledHoursForSubject(subject.id);
      const totalClasses = getTotalHoursForSubject(subject.id);
      const attendedClasses = subject.attended;
      const missedClasses = subject.missed;
      const remainingClasses = totalClasses - attendedClasses - missedClasses;
      const attendancePercentage = (attendedClasses + missedClasses) > 0
        ? ((attendedClasses / (attendedClasses + missedClasses)) * 100).toFixed(2)
        : '0.00';
      const allowedLeaves = Math.floor(totalClasses * (100 - minAttendance) / 100);
      const leavesRemaining = allowedLeaves - missedClasses;

      return {
        Subject: subject.name,
        'Hours Per Week': subject.classesPerWeek,
        'Total Weeks': totalWeeks,
        'Scheduled Hours': scheduledHours.toFixed(1),
        'Cancelled Hours': cancelledHours.toFixed(1),
        'Actual Total Hours': totalClasses.toFixed(1),
        'Attended (hrs)': attendedClasses,
        'Missed (hrs)': missedClasses,
        'Remaining (hrs)': remainingClasses.toFixed(1),
        'Attendance %': attendancePercentage,
        'Allowed Absences (hrs)': allowedLeaves,
        'Hours Can Still Skip': leavesRemaining,
      };
    });
  };

  const handleExportCSV = () => {
    const data = getExportData();

    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const data = getExportData();
      
      // Header
      doc.setFontSize(18);
      doc.text('Semester Attendance Report', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Semester: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 34);
      doc.text(`Minimum Attendance: ${minAttendance}%`, 14, 40);
      
      // Overall Statistics
      const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
      const totalMissed = subjects.reduce((sum, s) => sum + s.missed, 0);
      const overallPercentage = (totalAttended + totalMissed) > 0 
        ? ((totalAttended / (totalAttended + totalMissed)) * 100).toFixed(1)
        : '0.0';
      
      doc.setFontSize(12);
      doc.text('Overall Statistics', 14, 50);
      doc.setFontSize(10);
      doc.text(`Overall Attendance: ${overallPercentage}%`, 14, 56);
      doc.text(`Total Hours Attended: ${totalAttended}`, 14, 62);
      doc.text(`Total Hours Missed: ${totalMissed}`, 14, 68);
      
      // Subject Details
      let yPosition = 80;
      doc.setFontSize(12);
      doc.text('Subject Details', 14, yPosition);
      yPosition += 8;
      
      data.forEach((subject, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${subject.Subject}`, 14, yPosition);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        yPosition += 5;
        doc.text(`Hours Per Week: ${subject['Hours Per Week']}`, 20, yPosition);
        yPosition += 4;
        doc.text(`Scheduled Hours: ${subject['Scheduled Hours']} | Cancelled: ${subject['Cancelled Hours']} | Actual: ${subject['Actual Total Hours']}`, 20, yPosition);
        yPosition += 4;
        doc.text(`Attended: ${subject['Attended (hrs)']} hrs | Missed: ${subject['Missed (hrs)']} hrs | Remaining: ${subject['Remaining (hrs)']} hrs`, 20, yPosition);
        yPosition += 4;
        doc.text(`Attendance: ${subject['Attendance %']}% | Allowed Absences: ${subject['Allowed Absences (hrs)']} hrs | Can Still Skip: ${subject['Hours Can Still Skip']} hrs`, 20, yPosition);
        yPosition += 8;
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('SK TECH - Semester Attendance Calculator', 14, doc.internal.pageSize.height - 10);
      }
      
      // Save
      doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      const defaultDates = getDefaultDates();
      setStartDate(defaultDates.start);
      setEndDate(defaultDates.end);
      setMinAttendance(75);
      setSubjects([]);
      setHolidays([]);
      sessionStorage.clear();
      toast.success('All data has been reset');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Toaster />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1>Semester Attendance Calculator</h1>
              <p className="text-muted-foreground">
                Track and manage your attendance efficiently
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        {/* Configuration */}
        <SemesterForm
          startDate={startDate}
          endDate={endDate}
          minAttendance={minAttendance}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onMinAttendanceChange={setMinAttendance}
          totalWeeks={totalWeeks}
        />

        {/* Holiday Manager */}
        <HolidayManager
          holidays={holidays}
          subjects={subjects}
          onAddHoliday={handleAddHoliday}
          onRemoveHoliday={handleRemoveHoliday}
          totalWeeks={totalWeeks}
        />

        {/* Subject Manager */}
        <SubjectManager
          subjects={subjects}
          onAddSubject={handleAddSubject}
          onRemoveSubject={handleRemoveSubject}
        />

        {/* Dashboard and Subject Cards */}
        {subjects.length > 0 && (
          <Tabs defaultValue="subjects" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="subjects">Subject Tracking</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subjects" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => {
                  const totalHours = getTotalHoursForSubject(subject.id);
                  const cancelledHours = getCancelledHoursForSubject(subject.id);
                  return (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      totalHours={totalHours}
                      cancelledHours={cancelledHours}
                      totalWeeks={totalWeeks}
                      minAttendance={minAttendance}
                      onAttend={handleAttend}
                      onMiss={handleMiss}
                      onReset={handleResetSubject}
                    />
                  );
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="dashboard" className="mt-6">
              <AttendanceDashboard
                subjects={subjects}
                holidays={holidays}
                getTotalHours={getTotalHoursForSubject}
                getCancelledHours={getCancelledHoursForSubject}
                totalWeeks={totalWeeks}
                minAttendance={minAttendance}
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {subjects.length === 0 && (
          <div className="text-center py-12 px-4 bg-muted/50 rounded-xl border-2 border-dashed">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3>No Subjects Added Yet</h3>
            <p className="text-muted-foreground mt-2">
              Add your first subject above to start tracking attendance
            </p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
