import { useMemo } from 'react';
import { trpc } from '@/providers/trpc';

/**
 * useKnowledge：知识库数据的深 hook。
 * 对外暴露：已索引的数据形态（poets/nodes/poems + 各类 Map），
 * 对内隐藏：kb.all 查询细节、route JSON 兜底、类型断言、索引构建。
 * 调用方不再各自重建 poetName/nodeBySlug 等映射。
 */

export interface KbNode {
  id: number;
  slug: string;
  name: string;
  lon: number;
  lat: number;
  highlight: boolean;
  note: string | null;
  source?: string | null;
}

export interface KbPoet {
  id: number;
  slug: string;
  name: string;
  dynasty: string;
  years: string | null;
  era: string | null;
  color: string;
  summary: string | null;
  detail: string | null;
  chronicle: string | null;
  aiPortrait: string | null;
  source: string | null;
  startYear: number | null;
  route: string[];
}

export interface KbPoem {
  id: number;
  poetId: number;
  nodeSlug: string | null;
  title: string;
  lines: string;
  note: string | null;
  year: number | null;
  background?: string | null;
  source?: string | null;
  extUrl?: string | null;
}

export interface Knowledge {
  poets: KbPoet[];
  nodes: KbNode[];
  poems: KbPoem[];
  poetById: Map<number, KbPoet>;
  poetBySlug: Map<string, KbPoet>;
  nodeBySlug: Map<string, KbNode>;
  /** poetId → 诗作列表（按 sortOrder/原始顺序） */
  poemsByPoet: Map<number, KbPoem[]>;
  /** nodeSlug → 作于此地的诗作 */
  poemsByNode: Map<string, KbPoem[]>;
}

function buildKnowledge(data: {
  poets: unknown[];
  nodes: unknown[];
  poems: unknown[];
}): Knowledge {
  const poets = data.poets.map((p) => {
    const raw = p as Omit<KbPoet, 'route' | 'detail' | 'chronicle' | 'aiPortrait' | 'source'> & {
      route?: string[] | string | null;
      detail?: string | null;
      chronicle?: string | null;
      aiPortrait?: string | null;
      source?: string | null;
    };
    return {
      ...raw,
      detail: raw.detail ?? null,
      chronicle: raw.chronicle ?? null,
      aiPortrait: raw.aiPortrait ?? null,
      source: raw.source ?? null,
      route: Array.isArray(raw.route)
        ? raw.route
        : raw.route
          ? (JSON.parse(raw.route) as string[])
          : [],
    } as KbPoet;
  });
  const nodes = data.nodes as KbNode[];
  const poems = data.poems as KbPoem[];

  const poemsByPoet = new Map<number, KbPoem[]>();
  for (const pm of poems) {
    const list = poemsByPoet.get(pm.poetId) ?? [];
    list.push(pm);
    poemsByPoet.set(pm.poetId, list);
  }
  const poemsByNode = new Map<string, KbPoem[]>();
  for (const pm of poems) {
    if (!pm.nodeSlug) continue;
    const list = poemsByNode.get(pm.nodeSlug) ?? [];
    list.push(pm);
    poemsByNode.set(pm.nodeSlug, list);
  }

  return {
    poets,
    nodes,
    poems,
    poetById: new Map(poets.map((p) => [p.id, p])),
    poetBySlug: new Map(poets.map((p) => [p.slug, p])),
    nodeBySlug: new Map(nodes.map((n) => [n.slug, n])),
    poemsByPoet,
    poemsByNode,
  };
}

export function useKnowledge(staleTime = 1000 * 60) {
  const query = trpc.kb.all.useQuery(undefined, { staleTime });
  const kb = useMemo(
    () =>
      query.data
        ? buildKnowledge(query.data as { poets: unknown[]; nodes: unknown[]; poems: unknown[] })
        : null,
    [query.data],
  );
  return { ...query, kb };
}
