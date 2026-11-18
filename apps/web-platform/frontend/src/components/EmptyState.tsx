"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import Button from "./shadcn/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  action?: ReactNode;
  variant?: "default" | "error";
}

export default function EmptyState({
  icon = <Inbox className="h-8 w-8 text-slate-400" />,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  action,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${variant}`}>
      <div className="empty-state-icon flex items-center justify-center mb-2">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {(action || actionLabel) && (
        <div className="empty-state-action">
          {action ?? (
            actionHref ? (
              <Link href={actionHref} className="primary-button">
                {actionLabel}
              </Link>
            ) : (
              <Button type="button" onClick={actionOnClick} variant="default">
                {actionLabel}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
