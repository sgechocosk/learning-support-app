export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-sky-200 rounded-3xl shadow-sm w-full max-w-sm">
        <div className="text-5xl mb-4 animate-bounce">🏠</div>
        <h1 className="text-xl font-bold text-sky-600 mb-2">ホーム</h1>
        <p className="text-sm text-sky-600/70 font-medium bg-sky-50 px-4 py-2 rounded-full mb-6">
          🚧 現在、工事中です 🚧
        </p>

        <div className="w-full">
          <ul className="space-y-4 text-sm text-sky-700 bg-sky-50/50 p-5 rounded-2xl">
            <li>
              <div className="font-bold flex items-center gap-2 mb-1">
                <span className="text-base">・</span> タスク
              </div>
              <div className="text-xs text-sky-600/80 pl-5">
                やるべきことを完了していちごゲット！
              </div>
            </li>
            <li>
              <div className="font-bold flex items-center gap-2 mb-1">
                <span className="text-base">・</span> タイマー
              </div>
              <div className="text-xs text-sky-600/80 pl-5">
                集中した時間でいちごゲット！
              </div>
            </li>
            <li>
              <div className="font-bold flex items-center gap-2 mb-1">
                <span className="text-base">・</span> ごほうび
              </div>
              <div className="text-xs text-sky-600/80 pl-5">
                貯めたいちごでごほうびをゲット！
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
