// EmailJS (https://www.emailjs.com/) の REST API を直接叩くヘルパー。
// npm パッケージを追加しなくても fetch だけで送信できます。
//
// 事前に必要な準備（EmailJS ダッシュボード側）:
//   1. 無料アカウントを作成
//   2. Email Services で Gmail 等を接続 → Service ID を取得
//   3. Email Templates でテンプレートを作成 → Template ID を取得
//      テンプレート変数の例: {{to_email}} {{supporter_name}} {{accept_url}}
//   4. Account > General から Public Key を取得
//
// .env に以下を追加してください:
//   VITE_EMAILJS_SERVICE_ID=xxxxxxx
//   VITE_EMAILJS_TEMPLATE_ID=xxxxxxx
//   VITE_EMAILJS_PUBLIC_KEY=xxxxxxx

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

interface SendInviteEmailParams {
  toEmail: string;
  supporterName: string;
  acceptUrl: string;
}

export async function sendInviteEmail({
  toEmail,
  supporterName,
  acceptUrl,
}: SendInviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return {
      ok: false,
      error:
        "EmailJSの設定(.envのVITE_EMAILJS_*)が見つかりません。管理者に確認してください。",
    };
  }

  try {
    const res = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: toEmail,
          supporter_name: supporterName,
          accept_url: acceptUrl,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || "メール送信に失敗しました。" };
    }

    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "メール送信中にエラーが発生しました。" };
  }
}
