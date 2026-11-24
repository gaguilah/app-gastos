import { useTranslation } from "react-i18next";

// shortcut: pantalla mínima para la tarea 3; la tarea 4 construye el login del diseño.
export function Login() {
  const { t } = useTranslation();
  return (
    <main className="p-xl">
      <h1 className="text-headline-md">{t("login.titulo")}</h1>
    </main>
  );
}
