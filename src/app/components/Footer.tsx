import { GraduationCap, User, Building2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-px w-12 bg-border"></div>
            <GraduationCap className="h-5 w-5" />
            <div className="h-px w-12 bg-border"></div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">Developed by</span>
              <span className="font-medium">SHANMUGAKARTHIK G</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>B. TECH - INFORMATION TECHNOLOGY</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>SAVEETHA ENGINEERING COLLEGE</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SK TECH. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
