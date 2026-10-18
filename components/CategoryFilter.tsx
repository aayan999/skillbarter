import Link from "next/link";
import { SKILL_CATEGORIES } from "@/types";

export default function CategoryFilter({ base, active }: { base: string; active?: string }) {
  return (
    <div className="row" style={{ marginBottom: "1rem" }}>
      <Link className={`badge${!active ? " accepted" : ""}`} href={base}>All</Link>
      {SKILL_CATEGORIES.map((c) => (
        <Link key={c} className={`badge${active === c ? " accepted" : ""}`} href={`${base}?category=${encodeURIComponent(c)}`}>
          {c}
        </Link>
      ))}
    </div>
  );
}
