import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Plus, Trash2, Palmtree } from "lucide-react";
import { Subject } from "./SubjectManager";

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cancelledHours: { subjectId: string; hours: number }[];
}

interface HolidayManagerProps {
  holidays: Holiday[];
  subjects: Subject[];
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onRemoveHoliday: (id: string) => void;
  totalWeeks: number;
}

export function HolidayManager({
  holidays,
  subjects,
  onAddHoliday,
  onRemoveHoliday,
  totalWeeks,
}: HolidayManagerProps) {
  const [holidayName, setHolidayName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cancelledHours, setCancelledHours] = useState<{ subjectId: string; hours: number }[]>([]);

  const handleAddHoliday = () => {
    if (holidayName.trim() && startDate && endDate && cancelledHours.length > 0) {
      onAddHoliday({
        name: holidayName.trim(),
        startDate,
        endDate,
        cancelledHours: cancelledHours.filter(ch => ch.hours > 0),
      });
      setHolidayName("");
      setStartDate("");
      setEndDate("");
      setCancelledHours([]);
    }
  };

  const updateHours = (subjectId: string, hours: number) => {
    setCancelledHours(prev => {
      const existing = prev.find(ch => ch.subjectId === subjectId);
      if (existing) {
        return prev.map(ch => 
          ch.subjectId === subjectId ? { ...ch, hours } : ch
        );
      } else {
        return [...prev, { subjectId, hours }];
      }
    });
  };

  const getHoursForSubject = (subjectId: string) => {
    return cancelledHours.find(ch => ch.subjectId === subjectId)?.hours || 0;
  };

  const calculateDuration = (start: string, end: string) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const diffTime = Math.abs(endD.getTime() - startD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  };

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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  placeholder="e.g., Winter Break"
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-input-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="holiday-end">End Date</Label>
                <Input
                  id="holiday-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-input-background"
                />
              </div>
            </div>

            {subjects.length > 0 && (
              <div className="space-y-2">
                <Label>Which classes are cancelled and how many hours?</Label>
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg max-h-64 overflow-y-auto">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                      <Label htmlFor={`hours-${subject.id}`} className="cursor-pointer">
                        {subject.name}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`hours-${subject.id}`}
                          type="number"
                          min="0"
                          max="200"
                          step="0.5"
                          placeholder="0"
                          value={getHoursForSubject(subject.id) || ''}
                          onChange={(e) => updateHours(subject.id, parseFloat(e.target.value) || 0)}
                          className="w-24 bg-input-background"
                        />
                        <span className="text-muted-foreground">hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  Total hours cancelled: {cancelledHours.reduce((sum, ch) => sum + ch.hours, 0).toFixed(1)} hrs
                </p>
              </div>
            )}

            <Button 
              onClick={handleAddHoliday} 
              className="w-full"
              disabled={subjects.length === 0 || cancelledHours.filter(ch => ch.hours > 0).length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </div>

          {holidays.length > 0 && (
            <div className="space-y-2 mt-6">
              <Label>Added Holidays</Label>
              <div className="space-y-2">
                {holidays.map((holiday) => {
                  const days = calculateDuration(holiday.startDate, holiday.endDate);
                  return (
                    <div
                      key={holiday.id}
                      className="p-3 bg-muted rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Palmtree className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p>{holiday.name}</p>
                            <p className="text-muted-foreground">
                              {new Date(holiday.startDate).toLocaleDateString()} - {new Date(holiday.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {days} day{days !== 1 ? 's' : ''}
                          </Badge>
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
                        <div className="pl-7 space-y-1">
                          <p className="text-muted-foreground">Cancelled hours:</p>
                          <div className="flex flex-wrap gap-2">
                            {holiday.cancelledHours.map((ch) => (
                              <Badge key={ch.subjectId} variant="secondary" className="text-xs">
                                {getSubjectName(ch.subjectId)}: {ch.hours} hrs
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
