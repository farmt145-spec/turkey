export type DailyVisitDraft = {
  status: string;
  observation?: string;
  tempC?: number;
  humidityPct?: number;
  ammoniaPpm?: number;
  bedded?: boolean;
  batchCode?: string;
};

export function buildDailyVisitNote(draft: DailyVisitDraft) {
  const parts = [
    "[OBCHÓD]",
    draft.batchCode ? `Rzut: ${draft.batchCode}` : "",
    `Status: ${draft.status || "OK"}`,
    draft.observation?.trim() ? `Obserwacja: ${draft.observation.trim()}` : "",
    typeof draft.tempC === "number" ? `Temp.: ${draft.tempC.toFixed(1)}°C` : "",
    typeof draft.humidityPct === "number" ? `Wilg.: ${draft.humidityPct.toFixed(1)}%` : "",
    typeof draft.ammoniaPpm === "number" ? `NH₃: ${draft.ammoniaPpm.toFixed(1)} ppm` : "",
    draft.bedded ? "Ściółka: wymieniona / uzupełniona" : "",
  ].filter(Boolean);

  return parts.join(" | ").slice(0, 500);
}
