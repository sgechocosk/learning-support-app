import { useEffect, useState } from "react";
import { UserRound, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type InvitationInfo = {
  supporter_id: string;
  supporter_name: string;
  invitee_email: string;
  status: string;
  expires_at: string;
};

interface Props {
  token: string;
  onCompleted: () => void;
}

export default function AcceptInvite({ token, onCompleted }: Props) {
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: rawData, error } = await supabase
        .rpc("get_invitation_by_token", { p_token: token })
        .maybeSingle();

      const data = rawData as InvitationInfo | null;

      if (error || !data) {
        setLoadError(
          "招待が見つかりませんでした。リンクが正しいかご確認ください。",
        );
      } else if (data.status !== "pending") {
        setLoadError("この招待は既に使用済みか、無効になっています。");
      } else if (new Date(data.expires_at).getTime() < Date.now()) {
        setLoadError(
          "この招待の有効期限が切れています。支援者に再送を依頼してください。",
        );
      } else {
        setInvitation(data);
      }
      setLoadingInvite(false);
    };
    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitError("");

    if (!name.trim()) {
      setSubmitError("名前を入力してください。");
      return;
    }

    setSubmitting(true);

    // 1. アカウントを作成（既に登録済みならログインにフォールバック）
    let userId: string;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: invitation.invitee_email,
        password,
      },
    );

    if (signUpError) {
      // 既にアカウントが存在する場合（前回の途中失敗などで作成済み）はログインを試みる
      const isAlreadyRegistered =
        signUpError.message.toLowerCase().includes("already registered") ||
        signUpError.status === 422; // Supabaseの重複登録時のステータス

      if (!isAlreadyRegistered) {
        setSubmitError(signUpError.message ?? "登録に失敗しました。");
        setSubmitting(false);
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: invitation.invitee_email,
          password,
        });

      if (signInError || !signInData.user) {
        setSubmitError(
          "このメールアドレスは既に登録されています。パスワードが正しいかご確認ください。",
        );
        setSubmitting(false);
        return;
      }

      userId = signInData.user.id;
    } else if (signUpData.user) {
      userId = signUpData.user.id;
    } else {
      setSubmitError("登録に失敗しました。");
      setSubmitting(false);
      return;
    }

    // 2. プロフィールの名前を更新
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", userId);

    if (profileError) {
      console.error(profileError);
      setSubmitError("名前の更新に失敗しました。");
      setSubmitting(false);
      return;
    }

    // 3. ペアを作成
    const { error: pairError } = await supabase.from("pairs").insert({
      supporter_id: invitation.supporter_id,
      learner_id: userId,
      name: `${invitation.supporter_name}と${name.trim()}のペア`,
    });

    if (pairError) {
      console.error(pairError);
      setSubmitError(
        "ペアの作成に失敗しました。時間を置いて再度お試しください。",
      );
      setSubmitting(false);
      return;
    }

    // 4. 招待ステータスを更新
    await supabase
      .from("pair_invitations")
      .update({ status: "accepted" })
      .eq("token", token);

    setDone(true);
    setSubmitting(false);
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-sky-300 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm text-center">
          <p className="text-red-400 font-bold">{loadError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm text-center">
          <CheckCircle2 className="mx-auto mb-4 text-sky-400" size={48} />
          <h1 className="text-xl font-extrabold text-sky-500 mb-2">
            ペアが成立しました！
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {invitation?.supporter_name}さんとのペアが作成されました。
          </p>
          <button
            onClick={onCompleted}
            className="w-full py-4 bg-sky-400 text-white font-bold rounded-full shadow-md hover:bg-sky-500"
          >
            アプリを始める
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-extrabold text-center text-sky-400 mb-2 tracking-wider">
          招待の承認
        </h1>
        <p className="text-xs text-center text-gray-400 mb-8">
          {invitation?.supporter_name}さんから招待が届いています。
          <br />
          ログインしてペアを完成させましょう。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              メールアドレス
            </label>
            <input
              type="email"
              value={invitation?.invitee_email ?? ""}
              readOnly
              className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none text-gray-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              パスワード
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-sky-50 border-none focus:ring-2 focus:ring-sky-300 outline-none text-gray-700 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              あなたの名前
            </label>
            <div className="relative">
              <UserRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-300"
                size={18}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-sky-50 border-none focus:ring-2 focus:ring-sky-300 outline-none text-gray-700 font-medium"
                placeholder="やまだ たろう"
                required
              />
            </div>
          </div>

          {submitError && (
            <p className="text-red-400 text-xs text-center font-bold">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-4 bg-sky-400 text-white font-bold rounded-full shadow-md transform transition-transform duration-100 active:scale-95 hover:bg-sky-500 text-lg tracking-widest disabled:opacity-50 flex justify-center items-center"
          >
            {submitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "ペアを完成させる"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
