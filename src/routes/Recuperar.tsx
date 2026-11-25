import { useState, type FormEvent } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { supabase } from "@/datos/supabase";
import { Alert } from "@/components/ui/alert";
import { TarjetaAuth } from "@/features/auth/components/TarjetaAuth";
import { Campo } from "@/components/shared/Campo";
import { BotonEnviar } from "@/features/auth/components/BotonEnviar";
import { claveErrorLogin } from "@/features/auth/errores";

const claseEnlace =
  "inline-flex min-h-touch items-center self-center rounded-control px-sm text-body-md text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

/** Pide el enlace de recuperación. Responde lo mismo exista o no el correo. */
export function Recuperar() {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<"normal" | "enviando" | "enviado">("normal");
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado === "enviando") return;
    const correo = String(new FormData(evento.currentTarget).get("correo")).trim();
    setEstado("enviando");
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/nueva-contrasena`,
      });
      // Solo se avisan los fallos de red o de límite; cualquier otro se calla para no revelar cuentas.
      const clave = error ? claveErrorLogin(error) : null;
      if (clave === "login.error.sinRed" || clave === "login.error.demasiadosIntentos") {
        setError(clave);
        setEstado("normal");
      } else {
        setEstado("enviado");
      }
    } catch (e) {
      setError(claveErrorLogin(e));
      setEstado("normal");
    }
  }

  return (
    <TarjetaAuth titulo={t("recuperar.titulo")} ayuda={t("recuperar.ayuda")}>
      {estado === "enviado" ? (
        <Alert variant="success" role="status">
          <MailCheck aria-hidden="true" />
          <span>{t("recuperar.enviado")}</span>
        </Alert>
      ) : (
        <>
          {error && (
            <Alert variant="error">
              <CircleAlert aria-hidden="true" />
              <span>{t(error)}</span>
            </Alert>
          )}
          <form className="flex flex-col gap-md" onSubmit={enviar}>
            <Campo
              etiqueta={t("login.correo")}
              name="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
            <BotonEnviar enviando={estado === "enviando"} textoEnviando={t("recuperar.enviando")}>
              {t("recuperar.enviar")}
            </BotonEnviar>
          </form>
        </>
      )}
      <Link to="/login" className={claseEnlace}>
        {t("recuperar.volver")}
      </Link>
    </TarjetaAuth>
  );
}
