"use client";

import { GitBranch, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const canonicalFields = [
  { key: "FIRST_NAME", label: "First Name", required: true },
  { key: "LAST_NAME", label: "Last Name", required: true },
  { key: "EMAIL", label: "Email", required: true },
  { key: "PHONE", label: "Phone Number", required: false },
  { key: "AGE", label: "Age", required: false },
  { key: "LOCATION", label: "Location Type", required: true },
  { key: "CITY", label: "City", required: false },
  { key: "CHURCH", label: "Church", required: false },
  { key: "MISSIONARY", label: "Missionary", required: false },
  { key: "ETHNIC_GROUP", label: "Ethnic Group", required: false },
  { key: "PRAYER_DURATION", label: "Prayer Duration", required: false },
];

const filloutQuestions = [
  { id: "q1", name: "Cum te numești?" },
  { id: "q2", name: "Număr de telefon" },
  { id: "q3", name: "Email" },
  { id: "q4", name: "Căți ani ai?" },
  { id: "q5", name: "Unde locuiești?" },
  { id: "q6", name: "În ce oraș din România locuiești?" },
  { id: "q7", name: "La ce biserică mergi?" },
  { id: "q8", name: "Pentru ce misionar vrei să te rogi?" },
  { id: "q9", name: "Pentru care popor neatins vrei să te rogi?" },
  { id: "q10", name: "Cât timp vrei să te rogi, săptămânal?" },
];

const mappings = {
  FIRST_NAME: "q1",
  PHONE: "q2",
  EMAIL: "q3",
  AGE: "q4",
  LOCATION: "q5",
  CITY: "q6",
  CHURCH: "q7",
  MISSIONARY: "q8",
  ETHNIC_GROUP: "q9",
  PRAYER_DURATION: "q10",
};

export default function MappingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Field Mappings</h2>
          <p className="text-sm text-muted-foreground">Map canonical fields to Fillout question IDs</p>
        </div>
        <Button variant="outline">Auto-detect Fields</Button>
      </div>

      <div className="bg-card border rounded-custom overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Canonical Key
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Mapped To
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Question Text
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {canonicalFields.map((field) => {
              const mapped = mappings[field.key as keyof typeof mappings];
              const question = filloutQuestions.find((q) => q.id === mapped);

              return (
                <tr key={field.key} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{field.key}</span>
                      {field.required && (
                        <Badge variant="secondary" className="text-[9px]">Required</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {mapped ? (
                      <div className="flex items-center gap-1.5 text-green-700">
                        <Check className="w-3 h-3" />
                        <span className="text-xs font-medium">Mapped</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs font-medium">Unmapped</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select defaultValue={mapped || "unmapped"}>
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Select question..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unmapped">Unmapped</SelectItem>
                        {filloutQuestions.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.id}: {q.name.slice(0, 30)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {question?.name || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-custom p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900">Unmapped Questions</h4>
          <p className="text-sm text-amber-800 mt-1">
            There are 3 questions in the form that are not mapped to any canonical field.
            <button className="text-primary underline ml-1">Review unmapped questions</button>
          </p>
        </div>
      </div>
    </div>
  );
}
