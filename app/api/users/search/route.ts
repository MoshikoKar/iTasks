import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    // Build base search query
    const baseWhere = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    };

    // Apply Admin visibility restrictions
    let whereClause = baseWhere;

    // Only Admins can see other Admins in search results
    if (currentUser.role !== "Admin") {
      whereClause = {
        AND: [
          baseWhere,
          {
            role: {
              not: "Admin"
            }
          }
        ]
      };
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error("User search error", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
