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
import { createArticle } from "@/lib/actions/article";

const findUnique = vi.mocked(prisma.article.findUnique);
const create = vi.mocked(prisma.article.create);

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
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
