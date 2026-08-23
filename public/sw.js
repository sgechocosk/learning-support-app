// public/sw.js
import { precacheAndRoute } from "workbox-precaching";
precacheAndRoute(self.__WB_MANIFEST);

// iOS Safari で Web Push を受け取るための前提条件（コード外の話）:
// 1. iOS 16.4 以降であること
// 2. アプリを「ホーム画面に追加」して、PWA(standalone表示)として起動していること
//    （Safariのタブで開いているだけでは push は届かない）
// 3. manifest の display が "standalone"（または "fullscreen"）であること
// 4. HTTPS で配信されていること（localhostは開発時のみ例外）

self.addEventListener("install", () => {
  // 新しい Service Worker をすぐに有効化する
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// サーバー（Edge Function）からの push を受け取り、OS通知として表示する。
//
// 重要: iOSのWebKitは「pushイベントを受け取ったら可能な限り早くshowNotification()を
// 呼ぶ」ことを強く期待している。showNotification()より前に他の非同期処理（fetch、
// clients.matchAll()など）をawaitして時間を使うと、それが原因でタイミングが
// 間に合わなかったとみなされ、最悪の場合そのpush購読自体が失効させられる
// （"userVisibleOnly"の約束を守れなかった扱いになる）。
// → showNotification()を他の何よりも先に、最優先・最速で呼ぶ。
//
// 送信側(Edge Function)はDeclarative Web Push形式
// ({ web_push: 8030, notification: {...} }) で送っている。
// これは iOS 18.4 / iPadOS 18.4 (Safari 18.4) 以降ではWebKitが直接処理するが、
// それより前のバージョンでは、この同じJSONがそのままここでの`push`イベントの
// event.dataとして届くだけなので、後方互換のため notification フィールドの
// 有無を見て両方の形式に対応する。
self.addEventListener("push", (event) => {
  const handle = async () => {
    let payload = null;
    try {
      payload = event.data ? event.data.json() : null;
    } catch {
      payload = null;
    }

    const n = payload?.notification ??
      payload ?? { title: "お知らせ", body: "" };
    const title = n.title || "お知らせ";
    const options = {
      body: n.body || "",
      // アイコンは既存の public 配下の画像に合わせて変更してください
      icon: n.icon || "/pwa-192x192.png",
      badge: n.badge || "/pwa-192x192.png",
      tag: n.tag || "task-notification",
      // 対応ブラウザ(iOS 18.4+ Safari等)では、この navigate が設定されていると
      // notificationclickをバイパスしてブラウザ自身がタップ時に直接ナビゲートする。
      navigate: n.navigate || n.data?.url || n.url || "/",
      data: {
        url: n.navigate || n.data?.url || n.url || "/",
        notificationId: n.data?.notificationId || n.notificationId || null,
      },
    };

    try {
      // ここを他の何よりも先に、一切awaitを挟まず呼ぶ。
      await self.registration.showNotification(title, options);
    } catch (err) {
      console.error("[sw] showNotification failed:", err);
    }
  };

  event.waitUntil(handle());
});

// 通知をタップした時、既に開いているタブがあればそこにフォーカスし、
// なければ新しいタブでアプリを開く。
// （navigateオプションに対応しているブラウザでは、このハンドラより先に
//   ブラウザ自身がナビゲートを済ませてしまうため、実際にはここが動くのは
//   navigate未対応の古いブラウザ・iOSバージョンの場合のフォールバックとなる）
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
