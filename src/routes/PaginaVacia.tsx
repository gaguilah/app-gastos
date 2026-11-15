import { useTranslation } from "react-i18next";

export function PaginaVacia() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-bold">{t("app.nombre")}</h1>
      <p>{t("app.enPreparacion")}</p>
    </main>
  );
}
