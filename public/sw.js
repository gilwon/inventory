// 오프라인 안내 전용 서비스 워커. /offline 만 캐시하고 재고 데이터는 절대 캐시하지 않는다.
const CACHE = "inventory-offline-v1";
const OFFLINE_URL = "/offline";

// 설치 시 안내 페이지만 미리 캐시한다.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

// 이전 버전 캐시를 지우고 열린 탭을 바로 넘겨받는다.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// 페이지 이동 요청이 네트워크 오류로 실패할 때만 안내 페이지를 돌려준다.
// 그 외 요청(RSC, /api, Supabase, 이미지, _next 자산)은 respondWith 를 부르지 않고 그대로 통과시킨다.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? Response.error();
    }),
  );
});
