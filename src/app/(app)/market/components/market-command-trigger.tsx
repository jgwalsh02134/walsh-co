"use client";

import { useState, useEffect } from "react";
import { MarketCommand } from "../market-command";

export function MarketCommandTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    const handleOpenEvent = () => setOpen(true);

    document.addEventListener("keydown", handleKey);
    window.addEventListener("open-market-command", handleOpenEvent);

    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("open-market-command", handleOpenEvent);
    };
  }, []);

  return <MarketCommand open={open} onClose={() => setOpen(false)} />;
}
