import { useState, type FormEvent } from "react";
import Reveal from "@/components/Reveal";
import { COMPANY, CONTACT, WHATSAPP_MESSAGE } from "@/data/site";

const FIELD_CLASS =
  "w-full border-0 border-b border-border bg-transparent py-4 text-lg text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors duration-300 ease-apple " +
  "focus:border-accent focus:outline-none focus:ring-0";

const LABEL_CLASS = "text-xs uppercase tracking-[0.2em] text-muted-foreground";

const whatsappHref = `https://wa.me/${COMPANY.whatsappNumber}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

/**
 * There is no backend, so the form composes a real mail draft rather than
 * pretending to POST and faking a success toast. Honest, and it works today —
 * when an API exists, only `handleSubmit` changes.
 */
const ContactEndpoint = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [brief, setBrief] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = `Enterprise enquiry — ${name}`;
    const body = `${brief}\n\n—\n${name}\n${email}`;
    window.location.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="contact" className="px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-24">
        <Reveal as="header">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {CONTACT.eyebrow}
          </p>
          <h2 className="type-display mt-5 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground sm:mt-6 md:text-6xl">
            {CONTACT.headline}
          </h2>
          <p className="measure mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            {CONTACT.description}
          </p>

          <address className="mt-12 flex flex-col gap-4 not-italic">
            <a
              href={`mailto:${COMPANY.email}`}
              className="text-base text-foreground transition-colors duration-300 ease-apple hover:text-accent"
            >
              {COMPANY.email}
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-foreground transition-colors duration-300 ease-apple hover:text-accent"
            >
              {COMPANY.phone}
            </a>
            <span className="text-base text-muted-foreground">{COMPANY.location}</span>
          </address>
        </Reveal>

        <Reveal index={1}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            <div>
              <label htmlFor="contact-name" className={LABEL_CLASS}>
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="contact-email" className={LABEL_CLASS}>
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="contact-brief" className={LABEL_CLASS}>
                The system
              </label>
              <textarea
                id="contact-brief"
                name="brief"
                required
                rows={4}
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="What are you building, and what does it need to survive?"
                className={`${FIELD_CLASS} resize-none leading-relaxed`}
              />
            </div>

            <button
              type="submit"
              className="self-start rounded-full bg-accent-solid px-8 py-3.5 text-sm font-medium text-accent-foreground transition-all duration-300 ease-apple hover:scale-[1.02] hover:opacity-90"
            >
              Send enquiry
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
};

export default ContactEndpoint;
