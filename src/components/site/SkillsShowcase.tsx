import { site } from "@/lib/site";

export function SkillsShowcase() {
  const { skills } = site.author;
  if (skills.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Skills
      </h2>
      <div className="mt-6 flex flex-col gap-6">
        {skills.map((category) => (
          <div key={category.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
              {category.label}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <li
                  key={skill.name}
                  style={{ "--brand": skill.brandColor } as React.CSSProperties}
                  className="group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-ink"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="text-(--brand) transition-colors duration-200"
                  >
                    <path d={skill.iconPath} />
                  </svg>
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
