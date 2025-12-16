import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();

    // Fetch all unique branch values (non-null)
    const tasks = await db.task.findMany({
      where: {
        branch: { not: null },
      },
      select: {
        branch: true,
      },
      distinct: ["branch"],
      orderBy: {
        branch: "asc",
      },
    });

    // Extract branch values and filter out nulls
    const branches = tasks
      .map((task) => task.branch)
      .filter((branch): branch is string => branch !== null);

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
