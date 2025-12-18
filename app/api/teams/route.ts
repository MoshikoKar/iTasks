import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createTeam, getTeams } from "@/app/actions/teams";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const teams = await getTeams(user.id);
    return NextResponse.json(teams);
  } catch (error: any) {
    logger.error("Error fetching teams", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teams" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const data = await req.json();

    if (!data.name?.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const team = await createTeam(
      {
        name: data.name.trim(),
        description: data.description?.trim(),
      },
      user.id
    );

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    logger.error("Error creating team", error);
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
