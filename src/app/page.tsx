import Link from "next/link";
import type { ReactNode } from "react";

type NavCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const iconClass = "h-6 w-6";
const iconProps = {
  className: iconClass,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

const cards: NavCard[] = [
  {
    title: "Properties",
    description: "Browse and manage your portfolio.",
    href: "/properties",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a.75.75 0 0 1-.75.75h-4.5V15h-7.5v6.75h-4.5A.75.75 0 0 1 3 21V10.5Z" />
      </svg>
    ),
  },
  {
    title: "Projects",
    description: "Track ongoing work and milestones.",
    href: "/projects",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h3.75l1.5 1.5H18a2.25 2.25 0 0 1 2.25 2.25v9A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25v-10.5Z" />
      </svg>
    ),
  },
  {
    title: "Contacts",
    description: "Keep your network organized.",
    href: "/contacts",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z" />
      </svg>
    ),
  },
  {
    title: "Documents",
    description: "Store and find important files.",
    href: "/documents",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75h7.19a1.5 1.5 0 0 1 1.06.44l3.31 3.31a1.5 1.5 0 0 1 .44 1.06v10.69a1.5 1.5 0 0 1-1.5 1.5h-10.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75v4.5h4.5" />
      </svg>
    ),
  },
  {
    title: "Budget",
    description: "Plan and review your finances.",
    href: "/budget",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5M5.25 19.5V12m4.5 7.5V8.25m4.5 11.25V14.25m4.5 5.25V5.25" />
      </svg>
    ),
  },
  {
    title: "Settings",
    description: "Configure your workspace preferences.",
    href: "/settings",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.66.838.347.151.738.108 1.05-.105l1.06-.726a1.125 1.125 0 0 1 1.45.12l.773.773c.39.39.44 1.005.12 1.45l-.726 1.06c-.213.312-.256.704-.105 1.05.151.347.463.597.838.66l1.281.213c.542.09.94.56.94 1.11v1.094c0 .55-.398 1.02-.94 1.11l-1.281.213c-.375.063-.687.313-.838.66-.151.347-.108.738.105 1.05l.726 1.06c.32.445.27 1.06-.12 1.45l-.773.773a1.125 1.125 0 0 1-1.45.12l-1.06-.726a1.125 1.125 0 0 0-1.05-.105c-.347.151-.597.463-.66.838l-.213 1.281c-.09.542-.56.94-1.11.94H11.45c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.66-.838 1.125 1.125 0 0 0-1.05.105l-1.06.726a1.125 1.125 0 0 1-1.45-.12l-.773-.773a1.125 1.125 0 0 1-.12-1.45l.726-1.06c.213-.312.256-.704.105-1.05a1.125 1.125 0 0 0-.838-.66l-1.281-.213c-.542-.09-.94-.56-.94-1.11V11.45c0-.55.398-1.02.94-1.11l1.281-.213c.375-.063.687-.313.838-.66.151-.347.108-.738-.105-1.05l-.726-1.06a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l1.06.726c.312.213.704.256 1.05.105.347-.151.597-.463.66-.838l.213-1.281Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-5xl flex-col items-center gap-12">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Welcome
          </h1>
          <p className="max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Choose a section below to get started.
          </p>
        </header>

        <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:focus-visible:ring-zinc-50 dark:focus-visible:ring-offset-zinc-950"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-900">
                  {card.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                    {card.title}
                  </h2>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {card.description}
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-zinc-700 transition-colors group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-zinc-50">
                  Open
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
