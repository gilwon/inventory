// 위치 목록으로 "창고 > 선반 > 칸" 형태의 경로 문자열을 만든다
import type { Tables } from "@/lib/database.types";

type Loc = Pick<Tables<"locations">, "id" | "parent_id" | "name">;

// 순환 데이터가 들어와도 멈추도록 깊이를 20으로 제한한다.
export function buildLocationPaths(locations: Loc[]): Map<string, string> {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const paths = new Map<string, string>();
  for (const loc of locations) {
    const names: string[] = [];
    let cur: Loc | undefined = loc;
    for (let depth = 0; cur && depth < 20; depth++) {
      names.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    paths.set(loc.id, names.join(" > "));
  }
  return paths;
}
