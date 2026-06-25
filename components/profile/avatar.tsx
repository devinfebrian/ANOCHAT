import { getAvatarColor, getInitials } from "@/lib/profile/avatar";

type AvatarProps = {
  username: string;
  size?: number;
  className?: string;
};

export function Avatar({ username, size = 32, className }: AvatarProps) {
  const bg = getAvatarColor(username);
  const initials = getInitials(username);
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex items-center justify-center rounded-full font-semibold text-zinc-900 select-none",
        className ?? "",
      ].join(" ")}
      style={{ backgroundColor: bg, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
