-- Etapa 3 · Series de fechas de gastos periódicos (3.6) y aportes (3.15). Issue #8, supuestos 9 y 10.
-- La fecha n (desde 0) se calcula desde el inicio y el número de repetición, nunca sumando a la fecha
-- anterior ya ajustada: así el mensual del 31 vuelve al 31 después de febrero.
-- p_dia es el día del mes en las frecuencias mensuales y quincenal; si es nulo, el de p_inicio.
-- p_intervalo solo aplica a cada_n_dias, cada_n_semanas y cada_n_meses.
create function public.fecha_serie(
  p_frecuencia text,
  p_intervalo integer,
  p_dia integer,
  p_inicio date,
  p_n integer
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_dia integer := coalesce(p_dia, extract(day from p_inicio)::integer);
  v_meses integer;
  v_a integer;
  v_b integer;
  v_k integer;
  v_mes date;
begin
  if p_n is null or p_n < 0 then
    raise exception 'serie.numero_invalido' using errcode = 'P0001';
  end if;

  case p_frecuencia
    when 'diaria' then return p_inicio + p_n;
    when 'cada_n_dias' then return p_inicio + p_n * p_intervalo;
    when 'semanal' then return p_inicio + 7 * p_n;
    when 'cada_n_semanas' then return p_inicio + 7 * p_n * p_intervalo;
    when 'mensual' then v_meses := 1;
    when 'bimestral' then v_meses := 2;
    when 'trimestral' then v_meses := 3;
    when 'anual' then v_meses := 12;
    when 'cada_n_meses' then v_meses := p_intervalo;
    when 'quincenal' then
      -- Dos días por mes: D y D + 15, o D − 15 y D si D + 15 no cabe en el mes.
      if v_dia + 15 <= 31 then
        v_a := v_dia; v_b := v_dia + 15;
      else
        v_a := v_dia - 15; v_b := v_dia;
      end if;
      v_mes := date_trunc('month', p_inicio)::date;
      -- Fechas de la serie del mes de inicio que quedan antes de p_inicio.
      v_k := p_n
           + (case when public.dia_en_mes(v_mes, v_a) < p_inicio then 1 else 0 end)
           + (case when public.dia_en_mes(v_mes, v_b) < p_inicio then 1 else 0 end);
      v_mes := (v_mes + make_interval(months => v_k / 2))::date;
      return public.dia_en_mes(v_mes, case when v_k % 2 = 0 then v_a else v_b end);
    else
      raise exception 'serie.frecuencia_invalida' using errcode = 'P0001';
  end case;

  -- Si el día del mes de inicio ya pasó, la serie empieza el mes siguiente.
  v_mes := date_trunc('month', p_inicio)::date;
  if public.dia_en_mes(v_mes, v_dia) < p_inicio then
    v_mes := (v_mes + interval '1 month')::date;
  end if;
  return public.dia_en_mes((v_mes + make_interval(months => p_n * v_meses))::date, v_dia);
end;
$$;

revoke all on function public.fecha_serie(text, integer, integer, date, integer) from public, anon;
grant execute on function public.fecha_serie(text, integer, integer, date, integer) to authenticated;
