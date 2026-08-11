import { useState } from "react";
import { Network, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { testNetworkDestination } from "../api.js";

const EMPTY = { ip: "", share: "", subfolder: "", username: "", password: "" };

export default function NetworkDestinationForm({ enabled, onToggle, config, onChange }) {
  const [testState, setTestState] = useState({ status: "idle", message: "" });

  function update(field, value) {
    onChange({ ...config, [field]: value });
    setTestState({ status: "idle", message: "" });
  }

  async function handleTest() {
    setTestState({ status: "testing", message: "" });
    try {
      const result = await testNetworkDestination(config);
      setTestState({ status: "ok", message: `Reachable at ${result.label}` });
    } catch (err) {
      setTestState({ status: "error", message: err.message || "Couldn't reach that share." });
    }
  }

  const canTest = config.ip.trim() && config.share.trim();

  return (
    <div className="flex flex-col gap-3 rounded-clay bg-clay-surface p-4 shadow-clay-raised">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-clay-soft">
          <Network className="h-3.5 w-3.5" aria-hidden="true" />
          Save to a network location by IP instead
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-150 ${
            enabled ? "bg-pine shadow-clay-pine-pressed" : "bg-clay-bg shadow-clay-pressed-sm"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-clay-surface shadow-clay-raised-sm transition-all duration-150 ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </label>

      {enabled && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP address" placeholder="192.168.1.50" value={config.ip} onChange={(v) => update("ip", v)} />
            <Field label="Share name" placeholder="Music" value={config.share} onChange={(v) => update("share", v)} />
          </div>
          <Field
            label="Subfolder (optional)"
            placeholder="Playlists"
            value={config.subfolder}
            onChange={(v) => update("subfolder", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Username (optional)"
              value={config.username}
              onChange={(v) => update("username", v)}
            />
            <Field
              label="Password (optional)"
              type="password"
              value={config.password}
              onChange={(v) => update("password", v)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!canTest || testState.status === "testing"}
              className="inline-flex items-center gap-2 rounded-clay-sm bg-clay-bg px-4 py-2 text-sm font-display font-semibold text-clay-ink shadow-clay-raised-sm transition-all duration-150 hover:shadow-clay-raised active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testState.status === "testing" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Network className="h-4 w-4" aria-hidden="true" />
              )}
              Test connection
            </button>

            {testState.status === "ok" && (
              <span className="flex items-center gap-1 text-sm text-pine">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {testState.message}
              </span>
            )}
            {testState.status === "error" && (
              <span className="flex items-center gap-1 text-sm text-coral">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {testState.message}
              </span>
            )}
          </div>

          <p className="text-xs text-clay-soft">
            Credentials are used for this download only — nothing here gets saved.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-clay-soft">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-clay-sm bg-clay-bg px-3 py-2 text-sm text-clay-ink shadow-clay-pressed-sm placeholder:text-clay-soft/60 focus:outline-none"
      />
    </label>
  );
}

export const EMPTY_NETWORK_CONFIG = EMPTY;
