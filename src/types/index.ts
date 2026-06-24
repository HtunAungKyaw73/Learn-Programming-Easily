export interface ArticleFrontmatter {
  title: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  published?: boolean;
  featured?: boolean;
  publishedAt?: string;
  coverImage?: string;
}

export interface ArticleMeta {
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  readingTime: number | null;
  coverImage: string | null;
  tags: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}

export interface ArticleWithContent extends ArticleMeta {
  content: string;
}

/**
 * Lightweight article descriptor derived directly from an MDX file's
 * frontmatter (filesystem-first, no DB round-trip). Used by public listing
 * pages until DB metadata sync lands in the admin phase.
 */
export interface ArticleListItem {
  slug: string;
  frontmatter: ArticleFrontmatter;
  readingTime: number;
}
