"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Tooltip } from "@/components/ui/tooltip";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "red" | "orange" | "purple";
  highlight?: boolean;
  href?: string;
  tooltip?: string;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  highlight,
  href,
  tooltip,
}: StatCardProps) {
  const colorClasses = {
    blue: "from-primary to-primary/80 text-primary bg-primary/10",
    red: "from-destructive to-destructive/80 text-destructive bg-destructive/10",
    orange: "from-warning to-warning/80 text-warning bg-warning/10",
    purple: "from-primary to-primary/80 text-primary bg-primary/10",
  };

  const cardContent = (
    <motion.div
      className={`group relative overflow-hidden card-base p-4 sm:p-6 ${href ? "cursor-pointer" : ""} ${
        highlight ? "border-destructive/50 card-shadow" : ""
      }`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
            {tooltip ? (
              <Tooltip content={tooltip} showIcon={false}>
                <span>{label}</span>
              </Tooltip>
            ) : (
              label
            )}
          </div>
          <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${highlight ? "text-destructive" : "text-foreground"} transition-all`}>
            {value}
          </div>
        </div>
        <div
          className={`rounded-lg ${
            colorClasses[color].split(" ")[4]
          } p-2 sm:p-3 transition-transform group-hover:scale-110 flex-shrink-0`}
        >
          <div className={`${colorClasses[color].split(" ")[0]} ${colorClasses[color].split(" ")[1]} ${colorClasses[color].split(" ")[2]} ${colorClasses[color].split(" ")[3]} [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6`}>{icon}</div>
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color].split(" ")[0]} ${
          colorClasses[color].split(" ")[1]
        }`}
      ></div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
