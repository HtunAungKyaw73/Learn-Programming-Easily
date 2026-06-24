import { getAdminTags } from "@/lib/queries";
import { TagManager } from "./tag-manager";

export default async function AdminTagsPage() {
  const tags = await getAdminTags();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Tags
      </h1>
      <p className="mt-1 text-sm text-faint">
        Manage tags used to categorize articles.
      </p>
      <div className="mt-6">
        <TagManager initialTags={tags} />
      </div>
    </div>
  );
}
