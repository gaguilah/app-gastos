import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/datos/supabase";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CargandoApp } from "@/components/shared/CargandoApp";
import { TarjetaAuth } from "@/features/auth/components/TarjetaAuth";
import { Campo } from "@/components/shared/Campo";
import { BotonEnviar } from "@/features/auth/components/BotonEnviar";
import { validarNuevaContrasena } from "@/features/auth/contrasena";
import { claveErrorLogin } from "@/features/auth/errores";
import { useSesion } from "@/features/auth/useSesion";

/** Destino del enlace del correo: solo sirve con la sesión de recuperación que abre ese enlace. */
export function NuevaContrasena() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const { cargando, recuperando } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (cargando) return <CargandoApp />;

  if (!recuperando) {
    return (
      <TarjetaAuth titulo={t("recuperar.nueva.titulo")} ayuda={t("recuperar.nueva.ayuda")}>
        <Alert variant="error">
          <CircleAlert aria-hidden="true" />
          <span>{t("recuperar.error.enlaceVencido")}</span>
        </Alert>
        <Button asChild className="min-h-campo w-full">
          <Link to="/recuperar">{t("recuperar.nueva.pedirOtro")}</Link>
        </Button>
      </TarjetaAuth>
    );
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const datos = new FormData(evento.currentTarget);
    const contrasena = String(datos.get("contrasena"));
    const invalida = validarNuevaContrasena(contrasena, String(datos.get("confirmacion")));
    setError(invalida);
    setErrorServidor(null);
    if (invalida) return;
    setGuardando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: contrasena });
      if (error) {
        const clave = claveErrorLogin(error);
        setErrorServidor(clave === "login.error.desconocido" ? "recuperar.error.guardar" : clave);
      } else {
        await navegar("/", { replace: true });
      }
    } catch (e) {
      setErrorServidor(claveErrorLogin(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <TarjetaAuth titulo={t("recuperar.nueva.titulo")} ayuda={t("recuperar.nueva.ayuda")}>
      {errorServidor && (
        <Alert variant="error">
          <CircleAlert aria-hidden="true" />
          <span>{t(errorServidor)}</span>
        </Alert>
      )}
      <form className="flex flex-col gap-md" onSubmit={guardar} noValidate>
        <Campo
          etiqueta={t("recuperar.nueva.contrasena")}
          name="contrasena"
          type="password"
          autoComplete="new-password"
          required
          error={error === "recuperar.error.corta" ? t(error) : null}
        />
        <Campo
          etiqueta={t("recuperar.nueva.confirmar")}
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          error={error === "recuperar.error.noCoinciden" ? t(error) : null}
        />
        <BotonEnviar enviando={guardando} textoEnviando={t("recuperar.nueva.guardando")}>
          {t("recuperar.nueva.guardar")}
        </BotonEnviar>
      </form>
    </TarjetaAuth>
  );
}
