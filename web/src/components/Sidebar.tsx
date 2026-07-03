import type { CSSProperties } from "react";
import type { Tab } from "../types";

const NAV_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 12px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  textAlign: "left",
  width: "100%",
  fontFamily: "inherit",
};

function navStyle(active: boolean): CSSProperties {
  return {
    ...NAV_BASE,
    background: active ? "#d2f0e9" : "transparent",
    color: active ? "#01998a" : "#4d6b64",
  };
}

function navIconStyle(active: boolean): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: 3,
    background: active ? "#01998a" : "#b8d7ce",
  };
}

const NAV_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "chat", label: "AI Chatbot" },
  { tab: "logs", label: "Task Execution Logs" },
  { tab: "files", label: "File Lifecycle Tracking" },
];

interface SidebarProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Sidebar({ tab, onTabChange }: SidebarProps) {
  return (
    <div
      style={{
        width: 248,
        minWidth: 248,
        background: "#ffffff",
        borderRight: "1px solid #e6f3ef",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "4px 8px 28px 8px",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "radial-gradient(circle at 30% 30%, #30ba9e, #01998a)",
            boxShadow: "0 4px 10px rgba(1,153,138,0.25)",
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#0f2e29",
          }}
        >
          OptiBot
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onTabChange(item.tab)}
              style={navStyle(active)}
            >
              <div style={navIconStyle(active)} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
