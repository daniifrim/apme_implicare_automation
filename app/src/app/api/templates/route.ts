import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            isPublished: true,
            name: true,
            subject: true,
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    // Determine which templates have any published version (may not be the latest)
    const templateIds = templates.map((t) => t.id);
    const publishedVersions = await prisma.templateVersion.groupBy({
      by: ["templateId"],
      where: {
        templateId: { in: templateIds },
        isPublished: true,
      },
      _count: { id: true },
    });

    const publishedTemplateIds = new Set(
      publishedVersions.map((pv) => pv.templateId),
    );

    const templatesWithPublishedFlag = templates.map((template) => ({
      ...template,
      hasPublishedVersion: publishedTemplateIds.has(template.id),
    }));

    return NextResponse.json({ templates: templatesWithPublishedFlag });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, description, tags } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.template.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Template with this slug already exists" },
        { status: 409 },
      );
    }

    const template = await prisma.template.create({
      data: {
        slug,
        name,
        description,
        tags: tags || [],
        status: "draft",
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
