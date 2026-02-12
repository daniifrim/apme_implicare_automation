import { History, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const auditEvents = [
  {
    id: "1",
    actor: { name: "Jane Doe", initials: "JD", email: "jane@apme.ro" },
    action: "updated",
    target: { type: "template", name: "WelcomeTemplate" },
    timestamp: "2025-05-28T12:30:00",
    details: "Changed subject line and added preheader",
  },
  {
    id: "2",
    actor: { name: "Peter Smith", initials: "PS", email: "peter@apme.ro" },
    action: "changed mapping",
    target: { type: "field", name: "{{Location}}" },
    timestamp: "2025-05-27T15:10:00",
    details: "Mapped to question ID q5",
  },
  {
    id: "3",
    actor: { name: "Jane Doe", initials: "JD", email: "jane@apme.ro" },
    action: "published",
    target: { type: "template", name: "Rugaciune Misionar" },
    timestamp: "2025-05-27T10:22:00",
    details: "Published version v2.4",
  },
  {
    id: "4",
    actor: { name: "Admin System", initials: "AS", email: "system@apme.ro" },
    action: "backfilled",
    target: { type: "submissions", name: "245 records" },
    timestamp: "2025-05-26T08:00:00",
    details: "Imported from CSV export",
  },
  {
    id: "5",
    actor: { name: "Peter Smith", initials: "PS", email: "peter@apme.ro" },
    action: "created",
    target: { type: "template", name: "Info Cursuri" },
    timestamp: "2025-05-25T14:30:00",
    details: "Initial version v0.1",
  },
];

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Track all changes to templates, mappings, and settings</p>
        </div>
        <Badge variant="outline">Last 30 days</Badge>
      </div>

      <div className="bg-card border rounded-custom overflow-hidden">
        <div className="divide-y">
          {auditEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 flex gap-4 hover:bg-accent/30 transition-colors"
            >
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className="bg-muted text-xs font-bold">
                  {event.actor.initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="text-sm mb-1">
                  <span className="font-bold">{event.actor.name}</span>{" "}
                  <span className="text-muted-foreground">{event.action}</span>{" "}
                  <span className="font-mono text-primary">{event.target.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{event.details}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>
                    {new Date(event.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>•</span>
                  <button className="text-primary hover:underline">View Diff</button>
                </div>
              </div>

              <Badge variant="outline" className="text-[9px] flex-shrink-0">
                {event.target.type}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
