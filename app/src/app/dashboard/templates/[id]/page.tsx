import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function TemplateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
      _count: { select: { assignments: true } },
    },
  });

  if (!template) notFound();

  const published = template.versions.find((v) => v.isPublished) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate">{template.name}</h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {template.slug}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {template.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {template.description ?? "No description"} • {template._count.assignments} assignments
          </div>
        </div>

        <Link
          href="/dashboard/templates"
          className="text-sm text-primary hover:underline whitespace-nowrap"
        >
          Back to templates
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card border rounded-custom p-4 lg:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Versions
          </div>
          <div className="mt-3 divide-y border rounded-custom overflow-hidden">
            {template.versions.map((v) => (
              <div
                key={v.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      v{v.versionNumber}
                    </span>
                    <span className="font-semibold truncate">{v.name}</span>
                    {v.isPublished && (
                      <Badge variant="outline" className="text-[9px] uppercase">
                        Published
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Subject: {v.subject}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {new Date(v.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {template.versions.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No versions yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-custom p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Published
          </div>
          <div className="mt-3">
            {published ? (
              <div className="space-y-1">
                <div className="font-semibold">
                  v{published.versionNumber}: {published.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Published at{" "}
                  {published.publishedAt
                    ? new Date(published.publishedAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No published version.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

