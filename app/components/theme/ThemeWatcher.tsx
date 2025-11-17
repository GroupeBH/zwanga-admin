"use client";

import { useEffect } from "react";

import { useAppSelector } from "@/lib/hooks";

export const ThemeWatcher = () => {
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  return null;
};

