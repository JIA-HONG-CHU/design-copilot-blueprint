/**
 * API hooks for Knowledge Management (Layer 5)
 *
 * Covers: knowledge_articles (KnowledgeBase page), knowledge_entries (Feynman page).
 *
 * All hooks use the generic useSupabaseQuery / useSupabaseMutation
 * helpers and perform snake_case -> camelCase mapping at the hook layer.
 */

import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { queryKeys } from './useQueryConfig';
import type { KnowledgeArticle } from '@/types/knowledge';

// ---------------------------------------------------------------------------
// Row types (DB snake_case)
// ---------------------------------------------------------------------------

interface KnowledgeArticleDbRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  published_at: string;
  content: string;
  related_links: { label: string; url: string }[];
  created_at: string;
  updated_at: string;
}

interface KnowledgeEntryDbRow {
  id: string;
  project_id: string;
  asset_type: string;
  title: string;
  content: string;
  reviewed: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Frontend types for knowledge_entries
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  id: string;
  projectId: string;
  assetType: string;
  title: string;
  content: string;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Mappers: DB row -> frontend type
// ---------------------------------------------------------------------------

function mapArticle(row: KnowledgeArticleDbRow): KnowledgeArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    category: row.category as KnowledgeArticle['category'],
    tags: row.tags ?? [],
    author: row.author ?? '',
    publishedAt: row.published_at ?? '',
    content: row.content ?? '',
    relatedLinks: row.related_links ?? [],
  };
}

function mapEntry(row: KnowledgeEntryDbRow): KnowledgeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    assetType: row.asset_type,
    title: row.title,
    content: row.content ?? '',
    reviewed: row.reviewed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Knowledge Articles (KnowledgeBase page)
// ---------------------------------------------------------------------------

/** List all knowledge articles (not project-scoped) */
export function useKnowledgeArticles() {
  const result = useSupabaseQuery<KnowledgeArticleDbRow[]>({
    table: 'knowledge_articles',
    queryKey: queryKeys.knowledge_articles.all,
    orderBy: { column: 'published_at', ascending: false },
  });

  return {
    ...result,
    data: result.data?.map(mapArticle) ?? [],
  };
}

/** Fetch a single knowledge article by slug */
export function useKnowledgeArticle(slug: string | undefined) {
  const result = useSupabaseQuery<KnowledgeArticleDbRow>({
    table: 'knowledge_articles',
    queryKey: queryKeys.knowledge_articles.bySlug(slug ?? ''),
    filters: slug
      ? [{ column: 'slug', operator: 'eq' as const, value: slug }]
      : [],
    single: true,
    enabled: !!slug,
  });

  return {
    ...result,
    data: result.data ? mapArticle(result.data) : undefined,
  };
}

/** Create a new knowledge article */
export function useCreateKnowledgeArticle() {
  return useSupabaseMutation<KnowledgeArticleDbRow, {
    slug: string;
    title: string;
    description?: string;
    category: string;
    tags?: string[];
    author?: string;
    content?: string;
    related_links?: { label: string; url: string }[];
  }>({
    table: 'knowledge_articles',
    type: 'insert',
    invalidateKeys: [queryKeys.knowledge_articles.all],
    successMessage: '已新增知識文章',
  });
}

/** Update an existing knowledge article */
export function useUpdateKnowledgeArticle() {
  return useSupabaseMutation<KnowledgeArticleDbRow, {
    id: string;
    slug?: string;
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    author?: string;
    content?: string;
    related_links?: { label: string; url: string }[];
  }>({
    table: 'knowledge_articles',
    type: 'update',
    invalidateKeys: [queryKeys.knowledge_articles.all],
    successMessage: '知識文章已更新',
  });
}

// ---------------------------------------------------------------------------
// Knowledge Entries (Feynman page)
// ---------------------------------------------------------------------------

/** List knowledge entries for a project */
export function useKnowledgeEntries(projectId: string | undefined) {
  const result = useSupabaseQuery<KnowledgeEntryDbRow[]>({
    table: 'knowledge_entries',
    queryKey: queryKeys.knowledge_entries.byProject(projectId ?? ''),
    filters: projectId
      ? [{ column: 'project_id', operator: 'eq' as const, value: projectId }]
      : [],
    orderBy: { column: 'created_at', ascending: true },
    enabled: !!projectId,
  });

  return {
    ...result,
    data: result.data?.map(mapEntry) ?? [],
  };
}

/** Create a new knowledge entry */
export function useCreateKnowledgeEntry() {
  return useSupabaseMutation<KnowledgeEntryDbRow, {
    project_id: string;
    asset_type: string;
    title: string;
    content?: string;
    reviewed?: boolean;
  }>({
    table: 'knowledge_entries',
    type: 'insert',
    invalidateKeys: [queryKeys.knowledge_entries.all],
    successMessage: '已新增知識條目',
  });
}

/** Update a knowledge entry (e.g. mark as reviewed) */
export function useUpdateKnowledgeEntry() {
  return useSupabaseMutation<KnowledgeEntryDbRow, {
    id: string;
    title?: string;
    content?: string;
    reviewed?: boolean;
    asset_type?: string;
  }>({
    table: 'knowledge_entries',
    type: 'update',
    invalidateKeys: [queryKeys.knowledge_entries.all],
    successMessage: '知識條目已更新',
  });
}
