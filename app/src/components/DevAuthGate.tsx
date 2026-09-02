import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { getProductMode } from "@/lib/product-mode";

/* Demo auth bootstrap.
   Wykrywa brak ważnej sesji przez publiczną sondę /api/dev-login (HEAD-like GET
   z redirect:'manual'): 302 => sesja już jest albo dev-login dostępny; 404 => produkcja
   (endpoint nie istnieje) => nie robimy nic. Gdy brak sesji w dev: pokazuje ekran
   „Sesja wygasła — logowanie developerskie…” i przechodzi przez /api/dev-login
   (backend ustawia bezpieczne cookie sesyjne i wraca na "/", a my wracamy na pierwotną stronę
   i odświeżamy zapytania tRPC). */

const DEV = import.meta.env.DEV;
const AUTO_LOGIN = DEV || getProductMode() === "demo";
const DEMO_LOGIN_PATH = DEV ? "/api/dev-login" : "/api/demo-login";
const PENDING_KEY = "bte_dev_auth_pending";

export default function DevAuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(AUTO_LOGIN);
  const location = useLocation();

  useEffect(() => {
    if (!AUTO_LOGIN) return;

    // Powrót z dev-login: sesja jest -> przywróć pierwotną stronę i pozwól
    // komponentom ponownie wykonać zapytania tRPC z aktualną sesją.
    if (sessionStorage.getItem(PENDING_KEY)) {
      sessionStorage.removeItem(PENDING_KEY);
      const ret = sessionStorage.getItem("bte_dev_auth_return");
      sessionStorage.removeItem("bte_dev_auth_return");
      setChecking(false);
      if (ret && ret !== "/" && ret !== location.pathname) {
        window.location.replace(ret); // full reload -> tRPC refetch z sesją
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Sonda sesji: authed endpoint bez cookie -> 401; z cookie -> 200/302.
        // Używamy /api/dev-login z redirect:manual — 302 oznacza, że endpoint istnieje
        // i ustawił sesję (dev). W production endpoint nie istnieje (404) -> abort.
        const probe = await fetch("/api/trpc/org.structure?input=%7B%22json%22%3A%7B%7D%7D", {
          credentials: "include",
        });
        if (cancelled) return;
        if (probe.status === 401 || probe.status === 403) {
          // brak ważnej sesji -> sprawdź, czy dev-login jest dostępny (tylko dev)
          const dl = await fetch(DEMO_LOGIN_PATH, { redirect: "manual", credentials: "include" });
          if (cancelled) return;
          if (dl.status === 404) {
            setChecking(false);
            return;
          }
          // oznacz powrót i przekieruj na pierwotną stronę po zalogowaniu
          sessionStorage.setItem(PENDING_KEY, "1");
          sessionStorage.setItem("bte_dev_auth_return", location.pathname + location.search || "/");
          window.location.assign(DEMO_LOGIN_PATH);
          return;
        }
        setChecking(false); // sesja jest albo endpoint publiczny
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (AUTO_LOGIN && checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
          <p className="text-sm">Sesja wygasła — logowanie developerskie…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
