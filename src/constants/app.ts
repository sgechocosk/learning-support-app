// アプリ全体で共有するブランド名。
//
// 用途:
// 1. Header.tsx: ペア名が未設定のときのデフォルト表示名
// 2. send-push Edge Function (supabase/functions/send-push/index.ts):
//    Web Push通知の本文に入れる「from [アプリ名]」の行
//    （Edge FunctionはこのフロントエンドのDenoランタイムとは別プロジェクトのため
//    直接このファイルをimportできない。Edge Function側はSecret
//    `APP_NAME` を持ち、未設定時のデフォルト値をここと同じ文字列に
//    揃えている。この文字列を変更する場合は、Edge Function側の
//    デフォルト値、またはSecretの値も合わせて変更すること）
export const APP_NAME = "学習支援アプリ";
