import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import ScrollProgress from "./ScrollProgress";
import LabAssist from "./LabAssist";

const Layout = ({ children }: { children: ReactNode }) => (
  <div id="top" className="grain flex min-h-screen flex-col bg-background">
    {/* Visually hidden until focused. The first thing a keyboard or screen-reader
        user meets, and the cheapest possible signal that this site was built by
        people who know what they are doing. */}
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[60] focus:rounded-full focus:bg-accent-solid focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-accent-foreground"
    >
      Skip to content
    </a>

    <Navbar />
    <ScrollProgress />

    {/* pt-14 clears the 56px fixed nav exactly — no arbitrary spacer. */}
    <main id="main" className="flex-1 pt-14">
      {children}
    </main>

    <Footer />

    {/* Floating stack, bottom-right: Lab Assist owns bottom-6, WhatsApp sits
        above it at bottom-24, and the chat panel opens clear of both. */}
    <WhatsAppButton />
    <LabAssist />
  </div>
);

export default Layout;
