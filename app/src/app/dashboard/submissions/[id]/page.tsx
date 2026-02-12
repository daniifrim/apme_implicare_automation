import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          template: true,
          version: true,
        },
        orderBy: { createdAt: "desc" },
      },
      answers: {
        include: { question: true },
      },
    },
  });

  if (!submission) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {submission.firstName ?? "Unknown"} {submission.lastName ?? ""}
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {submission.submissionId}
            </Badge>
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wider"
            >
              {submission.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {submission.email ?? "No email"} •{" "}
            {new Date(submission.submissionTime).toLocaleString()}
          </div>
        </div>

        <Link
          href="/dashboard/submissions"
          className="text-sm text-primary hover:underline whitespace-nowrap"
        >
          Back to submissions
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card border rounded-custom p-4 lg:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Assigned Templates
          </div>

          {submission.assignments.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">
              No assignments recorded.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {submission.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-custom hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.version ? `v${a.version.versionNumber}: ${a.version.name}` : "No version"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {a.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Profile
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium capitalize">
                {submission.locationType ?? "unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium">{submission.city ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Country</span>
              <span className="font-medium">{submission.country ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Church</span>
              <span className="font-medium">{submission.church ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{submission.phone ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-custom overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Answers
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {submission.answers.map((a) => (
                <tr key={a.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm">{a.question.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {a.value ?? "—"}
                  </td>
                </tr>
              ))}
              {submission.answers.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={2}>
                    No answers stored.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
