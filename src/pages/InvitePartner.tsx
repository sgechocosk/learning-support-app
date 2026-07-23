import { useState } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { sendInviteEmail } from "../lib/emailInvite";
import { useProfile } from "../hooks/useProfile";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function InvitePartner() {
  const { profile } = useProfile();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("有効なメールアドレスを入力してください。");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !profile) {
      setError("再度ログインしてください。");
      setLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. 招待レコードを作成（既に pending の招待があれば再送として上書き）
    const { data: invitation, error: insertError } = await supabase
      .from("pair_invitations")
      .upsert(
        {
          supporter_id: user.id,
          invitee_email: normalizedEmail,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        { onConflict: "supporter_id" },
      )
      .select()
      .single();

    if (insertError || !invitation) {
      console.error(insertError);
      setError(
        insertError?.message ?? "招待の作成に失敗しました。",
      );
      setLoading(false);
      return;
    }

    // 2. 承認用リンクを組み立ててメール送信
    const acceptUrl = `${window.location.origin}${window.location.pathname}?invite=${invitation.token}`;

    const result = await sendInviteEmail({
      toEmail: normalizedEmail,
      supporterName: profile.name,
      acceptUrl,
    });

    if (!result.ok) {
      setError(result.error ?? "メール送信に失敗しました。");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm text-center">
          <CheckCircle2 className="mx-auto mb-4 text-sky-400" size={48} />
          <h1 className="text-xl font-extrabold text-sky-500 mb-2">
            招待メールを送信しました
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {email} 宛に招待メールを送信しました。
            <br />
            相手が承認するとペアが成立します。
          </p>
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="text-sky-400 font-bold text-sm underline"
          >
            別のメールアドレスに再送する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-extrabold text-center text-sky-400 mb-2 tracking-wider">
          学習者を招待
        </h1>
        <p className="text-xs text-center text-gray-400 mb-8">
          まだペアが設定されていません。
          <br />
          学習者のメールアドレスを入力して招待しましょう。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              学習者のメールアドレス
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-sky-50 border-none focus:ring-2 focus:ring-sky-300 outline-none transition-all text-gray-700 font-medium"
                placeholder="partner@example.com"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center font-bold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-4 bg-sky-400 text-white font-bold rounded-full shadow-md transform transition-transform duration-100 active:scale-95 hover:bg-sky-500 text-lg tracking-widest disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                招待を送る
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
