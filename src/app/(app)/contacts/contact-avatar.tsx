import {
  BrickWall,
  Briefcase,
  Building,
  CircleDollarSign,
  ClipboardCheck,
  Droplets,
  FileCheck,
  Gauge,
  Gavel,
  Hammer,
  HardHat,
  House,
  KeyRound,
  Landmark,
  type LucideIcon,
  Paintbrush,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Umbrella,
  User,
  UtilityPole,
  Wrench,
  Zap,
} from "lucide-react";
import {
  type AvatarIconKey,
  type AvatarMode,
  getAvatarIconKey,
  getAvatarLabel,
  getAvatarMode,
  getAvatarTone,
  getOfficialSeal,
  type ContactNameParts,
} from "@/lib/contact-format";

const ICON_COMPONENTS: Record<AvatarIconKey, LucideIcon> = {
  briefcase: Briefcase,
  user: User,
  hardhat: HardHat,
  scale: Scale,
  "clipboard-check": ClipboardCheck,
  "file-check": FileCheck,
  umbrella: Umbrella,
  "shield-check": ShieldCheck,
  landmark: Landmark,
  zap: Zap,
  "utility-pole": UtilityPole,
  gauge: Gauge,
  "circle-dollar": CircleDollarSign,
  house: House,
  "key-round": KeyRound,
  building: Building,
  truck: Truck,
  "search-check": SearchCheck,
  droplets: Droplets,
  wrench: Wrench,
  "brick-wall": BrickWall,
  hammer: Hammer,
  paintbrush: Paintbrush,
  sparkles: Sparkles,
  gavel: Gavel,
};

const SIZE_PRESETS = {
  sm: { box: "h-9 w-9", label: "text-xs", icon: "h-4 w-4", badgeIcon: "h-2.5 w-2.5", badgeBox: "h-4 w-4" },
  md: { box: "h-12 w-12", label: "text-sm", icon: "h-5 w-5", badgeIcon: "h-3 w-3", badgeBox: "h-5 w-5" },
  lg: { box: "h-14 w-14", label: "text-base", icon: "h-6 w-6", badgeIcon: "h-3 w-3", badgeBox: "h-5 w-5" },
  xl: { box: "h-16 w-16", label: "text-lg", icon: "h-7 w-7", badgeIcon: "h-3.5 w-3.5", badgeBox: "h-6 w-6" },
} as const;

export type AvatarSize = keyof typeof SIZE_PRESETS;

type ContactSource = ContactNameParts & {
  category?: string | null;
  relationshipType?: string | null;
  role?: string | null;
  notes?: string | null;
  avatarMode?: string | null;
  avatarColor?: string | null;
  avatarIcon?: string | null;
};

type ContactAvatarProps = {
  contact: ContactSource;
  size?: AvatarSize;
  /** Force a mode override (used by the form picker for live preview). */
  modeOverride?: AvatarMode;
  /** Show a subtle corner badge with the trade icon. Off by default. */
  showCategoryBadge?: boolean;
  className?: string;
};

export function ContactAvatar({
  contact,
  size = "md",
  modeOverride,
  showCategoryBadge = false,
  className,
}: ContactAvatarProps) {
  const tone = getAvatarTone(contact);
  const mode = modeOverride ?? getAvatarMode(contact);
  const preset = SIZE_PRESETS[size];
  const iconKey = getAvatarIconKey(contact);
  const IconComponent = ICON_COMPONENTS[iconKey];

  // Government / AHJ entities can override the generated avatar with a
  // real official seal. Conservative match — only fires when both name
  // text and taxonomy agree.
  const seal = getOfficialSeal(contact);

  // Corner badges are now off by default. They only render when the
  // caller explicitly opts in AND we're using initials (the icon would be
  // redundant when the avatar itself is an icon). Suppressed for seals.
  const showBadge = showCategoryBadge && mode === "INITIALS" && !seal;

  return (
    <span className={`relative inline-flex shrink-0 ${className ?? ""}`}>
      {seal ? (
        <span
          aria-hidden
          className={`flex items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] ${preset.box}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={seal.src}
            alt={seal.alt}
            className="h-full w-full object-contain p-0.5"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className={`flex items-center justify-center rounded-full font-semibold tracking-wide ${preset.box} ${preset.label}`}
          style={{ background: tone.bg, color: tone.fg }}
        >
          {mode === "ICON" ? (
            <IconComponent className={preset.icon} strokeWidth={2} />
          ) : (
            getAvatarLabel(contact)
          )}
        </span>
      )}

      {showBadge ? (
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] ${preset.badgeBox}`}
          title="Specialty"
        >
          <IconComponent
            className={`${preset.badgeIcon} text-[var(--color-text-muted)]`}
            strokeWidth={2}
          />
        </span>
      ) : null}
    </span>
  );
}

export { ICON_COMPONENTS };
