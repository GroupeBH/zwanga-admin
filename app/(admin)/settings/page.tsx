"use client";

import { useEffect, useState } from "react";

import { useGetAdminProfileQuery } from "@/lib/features/profile/profileApi";

import shared from "../styles/page.module.css";

type NotificationPref = {
  email: boolean;
  sms: boolean;
  push: boolean;
};

export default function SettingsPage() {
  const { data: profile } = useGetAdminProfileQuery();
  const [notifications, setNotifications] = useState<NotificationPref>({
    email: false,
    sms: false,
    push: true,
  });

  useEffect(() => {
    if (profile) {
      setNotifications(profile.notifications);
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
              <div>{profile.name}</div>
              <div>{profile.email}</div>
              <small style={{ color: "var(--color-text-muted)" }}>
                {profile.role} • {profile.phone}
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
          </div>
        ) : null}
      </section>
    </div>
  );
}

