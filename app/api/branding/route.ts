import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    let config = await db.systemConfig.findUnique({
      where: { id: "system" },
      select: {
        orgLogo: true,
      },
    });

    // If config doesn't exist, return null (don't create it here - only admins should create it)
    if (!config) {
      return NextResponse.json({
        orgLogo: null,
      });
    }

    const orgLogo = config.orgLogo && config.orgLogo.trim() !== '' ? config.orgLogo : null;

    return NextResponse.json({
      orgLogo,
    });
  } catch (error) {
    logger.error("Error fetching branding config", error);
    return NextResponse.json(
      { orgLogo: null },
      { status: 500 }
    );
  }
}
