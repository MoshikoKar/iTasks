import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    let config = await db.systemConfig.findUnique({
      where: { id: "system" },
      select: {
        orgLogo: true,
        supportEmail: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
      },
    });

    // If config doesn't exist, return null (don't create it here - only admins should create it)
    if (!config) {
      return NextResponse.json({
        orgLogo: null,
        supportEmail: null,
        timezone: null,
        dateFormat: null,
        timeFormat: null,
      });
    }

    const orgLogo = config.orgLogo && config.orgLogo.trim() !== '' ? config.orgLogo : null;

    return NextResponse.json({
      orgLogo,
      supportEmail: config.supportEmail || null,
      timezone: config.timezone || null,
      dateFormat: config.dateFormat || null,
      timeFormat: config.timeFormat || null,
    });
  } catch (error) {
    logger.error("Error fetching branding config", error);
    return NextResponse.json(
      { 
        orgLogo: null,
        supportEmail: null,
        timezone: null,
        dateFormat: null,
        timeFormat: null,
      },
      { status: 500 }
    );
  }
}
