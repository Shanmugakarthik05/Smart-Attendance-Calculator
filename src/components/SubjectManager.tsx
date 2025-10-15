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
  classesPerWeek: number; // Actually hours per week
  attended: number;
  missed: number;
}

interface SubjectManagerProps {
  subjects: Subject[];
  onAddSubject: (subject: Omit<Subject, 'id' | 'attended' | 'missed'>) => void;
  onRemoveSubject: (id: string) => void;
}

export function SubjectManager({ subjects, onAddSubject, onRemoveSubject }: SubjectManagerProps) {
  const [subjectName, setSubjectName] = useState("");
  const [classesPerWeek, setClassesPerWeek] = useState(3);

  const handleAddSubject = () => {
    if (subjectName.trim() && classesPerWeek > 0) {
      onAddSubject({
        name: subjectName.trim(),
        classesPerWeek,
      });
      setSubjectName("");
      setClassesPerWeek(3);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubject();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects & Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
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
            
            <div className="space-y-2">
              <Label htmlFor="classes-per-week">Hours/Week</Label>
              <Input
                id="classes-per-week"
                type="number"
                min="1"
                max="50"
                value={classesPerWeek}
                onChange={(e) => setClassesPerWeek(Number(e.target.value))}
                onKeyPress={handleKeyPress}
                className="bg-input-background w-32"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="opacity-0">Add</Label>
              <Button onClick={handleAddSubject} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="space-y-2 mt-6">
              <Label>Added Subjects</Label>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span>{subject.name}</span>
                      <Badge variant="secondary">
                        {subject.classesPerWeek} hours/week
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
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
