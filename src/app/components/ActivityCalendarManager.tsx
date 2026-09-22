import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { UploadCloud, Sparkles, Key, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

export function ActivityCalendarManager({ startDate, endDate, onAddHolidays }: ActivityCalendarManagerProps) {
  const [apiKey, setApiKey] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedHolidays, setDetectedHolidays] = useState<DetectedHoliday[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

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
    if (!apiKey) {
      toast.error("Please enter your Gemini API Key.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please configure your Semester Start and End dates first.");
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading("Extracting text from PDF...");

    try {
      // 1. Extract Text
      const rawText = await extractTextFromPDF(selectedFile);
      
      toast.loading("Analyzing dates with Gemini AI...", { id: toastId });

      // 2. Setup Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 3. Prompt for JSON extraction
      const prompt = `
You are an expert data extraction assistant. I am providing you with the raw text extracted from a college/school academic Activity Calendar.
Your task is to identify ALL holidays, non-working days, and major events mentioned in the text.

CRITICAL INSTRUCTIONS:
1. Only consider dates that fall strictly between the semester start date: ${startDate} and the semester end date: ${endDate}.
2. Ignore any generic working days unless they are special events. Focus on "Holidays", "Festivals", "Public Holidays", "Breaks".
3. Return the result strictly as a JSON array of objects. Do not include markdown formatting like \`\`\`json. Just the raw array.

Each object must have exactly this schema:
{
  "name": "Name of the holiday or event (e.g., Pongal, Diwali, Mid-term Break)",
  "date": "YYYY-MM-DD",
  "status": "holiday"
}

If no holidays are found in the date range, return [].

Raw Text:
${rawText.substring(0, 30000)} // Limiting to avoid token explosion, assuming calendar is relatively short.
      `;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      // Clean up markdown if Gemini returned it
      responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(responseText);
      
      if (!Array.isArray(parsedData)) {
        throw new Error("Invalid response format from AI.");
      }

      const holidaysWithMeta: DetectedHoliday[] = parsedData.map((h: any, index: number) => ({
        id: `auto_${Date.now()}_${index}`,
        name: h.name || "Unknown Holiday",
        date: h.date,
        status: h.status === "working_day" ? "working_day" : "holiday",
        confirmed: true, // Default to confirmed for easy bulk add
      }));

      setDetectedHolidays(holidaysWithMeta.filter(h => h.status === "holiday"));
      
      toast.success(`Analysis complete! Found ${holidaysWithMeta.length} holidays.`, { id: toastId });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to analyze calendar.", { id: toastId });
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
          <Sparkles className="h-5 w-5 text-indigo-500" />
          AI Activity Calendar Analysis
        </CardTitle>
        <CardDescription>
          Upload your college activity calendar (PDF). We'll automatically extract all holidays and sync them with your timetable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Settings / API Key */}
        <div className="bg-muted/50 p-4 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Gemini API Key</Label>
          </div>
          <Input 
            type="password" 
            placeholder="AIzaSy..." 
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            className="bg-background max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Your key is stored securely in your browser's local storage and is never sent anywhere except directly to Google's API.
          </p>
        </div>

        {/* Upload Section */}
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
            disabled={!selectedFile || !apiKey || isAnalyzing}
            className="w-full relative overflow-hidden"
            style={{ background: selectedFile ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "" }}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Analyzing Calendar...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Extract Holidays
              </span>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {detectedHolidays.length > 0 && (
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Detected Holidays ({detectedHolidays.length})
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
              className="w-full mt-4"
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
