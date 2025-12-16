import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority } from "@prisma/client";
import parser from "cron-parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const config = await db.recurringTaskConfig.create({
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

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating recurring task config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recurring task config" },
      { status: 500 }
    );
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
