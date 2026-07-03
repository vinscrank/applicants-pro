import type { ApplicationMethodType } from "../types";
import { getApplicationSourceLabel } from "../constants";

interface Props {
  method: ApplicationMethodType | null;
  other: string | null;
  href: string | null;
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

function IndeedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 18V6h3.2v1.6h.08C7.76 6.64 8.72 6 10.16 6c2.48 0 4.24 1.68 4.24 4.32V18H11.2v-7.04c0-1.76-.72-2.56-2-2.56-1.12 0-1.84.72-2.16 1.76V18H4zm13.6 0V8.8h3.04V18H17.6zm1.52-10.56a1.76 1.76 0 110-3.52 1.76 1.76 0 010 3.52z"
      />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
      />
    </svg>
  );
}

function OtherIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
      />
    </svg>
  );
}

function resolveIcon(method: ApplicationMethodType | null) {
  switch (method) {
    case "linkedin":
      return { Icon: LinkedInIcon, className: "source-icon-linkedin" };
    case "indeed":
      return { Icon: IndeedIcon, className: "source-icon-indeed" };
    case "company_website":
      return { Icon: WebsiteIcon, className: "source-icon-website" };
    default:
      return { Icon: OtherIcon, className: "source-icon-other" };
  }
}

export default function ApplicationSourceIcon({ method, other, href }: Props) {
  const label = getApplicationSourceLabel(method, other);
  const { Icon, className } = resolveIcon(method);

  const content = (
    <span className={`source-icon ${className}`} title={label}>
      <Icon />
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="source-icon-link"
        title={label}
        aria-label={label}
      >
        {content}
      </a>
    );
  }

  return content;
}
