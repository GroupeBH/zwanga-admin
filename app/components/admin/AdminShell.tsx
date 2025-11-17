"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

import { useAppSelector } from "@/lib/hooks";

import styles from "./AdminShell.module.css";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface Props {
  readonly children: ReactNode;
}

export const AdminShell = ({ children }: Props) => {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div
      className={clsx(styles.shell, {
        [styles.sidebarCollapsed]: !sidebarOpen,
      })}
    >
      <Sidebar />
      <div className={styles.workbench}>
        <Topbar />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};

