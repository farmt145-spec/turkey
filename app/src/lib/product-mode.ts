export type ProductMode = "demo" | "production";

const MODE_KEY = "bt_product_mode";

export function getProductMode(): ProductMode {
  const saved = typeof window !== "undefined" ? localStorage.getItem(MODE_KEY) : null;
  if (saved === "demo" || saved === "production") return saved;
  return "demo";
}

export function setProductMode(mode: ProductMode) {
  localStorage.setItem(MODE_KEY, mode);
  window.location.reload();
}

export function productModeLabel(mode: ProductMode) {
  return mode === "demo" ? "OTWARTY WORKSPACE — przykłady + własna firma" : "PRODUCTION — dane firmy";
}
