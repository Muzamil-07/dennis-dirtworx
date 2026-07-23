export interface ServiceItem {
  icon: "site-prep" | "grading" | "excavation" | "hauling";
  title: string;
  description: string;
}

export const SERVICES_SECTION = {
  label: "OUR SERVICES",
  heading: "BUILT FOR THE WORK THAT MOVES EVERYTHING.",
  items: [
    {
      icon: "site-prep",
      title: "Site Preparation",
      description:
        "Lot clearing, stripping and compaction that leave every build on solid ground.",
    },
    {
      icon: "grading",
      title: "Grading & Leveling",
      description:
        "Laser-guided grades and drainage-true slopes, finished to spec the first time.",
    },
    {
      icon: "excavation",
      title: "Excavation",
      description:
        "Foundations, trenches and basements dug clean, safe and exactly to plan.",
    },
    {
      icon: "hauling",
      title: "Hauling & Removal",
      description:
        "Fast, reliable material hauling and debris removal that keeps your site moving.",
    },
  ] as ServiceItem[],
  results: [
    { value: "250+", label: "Projects Completed" },
    { value: "15+", label: "Years Experience" },
    { value: "100%", label: "Commitment to Quality" },
  ],
} as const;
