import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./auth-guard", () => ({ requireAuth: vi.fn().mockResolvedValue({}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    tag: { upsert: vi.fn() },
    category: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  createArticle,
  deleteArticle,
  togglePublished,
  updateArticle,
} from "@/lib/actions/article";

const findUnique = vi.mocked(prisma.article.findUnique);
const create = vi.mocked(prisma.article.create);
const update = vi.mocked(prisma.article.update);
const del = vi.mocked(prisma.article.delete);
const tagUpsert = vi.mocked(prisma.tag.upsert);

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
  del.mockReset();
  tagUpsert.mockReset();
  vi.mocked(revalidatePath).mockClear();
});

const form = {
  title: "Hello World",
  slug: "hello-world",
  description: "",
  content: "# Hello\n\nBody.",
  published: true,
  featured: false,
  publishedAt: "",
  coverImage: "",
  tagNames: [],
  categoryNames: [],
};

describe("createArticle", () => {
  it("persists the MDX body into the DB and reports success", async () => {
    findUnique.mockResolvedValue(null as never);
    create.mockResolvedValue({ id: 1 } as never);

    const result = await createArticle(form);

    expect(result).toEqual({ ok: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "hello-world", body: "# Hello\n\nBody." }),
      }),
    );
  });
});

describe("updateArticle", () => {
  it("revalidates the page of a tag removed from the article", async () => {
    // Before: tagged react + typescript. After: typescript only.
    findUnique.mockResolvedValue({
      id: 1,
      slug: "hello-world",
      tags: [{ name: "react" }, { name: "typescript" }],
      categories: [],
    } as never);
    update.mockResolvedValue({ id: 1 } as never);

    const result = await updateArticle("hello-world", {
      ...form,
      tagNames: ["typescript"],
    });

    expect(result).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/tags/react");
    expect(revalidatePath).toHaveBeenCalledWith("/tags/typescript");
  });

  it("revalidates the old article path when the slug changes", async () => {
    findUnique
      .mockResolvedValueOnce(null as never) // slug-conflict check
      .mockResolvedValueOnce({ id: 1, slug: "hello-world", tags: [], categories: [] } as never);
    update.mockResolvedValue({ id: 1 } as never);

    await updateArticle("hello-world", { ...form, slug: "hello-again" });

    expect(revalidatePath).toHaveBeenCalledWith("/articles/hello-world");
    expect(revalidatePath).toHaveBeenCalledWith("/articles/hello-again");
  });
});

describe("deleteArticle", () => {
  it("revalidates the tag pages the deleted article was listed on", async () => {
    findUnique.mockResolvedValue({
      id: 1,
      slug: "hello-world",
      tags: [{ name: "react" }],
    } as never);
    del.mockResolvedValue({ id: 1 } as never);

    const result = await deleteArticle("hello-world");

    expect(result).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/tags/react");
    expect(revalidatePath).toHaveBeenCalledWith("/articles/hello-world");
  });
});

describe("togglePublished", () => {
  it("revalidates the article page, tags, and sitemap", async () => {
    findUnique.mockResolvedValue({
      id: 1,
      slug: "hello-world",
      published: false,
      tags: [],
    } as never);
    update.mockResolvedValue({ id: 1 } as never);

    await togglePublished("hello-world");

    expect(revalidatePath).toHaveBeenCalledWith("/articles/hello-world");
    expect(revalidatePath).toHaveBeenCalledWith("/tags");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("revalidates the tag pages the article appears on", async () => {
    findUnique.mockResolvedValue({
      id: 1,
      slug: "hello-world",
      published: true,
      tags: [{ name: "react" }],
    } as never);
    update.mockResolvedValue({ id: 1 } as never);

    await togglePublished("hello-world");

    expect(revalidatePath).toHaveBeenCalledWith("/tags/react");
  });
});
