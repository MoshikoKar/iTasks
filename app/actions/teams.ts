import { db } from "@/lib/db";
import { Role } from "@prisma/client";

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

  const team = await db.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      description: data.description,
    },
  });

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
