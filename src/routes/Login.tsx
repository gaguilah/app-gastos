import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { supabase } from "@/datos/supabase";
import { Alert } from "@/components/ui/alert";
import { TarjetaAuth } from "@/features/auth/components/TarjetaAuth";
import { Campo } from "@/features/auth/components/Campo";
import { BotonEnviar } from "@/features/auth/components/BotonEnviar";
import { claveErrorLogin } from "@/features/auth/errores";

/** Login: solo correo y contraseña, sin registro. Al entrar, SoloSinSesion lleva a la ruta pedida. */
export function Login() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(datos.get("correo")).trim(),
        password: String(datos.get("contrasena")),
      });
      if (error) setError(claveErrorLogin(error));
    } catch (e) {
      setError(claveErrorLogin(e));
    } finally {
      setEnviando(false);
    }
  }

  const credenciales = error === "login.error.credenciales";

  return (
    <TarjetaAuth titulo={t("login.titulo")} ayuda={t("login.ayuda")}>
      {error && (
        <Alert variant="error">
          <CircleAlert aria-hidden="true" />
          <span>{t(error)}</span>
        </Alert>
      )}
      <form className="flex flex-col gap-md" onSubmit={entrar} noValidate={false}>
        <Campo
          etiqueta={t("login.correo")}
          name="correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          invalido={credenciales}
        />
        <Campo
          etiqueta={t("login.contrasena")}
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          invalido={credenciales}
        />
        <BotonEnviar enviando={enviando} textoEnviando={t("login.entrando")}>
          {t("login.entrar")}
        </BotonEnviar>
      </form>
      <Link
        to="/recuperar"
        className="inline-flex min-h-touch items-center self-center rounded-control px-sm text-body-md text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("login.olvide")}
      </Link>
    </TarjetaAuth>
  );
}
