export function getEnvContext() {
  // 在 Cloudflare Workers 環境中，環境變數通過 env 參數傳遞
  // 在本地開發環境中，我們可以使用 process.env
  const env = typeof process !== "undefined" ? process.env : {};
  return { env };
}
