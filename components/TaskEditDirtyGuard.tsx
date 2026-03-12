"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
};

export function TaskEditDirtyGuard({ enabled }: Props) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsDirty(false);
      return;
    }

    const form = document.getElementById("task-edit-form") as HTMLFormElement | null;
    if (!form) {
      return;
    }

    const getSnapshot = () => {
      const snapshot: Record<string, string> = {};
      const elements = Array.from(form.elements) as Array<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >;
      for (const el of elements) {
        if (!el.name) continue;
        if (el.type === "checkbox" || el.type === "radio") {
          const input = el as HTMLInputElement;
          snapshot[input.name] = input.checked ? "1" : "0";
        } else {
          snapshot[el.name] = el.value ?? "";
        }
      }
      return snapshot;
    };

    const initialSnapshot = getSnapshot();

    const recomputeDirty = () => {
      const current = getSnapshot();
      const keys = new Set([...Object.keys(initialSnapshot), ...Object.keys(current)]);
      for (const key of keys) {
        if ((initialSnapshot[key] ?? "") !== (current[key] ?? "")) {
          setIsDirty(true);
          return;
        }
      }
      setIsDirty(false);
    };

    const handleInput = () => {
      recomputeDirty();
    };

    const handleSubmit = () => {
      setIsDirty(false);
    };

    form.addEventListener("input", handleInput);
    form.addEventListener("change", handleInput);
    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("input", handleInput);
      form.removeEventListener("change", handleInput);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, isDirty]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const url = new URL(href, window.location.href);

      if (url.href === window.location.href) {
        return;
      }

      const shouldLeave = window.confirm(
        "You have unsaved changes to this task. If you leave this page, your changes will be lost. Do you want to continue without saving?"
      );

      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [enabled, isDirty]);

  return null;
}

