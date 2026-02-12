"use client";

import { FileText, Plus, MoreHorizontal, Eye, Edit, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const templates = [
  {
    id: "1",
    name: "Rugaciune Misionar",
    description: "Email de informare pentru rugaciune misionar",
    status: "published",
    version: "v2.4",
    lastEdited: "2 hours ago",
    usageCount: 156,
  },
  {
    id: "2",
    name: "Rugaciune Grup Etnic",
    description: "Email pentru rugaciune grup etnic neatins",
    status: "published",
    version: "v1.8",
    lastEdited: "1 day ago",
    usageCount: 89,
  },
  {
    id: "3",
    name: "Info Voluntariat",
    description: "Informatii despre oportunitati de voluntariat",
    status: "draft",
    version: "v0.3",
    lastEdited: "3 days ago",
    usageCount: 0,
  },
  {
    id: "4",
    name: "Info Cursuri",
    description: "Informatii despre cursurile Kairos si Mobilizeaza",
    status: "published",
    version: "v3.1",
    lastEdited: "1 week ago",
    usageCount: 234,
  },
  {
    id: "5",
    name: "Welcome Email",
    description: "Email de bun venit pentru noi inscrieri",
    status: "published",
    version: "v1.2",
    lastEdited: "2 weeks ago",
    usageCount: 512,
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Email Templates</h2>
          <p className="text-sm text-muted-foreground">Manage email templates and versions</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-card border rounded-custom p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{template.name}</h3>
                <Badge
                  variant={template.status === "published" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {template.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{template.description}</p>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <div className="text-center">
                <div className="font-mono text-xs text-primary font-bold">{template.version}</div>
                <div className="text-[10px] text-muted-foreground">Version</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xs font-bold">{template.usageCount}</div>
                <div className="text-[10px] text-muted-foreground">Uses</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{template.lastEdited}</div>
                <div className="text-[10px] text-muted-foreground">Last edited</div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" /> Preview
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
