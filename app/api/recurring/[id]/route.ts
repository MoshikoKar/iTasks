import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority } from "@prisma/client";
import parser from "cron-parser";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await db.recurringTaskConfig.findUnique({
      where: { id },
      include: {
        templateAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching recurring task config:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const config = await db.recurringTaskConfig.update({
      where: { id },
      data: {
        name: body.name,
        cron: body.cron,
        templateTitle: body.templateTitle,
        templateDescription: body.templateDescription || null,
        templatePriority: body.templatePriority as TaskPriority,
        templateAssigneeId: body.templateAssigneeId,
        templateBranch: body.templateBranch || null,
        templateServerName: body.templateServerName || null,
        templateApplication: body.templateApplication || null,
        templateIpAddress: body.templateIpAddress || null,
        nextGenerationAt: computeNextGeneration(body.cron),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating recurring task config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.recurringTaskConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recurring task config:", error);
    return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
  }
}

function computeNextGeneration(cron: string): Date {
  try {
    const interval = parser.parse(cron, {
      tz: 'UTC',
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch (error) {
    console.error(`Invalid cron expression "${cron}", falling back to 24h offset:`, error);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
