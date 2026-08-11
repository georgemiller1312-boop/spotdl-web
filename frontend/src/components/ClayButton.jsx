export default function ClayButton({
  children,
  onClick,
  disabled = false,
  variant = "surface", // "surface" | "pine"
  size = "md", // "md" | "sm"
  type = "button",
  className = "",
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-display font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const sizing = size === "sm" ? "px-4 py-2 text-sm rounded-clay-sm" : "px-6 py-3.5 text-base rounded-clay";

  const variants = {
    surface:
      "bg-clay-surface text-clay-ink shadow-clay-raised-sm hover:shadow-clay-raised active:shadow-clay-pressed-sm",
    pine: "bg-pine text-clay-surface shadow-clay-pine hover:bg-pine-light active:shadow-clay-pine-pressed",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizing} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
