import Logo from "./Logo";
import { COMPANY, NAV_LINKS, WHATSAPP_MESSAGE } from "@/data/site";

const whatsappHref = `https://wa.me/${COMPANY.whatsappNumber}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

const Footer = () => (
  <footer className="px-6 pb-12 pt-24">
    <div className="mx-auto max-w-7xl">
      <div className="rule" />

      <div className="grid gap-12 pt-16 md:grid-cols-3">
        <div>
          <Logo className="h-8" />
          <p className="measure mt-6 text-sm leading-relaxed text-muted-foreground">
            {COMPANY.tagline}
          </p>
        </div>

        <nav aria-label="Sections">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sections
          </h2>
          <ul className="mt-6 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-foreground transition-colors duration-300 ease-apple hover:text-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Contact
          </h2>
          <address className="mt-6 flex flex-col gap-3 not-italic">
            <a
              href={`mailto:${COMPANY.email}`}
              className="text-sm text-foreground transition-colors duration-300 ease-apple hover:text-accent"
            >
              {COMPANY.email}
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground transition-colors duration-300 ease-apple hover:text-accent"
            >
              {COMPANY.phone}
            </a>
            <span className="text-sm text-muted-foreground">{COMPANY.location}</span>
          </address>
        </div>
      </div>

      <div className="mt-24 flex flex-col gap-2 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
        </p>
        <a
          href="#top"
          className="text-xs text-muted-foreground transition-colors duration-300 ease-apple hover:text-accent"
        >
          Back to top
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
