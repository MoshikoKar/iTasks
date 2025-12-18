import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateTeam, deleteTeam, getTeamMembers } from "@/app/actions/teams";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const team = await getTeamMembers(id, user.id);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error: any) {
    logger.error("Error fetching team", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const data = await req.json();
    const { id } = await params;

    const team = await updateTeam(id, data, user.id);
    return NextResponse.json(team);
  } catch (error: any) {
    logger.error("Error updating team", error);
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await deleteTeam(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error deleting team", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete team" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
