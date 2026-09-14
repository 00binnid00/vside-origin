// 경로: src/components/design/impact/buildImpact.ts
//
// "이걸 바꾸면 무엇이 흔들리나" 를 계산한다.
//
// 현업에서 설계 단계에 가장 자주, 가장 아프게 겪는 일이 이것이다. 회원 테이블에서
// 컬럼 하나를 빼기로 했을 때 그 컬럼을 쓰는 API 가 몇 개인지, 그 API 를 부르는
// 화면이 어디인지 알 방법이 없어서 grep 하고 감으로 찍는다. 그리고 하나를 빠뜨려
// 배포 후에 터진다. 연결을 손으로 이어 두는 대가로 사용자가 받아야 하는 것이
// 바로 이 답이다.
//
// 서버에 두지 않는 이유
// -------------------
// 모델에서 순수하게 파생되는 값이고, 코드 생성을 막는 판정이 아니다. 편집하는
// 동안 즉시 갱신되어야 하므로 왕복을 하지 않는 편이 낫다.
//
// 전이(transitive)를 어디까지 따라가는가
// ------------------------------------
// 연결을 무한히 따라가면 안 된다. 테이블 → API → 요구사항까지 간 뒤 그 요구사항에
// 걸린 "다른" 화면까지 끌어오면, 실제로는 깨지지 않는 것을 깨진다고 보고하게 된다.
// 그래서 방향을 구분한다.
//
//   흔들리는 것(코드를 손봐야 하는 것)  : 테이블 → API → 화면
//   맥락(왜 필요한가)                  : 요구사항
//
// 요구사항은 "왜"를 알려 주는 정보이지 고쳐야 하는 대상이 아니라서 따로 담는다.

import type { DesignModel } from "../model/schema";

export type ImpactKind = "requirement" | "screen" | "api" | "table";

export interface ImpactItem {
  kind: ImpactKind;
  id: string;
  label: string;
  hint?: string;
}

export interface ImpactResult {
  /** 고른 항목 자신. 모델에서 못 찾으면 null. */
  origin: ImpactItem | null;
  /** 이 항목을 바꾸면 손봐야 하는 것들. */
  apis: ImpactItem[];
  screens: ImpactItem[];
  tables: ImpactItem[];
  /** 왜 필요한지 알려 주는 맥락. 고쳐야 하는 대상은 아니다. */
  requirements: ImpactItem[];
  /** apis + screens + tables 개수. 요구사항은 세지 않는다. */
  affectedCount: number;
}

const EMPTY: ImpactResult = {
  origin: null,
  apis: [],
  screens: [],
  tables: [],
  requirements: [],
  affectedCount: 0,
};

export function buildImpact(
  model: DesignModel,
  kind: ImpactKind,
  id: string | null,
): ImpactResult {
  if (!id) return EMPTY;

  const requirementById = new Map(model.requirements.map((item) => [item.id, item]));
  const screenById = new Map(model.screens.map((item) => [item.id, item]));
  const apiById = new Map(model.apis.map((item) => [item.id, item]));
  const tableById = new Map(model.erd.tables.map((item) => [item.id, item]));

  const requirementItem = (rid: string): ImpactItem | null => {
    const found = requirementById.get(rid);
    if (!found) return null;
    return {
      kind: "requirement",
      id: found.id,
      label: found.name || "(이름 없는 요구사항)",
      hint: found.code,
    };
  };

  const screenItem = (sid: string): ImpactItem | null => {
    const found = screenById.get(sid);
    if (!found) return null;
    return {
      kind: "screen",
      id: found.id,
      label: found.name || "(이름 없는 화면)",
      hint: found.key,
    };
  };

  const apiItem = (aid: string): ImpactItem | null => {
    const found = apiById.get(aid);
    if (!found) return null;
    return {
      kind: "api",
      id: found.id,
      label: `${found.method} ${found.endpoint || "(경로 없음)"}`,
      hint: found.description,
    };
  };

  const tableItem = (tid: string): ImpactItem | null => {
    const found = tableById.get(tid);
    if (!found) return null;
    return {
      kind: "table",
      id: found.id,
      label: found.name || "(이름 없는 테이블)",
      hint: `${found.columns.length}개 컬럼`,
    };
  };

  /* 같은 항목이 두 경로로 들어와도 한 번만 담는다. */
  const collect = <T>(ids: Iterable<string>, toItem: (v: string) => T | null): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];

    for (const value of ids) {
      if (seen.has(value)) continue;
      seen.add(value);

      const item = toItem(value);
      if (item) out.push(item);
    }

    return out;
  };

  /* API 여러 개가 쓰는 테이블을 모은다. */
  const tablesOfApis = (apiIds: string[]): string[] =>
    apiIds.flatMap((aid) => apiById.get(aid)?.tableIds ?? []);

  let origin: ImpactItem | null = null;
  let apiIds: string[] = [];
  let screenIds: string[] = [];
  let tableIds: string[] = [];
  let requirementIds: string[] = [];

  if (kind === "table") {
    origin = tableItem(id);

    // 테이블에는 역참조가 없다(ERD 의 주인이 텍스트라서 일부러 두지 않았다).
    // 그래서 API 쪽을 훑어 거꾸로 구한다.
    const usingApis = model.apis.filter((api) => api.tableIds.includes(id));
    apiIds = usingApis.map((api) => api.id);

    const usingApiIdSet = new Set(apiIds);
    screenIds = model.screens
      .filter((screen) => screen.apiIds.some((aid) => usingApiIdSet.has(aid)))
      .map((screen) => screen.id);

    const screenIdSet = new Set(screenIds);
    requirementIds = [
      ...usingApis.flatMap((api) => api.requirementIds),
      ...model.screens
        .filter((screen) => screenIdSet.has(screen.id))
        .flatMap((screen) => screen.requirementIds),
    ];
  } else if (kind === "api") {
    const api = apiById.get(id);
    origin = apiItem(id);

    tableIds = api?.tableIds ?? [];
    screenIds = api?.screenIds ?? [];
    requirementIds = api?.requirementIds ?? [];
  } else if (kind === "screen") {
    const screen = screenById.get(id);
    origin = screenItem(id);

    apiIds = screen?.apiIds ?? [];
    tableIds = tablesOfApis(apiIds);
    requirementIds = screen?.requirementIds ?? [];
  } else {
    const requirement = requirementById.get(id);
    origin = requirementItem(id);

    screenIds = requirement?.screenIds ?? [];
    apiIds = requirement?.apiIds ?? [];
    tableIds = tablesOfApis(apiIds);
  }

  if (!origin) return EMPTY;

  const apis = collect(apiIds, apiItem);
  const screens = collect(screenIds, screenItem);
  const tables = collect(tableIds, tableItem);

  // 자기 자신은 맥락에서 뺀다. 요구사항을 골랐을 때 자기 이름이 다시 나오면 헷갈린다.
  const requirements = collect(requirementIds, requirementItem).filter(
    (item) => item.id !== origin?.id,
  );

  return {
    origin,
    apis,
    screens,
    tables,
    requirements,
    affectedCount: apis.length + screens.length + tables.length,
  };
}
