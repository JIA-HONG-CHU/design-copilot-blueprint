export interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "playbook" | "case-study" | "template" | "convergence-pattern";
  tags: string[];
  author: string;
  publishedAt: string;
  content: string;
  relatedLinks: { label: string; url: string }[];
}
