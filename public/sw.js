// Web Push 用の Service Worker。
// アプリのバンドルとは独立して配信されるため、ここではビルドツールを使わず
// プレーンな JS で書く（Vite の場合、public/sw.js は /sw.js としてそのまま配信される）。
//
// iOS Safari で Web Push を受け取るための前提条件（コード外の話）:
// 1. iOS 16.4 以降であること
// 2. アプリを「ホーム画面に追加」して、PWA(standalone表示)として起動していること
//    （Safariのタブで開いているだけでは push は届かない）
// 3. manifest.json に "display": "standalone"（または "fullscreen"）が設定されていること
// 4. HTTPS で配信されていること（localhostは開発時のみ例外）

self.addEventListener("install", () => {
  // 新しい Service Worker をすぐに有効化する
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// サーバー（Edge Function）からの push を受け取り、OS通知として表示する
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "お知らせ", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "お知らせ";
  const options = {
    body: payload.body || "",
    // アイコンは既存の public 配下の画像に合わせて変更してください
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
    tag: payload.tag || "task-notification",
    data: {
      url: payload.url || "/",
      notificationId: payload.notificationId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知をタップした時、既に開いているタブがあればそこにフォーカスし、
// なければ新しいタブでアプリを開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // navigate に失敗しても focus はできているので無視
            }
          }
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
