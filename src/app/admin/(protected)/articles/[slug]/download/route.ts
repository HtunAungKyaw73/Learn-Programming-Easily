import { getAdminArticleBySlug } from "@/lib/queries";
import { requireAuth } from "@/lib/actions/auth-guard";
import { toMarkdownFile } from "@/lib/articleMarkdown";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireAuth();
  const { slug } = await params;

  const article = await getAdminArticleBySlug(slug);
  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(toMarkdownFile(article), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
