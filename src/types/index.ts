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
 * Lightweight article descriptor populated from a DB row. Used by public
 * listing pages.
 */
export interface ArticleListItem {
  slug: string;
  frontmatter: ArticleFrontmatter;
  readingTime: number;
}

/** Admin view: article metadata from DB (listings, table rows). */
export interface AdminArticleListItem {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  readingTime: number | null;
  tags: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}

/** Admin view: tag with article count. */
export interface AdminTagItem {
  id: number;
  name: string;
  slug: string;
  _count: { articles: number };
}
