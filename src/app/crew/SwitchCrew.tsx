"use client";

export function SwitchCrew() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/crew/logout", { method: "POST" });
        window.location.assign("/crew");
      }}
      className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
    >
      Not you? Switch
    </button>
  );
}
