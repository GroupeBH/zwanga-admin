"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Shield, ShoppingBag } from "lucide-react";

import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";

import shared from "../styles/page.module.css";

type NotificationPref = {
  email: boolean;
  sms: boolean;
  push: boolean;
};

export default function SettingsPage() {
  const { data: profile } = useGetCurrentUserProfileQuery();
  const [notifications, setNotifications] = useState<NotificationPref>({
    email: false,
    sms: false,
    push: true,
  });

  useEffect(() => {
    // Mock notifications for now - backend doesn't provide this yet
    if (profile) {
      setNotifications({
        email: true,
        sms: false,
        push: true,
      });
    }
  }, [profile]);

  const handleToggle = (key: keyof NotificationPref) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Paramètres généraux</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Identité, notifications et intégrations API
            </p>
          </div>
        </div>

        {profile ? (
          <div className={shared.grid}>
            <article className={shared.card}>
              <strong>Identité admin</strong>
              <div>
                {profile.user.firstName} {profile.user.lastName}
              </div>
              <div>{profile.user.email ?? profile.user.phone}</div>
              <small style={{ color: "var(--color-text-muted)" }}>
                {profile.user.role} • {profile.user.phone}
              </small>
            </article>

            <article className={shared.card}>
              <strong>Notifications</strong>
              {Object.entries(notifications).map(([key, value]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle(key as keyof NotificationPref)}
                  />
                  {key.toUpperCase()}
                </label>
              ))}
            </article>

            <article className={shared.card}>
              <strong>Intégrations actives</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Orange Money - Webhook OK</li>
                <li>M-Pesa - Token valide</li>
                <li>Firebase Cloud Messaging</li>
              </ul>
            </article>

            <article className={shared.card}>
              <strong>Documents légaux</strong>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--color-border)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                >
                  <Shield size={16} />
                  <span>Politique de confidentialité</span>
                </Link>
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--color-border)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                >
                  <FileText size={16} />
                  <span>Termes et conditions</span>
                </Link>
                <Link
                  href="/sales-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--color-border)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>Politique de ventes et services</span>
                </Link>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </div>
  );
}

