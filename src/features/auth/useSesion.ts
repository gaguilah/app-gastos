import { useContext } from "react";
import { SesionContext } from "./contexto";

export const useSesion = () => useContext(SesionContext);
