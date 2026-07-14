import { useEffect, useState } from "react";
import {
  getRepository,
  type Announcement,
  type SiteCapability,
  type SitePartner,
} from "@/admin/repository";
import { DEFAULT_CONTENT, type SiteContent } from "@/data/content";
import { CAPABILITIES, PARTNERS } from "@/data/site";

export interface SiteData {
  content: SiteContent;
  partners: Array<{ name: string; country: string; relationship: string; description: string }>;
  capabilities: Array<{
    id: string;
    index: string;
    title: string;
    description: string;
    detail: string[];
  }>;
  announcements: Announcement[];
  loaded: boolean;
}

/**
 * The single read path for everything the public site displays.
 *
 * ── The bug this fixes ────────────────────────────────────────────────────
 * Sections used to fall back to the hardcoded lists whenever the database
 * returned nothing. That had two consequences, both bad:
 *
 *   1. The admin panel showed "No partners added" while the website happily
 *      displayed Noregna and Superlogics — the panel was lying.
 *   2. You could never REMOVE the last partner. Delete it, the table goes
 *      empty, and the site silently restores the built-ins.
 *
 * So the fallback is now gated on `seeded`. Before the database has ever been
 * populated (a fresh deploy), the built-ins render so the site is never blank.
 * The moment the admin panel seeds it, the DATABASE IS THE ONLY TRUTH —
 * including when a collection is deliberately empty.
 *
 * Fetched once per mount and shared by every section on the page.
 */
export const useSiteContent = (): SiteData => {
  const [data, setData] = useState<SiteData>({
    content: DEFAULT_CONTENT,
    partners: PARTNERS.map((p) => ({ ...p })),
    capabilities: CAPABILITIES.map((c) => ({ ...c })),
    announcements: [],
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const repository = getRepository();

      const [content, seeded, partnerRows, capabilityRows, announcementRows] =
        await Promise.all([
          repository.getContent(),
          repository.isSeeded(),
          repository.listPartners(),
          repository.listCapabilities(),
          repository.listAnnouncements(),
        ]);

      if (cancelled) return;

      const activePartners = partnerRows.filter((p: SitePartner) => p.isActive);
      const activeCapabilities = capabilityRows.filter((c: SiteCapability) => c.isActive);

      setData({
        content,

        // Seeded → the database decides, even if that means showing nothing.
        // Not seeded → the built-ins, so a fresh deploy is never blank.
        partners: seeded
          ? activePartners.map((p) => ({
              name: p.name,
              country: p.country,
              relationship: p.relationship,
              description: p.description,
            }))
          : PARTNERS.map((p) => ({ ...p })),

        capabilities: seeded
          ? activeCapabilities.map((c, i) => ({
              id: c.id,
              index: String(i + 1).padStart(2, "0"),
              title: c.title,
              description: c.description,
              detail: c.detail,
            }))
          : CAPABILITIES.map((c) => ({ ...c })),

        announcements: announcementRows.filter((a) => a.isActive),
        loaded: true,
      });
    };

    void load().catch(() => {
      // Network or config failure — keep the built-ins rather than a blank page.
      if (!cancelled) setData((current) => ({ ...current, loaded: true }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
};
