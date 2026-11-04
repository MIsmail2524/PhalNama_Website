"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useToast } from "@/components/ui/Toast";

const MESSAGES: Record<string, [string, "success" | "error" | "info"]> = {
  saved: ["Saved.", "success"],
  deleted: ["Deleted.", "success"],
  "error:in-use": ["This item is in use and cannot be deleted. Deactivate it instead.", "error"],
  "error:already-sent": ["This campaign has already been sent.", "error"],
};

function Inner() {
  const sp = useSearchParams();
  const toast = useToast();
  useEffect(() => {
    if (sp.get("saved")) toast(...MESSAGES.saved);
    if (sp.get("deleted")) toast(...MESSAGES.deleted);
    const err = sp.get("error");
    if (err && MESSAGES[`error:${err}`]) toast(...MESSAGES[`error:${err}`]);
    if (sp.get("sent")) toast(`Campaign sent to ${sp.get("sent")} recipients (see Notifications log for delivery status).`, "success");
    if (sp.get("processed")) toast(`${sp.get("processed")} referral reward(s) paid.`, "success");
    if (sp.get("denied")) toast("Your role does not have access to that section.", "error");
  }, [sp, toast]);
  return null;
}

export function ToastFromQuery() {
  return <Suspense><Inner /></Suspense>;
}
