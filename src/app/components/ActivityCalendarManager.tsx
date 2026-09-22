import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { UploadCloud, Sparkles, CheckCircle2, XCircle, FileText, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface DetectedHoliday {
  id: string;
  name: string;
  date: string;
  status: "holiday" | "working_day";
  confirmed: boolean;
}

export interface ActivityCalendarManagerProps {
  startDate: string;
  endDate: string;
  onAddHolidays: (holidays: { name: string; startDate: string; endDate: string }[]) => void;
}

function analyzeTextWithLeoAI(text: string, startDateStr: string, endDateStr: string): any[] {
  const lines = text.split('\n');
  const results = [];
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();

  // Regex for DD-MM-YYYY or DD/MM/YYYY
  const dateRegex1 = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/g;
  // Regex for Month DD, YYYY
  const dateRegex2 = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi;

  const holidayKeywords = ['holiday', 'festival', 'break', 'leave', 'pongal', 'diwali', 'christmas', 'ramzan', 'bakrid', 'republic', 'independence', 'gandhi', 'jayanti', 'pooja', 'ugadi', 'onam', 'dusseh', 'closed', 'vacation'];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if line looks like a holiday
    const isHoliday = holidayKeywords.some(kw => lowerLine.includes(kw));
    if (!isHoliday) continue;

    let match;
    let foundDate = null;
    let yearToUse = new Date(startDateStr).getFullYear();

    // Check regex 1 (assume DD-MM-YYYY for Indian context mostly)
    dateRegex1.lastIndex = 0;
    while ((match = dateRegex1.exec(line)) !== null) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;
      foundDate = new Date(year, month - 1, day);
      break;
    }

    // Check regex 2 (Month DD)
    if (!foundDate) {
      dateRegex2.lastIndex = 0;
      while ((match = dateRegex2.exec(line)) !== null) {
        const monthStr = match[1];
        const day = parseInt(match[2]);
        let year = match[3] ? parseInt(match[3]) : yearToUse;
        const month = new Date(Date.parse(monthStr +" 1, 2012")).getMonth();
        foundDate = new Date(year, month, day);
        break;
      }
    }

    if (foundDate && !isNaN(foundDate.getTime())) {
      const time = foundDate.getTime();
      if (time >= start && time <= end) {
        // Extract a clean name (remove dates from line)
        let name = line.replace(dateRegex1, '').replace(dateRegex2, '').replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Ensure name isn't too short or too long
        if (name.length < 3) {
          const kw = holidayKeywords.find(k => lowerLine.includes(k));
          name = kw ? kw.charAt(0).toUpperCase() + kw.slice(1) : "Detected Holiday";
        }
        if (name.length > 40) name = name.substring(0, 40) + "...";

        // Title case the name
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        results.push({
          name: name,
          date: foundDate.toISOString().split('T')[0],
          status: 'holiday'
        });
      }
    }
  }

  // Remove duplicates based on date
  const unique = [];
  const seenDates = new Set();
  for (const r of results) {
    if (!seenDates.has(r.date)) {
      seenDates.add(r.date);
      unique.push(r);
    }
  }

  return unique;
}

export function ActivityCalendarManager({ startDate, endDate, onAddHolidays }: ActivityCalendarManagerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedHolidays, setDetectedHolidays] = useState<DetectedHoliday[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setDetectedHolidays([]); // Reset previous detections
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      return fullText;
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      throw new Error("Failed to read PDF file.");
    }
  };

  const analyzeCalendar = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file first.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please configure your Semester Start and End dates first.");
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading("Leo AI is analyzing your calendar...");

    try {
      // 1. Extract Text
      const rawText = await extractTextFromPDF(selectedFile);
      
      // 2. Parse using Leo AI
      const parsedData = analyzeTextWithLeoAI(rawText, startDate, endDate);
      
      const holidaysWithMeta: DetectedHoliday[] = parsedData.map((h: any, index: number) => ({
        id: `auto_${Date.now()}_${index}`,
        name: h.name,
        date: h.date,
        status: h.status,
        confirmed: true, // Default to confirmed for easy bulk add
      }));

      setDetectedHolidays(holidaysWithMeta);
      
      if (holidaysWithMeta.length > 0) {
        toast.success(`Leo AI found ${holidaysWithMeta.length} holidays!`, { id: toastId });
      } else {
        toast.info("Leo AI couldn't find any holidays in this date range.", { id: toastId });
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Leo AI failed to analyze calendar.", { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleConfirm = (id: string) => {
    setDetectedHolidays(prev => prev.map(h => h.id === id ? { ...h, confirmed: !h.confirmed } : h));
  };

  const removeDetection = (id: string) => {
    setDetectedHolidays(prev => prev.filter(h => h.id !== id));
  };

  const confirmAndAddHolidays = () => {
    const confirmed = detectedHolidays.filter(h => h.confirmed);
    if (confirmed.length === 0) return;

    // Convert to standard holiday format
    const formattedHolidays = confirmed.map(h => ({
      name: h.name,
      startDate: h.date,
      endDate: h.date, // Assuming single day for now
    }));

    onAddHolidays(formattedHolidays);
    toast.success(`Added ${confirmed.length} holidays to your planner!`);
    setDetectedHolidays([]);
    setSelectedFile(null);
  };

  return (
    <Card className="border-indigo-500/20 shadow-indigo-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-indigo-500" />
          Leo AI - Calendar Analysis
        </CardTitle>
        <CardDescription>
          Upload your college activity calendar (PDF). Leo AI will run locally in your browser to instantly extract all holidays without needing an API key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Upload Section - Moved to Top */}
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${selectedFile ? 'border-indigo-500 bg-indigo-500/5' : 'border-border hover:border-indigo-500/50 hover:bg-muted/50'}`}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-indigo-500/10 rounded-full">
                  <FileText className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="font-medium text-indigo-600 dark:text-indigo-400">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Click to upload your Calendar</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports PDF format</p>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={analyzeCalendar}
            disabled={!selectedFile || isAnalyzing}
            className="w-full relative overflow-hidden h-12 text-md"
            style={{ background: selectedFile ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "" }}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Leo AI is reading your PDF...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Analyze with Leo AI
              </span>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {detectedHolidays.length > 0 && (
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Leo AI Found {detectedHolidays.length} Holidays
            </h3>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {detectedHolidays.map(holiday => (
                <div 
                  key={holiday.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    holiday.confirmed ? 'bg-background border-border' : 'bg-muted/50 border-dashed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleConfirm(holiday.id)}
                      className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        holiday.confirmed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-input hover:border-indigo-500'
                      }`}
                    >
                      {holiday.confirmed && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                    <div>
                      <p className="font-medium text-sm">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeDetection(holiday.id)}>
                    <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              onClick={confirmAndAddHolidays}
              className="w-full mt-4 h-11"
              variant="default"
            >
              Add {detectedHolidays.filter(h => h.confirmed).length} Selected to Planner
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
