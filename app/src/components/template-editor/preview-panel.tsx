// ABOUTME: Compact preview panel with integrated toolbar, tighter spacing, and focused layout
// ABOUTME: Device controls, submission selector, and subject line combined in minimal header
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  User,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  X,
  Check,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

interface PreviewPanelProps {
  html: string;
  text: string;
  subject: string;
  warnings: string[];
  selectedSubmission: Submission | null;
  submissions: Submission[];
  onSubmissionChange: (submissionId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function PreviewPanel({
  html,
  text,
  subject,
  warnings,
  selectedSubmission,
  submissions,
  onSubmissionChange,
  onRefresh,
  isLoading,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState("rendered");
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [showWarnings, setShowWarnings] = useState(true);

  const hasContent = html || text;

  return (
    <div className="h-full flex flex-col">
      {/* Compact Toolbar Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        {/* Device Toggles - Icon Only */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setDevice("desktop")}
            title="Desktop"
            className={cn(
              "p-1.5 rounded transition-colors",
              device === "desktop"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice("tablet")}
            title="Tablet"
            className={cn(
              "p-1.5 rounded transition-colors",
              device === "tablet"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            title="Mobile"
            className={cn(
              "p-1.5 rounded transition-colors",
              device === "mobile"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Submission Selector - Compact */}
        <Select
          value={selectedSubmission?.id || ""}
          onValueChange={onSubmissionChange}
        >
          <SelectTrigger className="h-7 text-xs w-[160px] border-0 bg-muted focus:ring-0 focus:ring-offset-0">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Preview as...">
                {selectedSubmission ? (
                  <span className="truncate">
                    {selectedSubmission.firstName} {selectedSubmission.lastName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Preview as...</span>
                )}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {submissions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {sub.firstName} {sub.lastName}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh Button - Compact */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Preview"
        >
          <RotateCcw
            className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
          />
        </Button>
      </div>

      {/* Subject Bar - Integrated */}
      {subject && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b shrink-0">
          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            Subject:
          </span>
          <span className="text-xs font-medium truncate">{subject}</span>
        </div>
      )}

      {/* Compact Warnings Banner */}
      {warnings.length > 0 && showWarnings && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-amber-900">
              {warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {warnings.slice(0, 2).map((warning, index) => (
                <li key={index} className="text-[10px] text-amber-800 truncate">
                  {warning}
                </li>
              ))}
              {warnings.length > 2 && (
                <li className="text-[10px] text-amber-700">
                  +{warnings.length - 2} more
                </li>
              )}
            </ul>
          </div>
          <button
            onClick={() => setShowWarnings(false)}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Preview Tabs - Compact */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background shrink-0">
          <TabsList className="h-6 bg-muted p-0.5">
            <TabsTrigger
              value="rendered"
              className="text-[10px] px-2 py-0.5 h-5 gap-1"
            >
              <Eye className="w-3 h-3" />
              Email
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-[10px] px-2 py-0.5 h-5">
              HTML
            </TabsTrigger>
            <TabsTrigger value="text" className="text-[10px] px-2 py-0.5 h-5">
              Text
            </TabsTrigger>
          </TabsList>

          {/* Selected Person Badge */}
          {selectedSubmission && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
              <Check className="w-3 h-3" />
              <span className="truncate max-w-[120px]">
                {selectedSubmission.firstName} {selectedSubmission.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-muted/20">
          <TabsContent value="rendered" className="h-full m-0 p-3">
            {!hasContent ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Mail className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No content to preview
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center min-h-full">
                <div
                  className={cn(
                    "bg-white shadow-sm transition-all duration-200",
                    device === "mobile" && "rounded-lg border shadow-lg",
                    device === "tablet" && "rounded-lg border",
                    device === "desktop" && "border rounded-lg w-full",
                  )}
                  style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%" }}
                >
                  {/* Device Frame Header */}
                  {device !== "desktop" && (
                    <div className="h-5 bg-gray-100 rounded-t-lg border-b flex items-center justify-center">
                      <div className="w-12 h-0.5 bg-gray-300 rounded-full" />
                    </div>
                  )}

                  {/* Email Content */}
                  <div
                    className={cn(
                      "prose prose-sm max-w-none",
                      device === "mobile" && "p-3 text-[13px] leading-6",
                      device === "tablet" && "p-4 text-[14px] leading-6",
                      device === "desktop" && "p-5 text-[14px] leading-7",
                    )}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          html ||
                          '<p style="color: #6b7280; font-style: italic;">No HTML content</p>',
                      }}
                    />
                  </div>

                  {/* Device Frame Footer */}
                  {device === "mobile" && (
                    <div className="h-5 bg-gray-100 rounded-b-lg border-t flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-gray-300 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="h-full m-0 p-3">
            <pre className="h-full border rounded-lg p-3 bg-muted font-mono text-[10px] leading-relaxed overflow-auto whitespace-pre-wrap">
              {html || "// No HTML content"}
            </pre>
          </TabsContent>

          <TabsContent value="text" className="h-full m-0 p-3">
            <pre className="h-full border rounded-lg p-3 bg-muted font-mono text-xs leading-relaxed overflow-auto whitespace-pre-wrap">
              {text || "// No text content"}
            </pre>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
