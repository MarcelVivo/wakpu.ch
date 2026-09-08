"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({ label, name, autoComplete, minLength }: { label: string; name: string; autoComplete?: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <label>
    {label}
    <div className="password-input-wrap">
      <input type={visible ? "text" : "password"} name={name} autoComplete={autoComplete} required minLength={minLength} maxLength={128} />
      <button type="button" className="icon-button password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  </label>;
}
