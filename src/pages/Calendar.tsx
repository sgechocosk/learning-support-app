export default function Calendar() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-sky-200 rounded-3xl shadow-sm w-full max-w-sm">
        <div className="text-5xl mb-4 animate-bounce">🗓️</div>
        <h1 className="text-xl font-bold text-sky-600 mb-2">カレンダー</h1>
        <p className="text-sm text-sky-600/70 font-medium bg-sky-50 px-4 py-2 rounded-full">
          🚧 現在、工事中です 🚧
        </p>
      </div>
    </div>
  );
}
