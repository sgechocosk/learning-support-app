import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

type Props = {
  onLoginSuccess?: () => void;
};

export default function Auth({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("ログインに失敗しました。入力内容をご確認ください。");
    } else {
      localStorage.setItem("is_logged_in", "true");
      if (onLoginSuccess) onLoginSuccess();
    }
    setLoading(false);
  };

  return (
    // 前面を水色背景 (bg-sky-300) で塗りつぶす
    <div className="min-h-screen bg-sky-300 flex items-center justify-center p-4 font-sans select-none">
      {/* ログインフォームのカード（丸みを持たせてかわいらしく） */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm">
        {/* LOGIN タイトル */}
        <h1 className="text-3xl font-extrabold text-center text-sky-400 mb-8 tracking-wider">
          LOGIN
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* USER ID 入力欄 */}
          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              USER ID
            </label>
            <input
              type="email" // Supabase標準のIDはメールアドレスのため email を指定
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-sky-50 border-none focus:ring-2 focus:ring-sky-300 outline-none transition-all text-gray-700 font-medium"
              placeholder="id@example.com"
              required
            />
          </div>

          {/* PASSWORD 入力欄 */}
          <div>
            <label className="block text-xs font-bold text-sky-300 mb-2 pl-2 tracking-wide">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-sky-50 border-none focus:ring-2 focus:ring-sky-300 outline-none transition-all text-gray-700 font-medium"
              placeholder="••••••••"
              required
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <p className="text-red-400 text-xs text-center font-bold mt-2">
              {error}
            </p>
          )}

          {/* ENTER ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-4 bg-sky-400 text-white font-bold rounded-full shadow-md transform transition-transform duration-100 active:scale-95 hover:bg-sky-500 text-lg tracking-widest disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "ENTER"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
