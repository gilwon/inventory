// 하단 탭 구성. 탭에 올릴 경로 목록(순서 유지)과 나머지(더보기)를 NAV_ITEMS 순서로 나눈다.

export function splitTabs<T extends { href: string }>(items: T[], tabHrefs: readonly string[]) {
  const tabs = tabHrefs
    .map((h) => items.find((it) => it.href === h))
    .filter((it): it is T => it !== undefined);
  const more = items.filter((it) => !tabHrefs.includes(it.href));
  return { tabs, more };
}
