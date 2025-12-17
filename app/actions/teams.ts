import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  logTeamCreated,
  logTeamUpdated,
  logTeamDeleted,
} from "@/lib/logging/system-logger";

export async function createTeam(
  data: {
    name: string;
    description?: string;
  },
  actorId: string
) {
  // Get actor's role
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!actor || actor.role !== Role.Admin) {
    throw new Error("Unauthorized: Only Admins can create teams");
  }

  const team = await db.team.create({
    data: {
      name: data.name,
      description: data.description,
    },
  });

  // Log team creation
  await logTeamCreated(
    team.id,
    team.name,
    actorId,
    {
      description: team.description,
    }
  );

  return team;
}

export async function updateTeam(
  teamId: string,
  data: {
    name?: string;
    description?: string;
  },
  actorId: string
) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!actor || actor.role !== Role.Admin) {
    throw new Error("Unauthorized: Only Admins can update teams");
  }

  // Get existing team for change tracking
  const existingTeam = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!existingTeam) {
    throw new Error("Team not found");
  }

  const team = await db.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      description: data.description,
    },
  });

  // Track changes for logging
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (data.name !== undefined && existingTeam.name !== team.name) {
    changes.name = { old: existingTeam.name, new: team.name };
  }
  if (data.description !== undefined && existingTeam.description !== team.description) {
    changes.description = { old: existingTeam.description || "", new: team.description || "" };
  }

  // Log team update if there are changes
  if (Object.keys(changes).length > 0) {
    await logTeamUpdated(
      team.id,
      team.name,
      actorId,
      changes
    );
  }

  return team;
}

export async function deleteTeam(teamId: string, actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!actor || actor.role !== Role.Admin) {
    throw new Error("Unauthorized: Only Admins can delete teams");
  }

  // Check if team has members
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { members: true } } },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  if (team._count.members > 0) {
    throw new Error(
      `Cannot delete team with ${team._count.members} member(s). Please reassign members first.`
    );
  }

  // Log team deletion before deleting
  await logTeamDeleted(
    team.id,
    team.name,
    actorId,
    {
      description: team.description,
      memberCount: team._count.members,
    }
  );

  await db.team.delete({
    where: { id: teamId },
  });

  return { success: true };
}

export async function getTeams(actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true, teamId: true },
  });

  if (!actor) {
    throw new Error("User not found");
  }

  // Admins see all teams, TeamLeads see only their team, others see all teams (for reference)
  const teams = await db.team.findMany({
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return teams;
}

export async function getTeamMembers(teamId: string, actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { role: true, teamId: true },
  });

  if (!actor) {
    throw new Error("User not found");
  }

  // TeamLeads can only view their own team members
  if (actor.role === Role.TeamLead && actor.teamId !== teamId) {
    throw new Error("Unauthorized: TeamLeads can only view their own team");
  }

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return team;
}
