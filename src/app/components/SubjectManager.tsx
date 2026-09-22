import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";

export interface Subject {
  id: string;
  name: string;
  classesPerWeek: number; // derived from timetable; kept for compatibility
  attended: number;
  missed: number;
}

interface SubjectManagerProps {
  subjects: Subject[];
  computedHours: Record<string, number>; // subjectId -> hours/week from timetable
  onAddSubject: (subject: Omit<Subject, 'id' | 'attended' | 'missed'>) => void;
  onRemoveSubject: (id: string) => void;
}

export function SubjectManager({ subjects, computedHours, onAddSubject, onRemoveSubject }: SubjectManagerProps) {
  const [subjectName, setSubjectName] = useState("");

  const handleAddSubject = () => {
    if (subjectName.trim()) {
      onAddSubject({ name: subjectName.trim(), classesPerWeek: 0 });
      setSubjectName("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddSubject();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects</CardTitle>
        <p className="text-muted-foreground text-sm">
          Add subjects here, then assign them to time slots in the timetable below.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="subject-name">Subject Name</Label>
              <Input
                id="subject-name"
                placeholder="e.g., Mathematics"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-input-background"
              />
            </div>
            <Button onClick={handleAddSubject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>

          {subjects.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Added Subjects</Label>
              <div className="space-y-2">
                {subjects.map((subject) => {
                  const hrs = computedHours[subject.id] ?? 0;
                  return (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span>{subject.name}</span>
                        <Badge variant="secondary">
                          {hrs > 0 ? `${hrs} hrs/week` : "Not scheduled"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSubject(subject.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
