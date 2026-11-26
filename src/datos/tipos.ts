export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      abonos_deuda: {
        Row: {
          created_at: string;
          deuda_id: string;
          fecha: string;
          id: string;
          nota: string | null;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deuda_id: string;
          fecha: string;
          id?: string;
          nota?: string | null;
          user_id?: string;
          valor: number;
        };
        Update: {
          created_at?: string;
          deuda_id?: string;
          fecha?: string;
          id?: string;
          nota?: string | null;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "abonos_deuda_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "deudas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "abonos_deuda_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "estado_deudas";
            referencedColumns: ["deuda_id", "user_id"];
          },
        ];
      };
      alertas_enviadas: {
        Row: {
          created_at: string;
          enviada_at: string;
          id: string;
          periodo_id: string;
          umbral: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enviada_at?: string;
          id?: string;
          periodo_id: string;
          umbral: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          enviada_at?: string;
          id?: string;
          periodo_id?: string;
          umbral?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alertas_enviadas_periodo_id_user_id_fkey";
            columns: ["periodo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "disponible_periodo";
            referencedColumns: ["periodo_id", "user_id"];
          },
          {
            foreignKeyName: "alertas_enviadas_periodo_id_user_id_fkey";
            columns: ["periodo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "periodos";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      bolsas: {
        Row: {
          archivada: boolean;
          created_at: string;
          forma_pago_id: string | null;
          id: string;
          nombre: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archivada?: boolean;
          created_at?: string;
          forma_pago_id?: string | null;
          id?: string;
          nombre: string;
          user_id?: string;
        };
        Update: {
          archivada?: boolean;
          created_at?: string;
          forma_pago_id?: string | null;
          id?: string;
          nombre?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bolsas_forma_pago_id_user_id_fkey";
            columns: ["forma_pago_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "bolsas_forma_pago_id_user_id_fkey";
            columns: ["forma_pago_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
        ];
      };
      categorias: {
        Row: {
          archivada: boolean;
          clave_sistema: string | null;
          color: string | null;
          created_at: string;
          icono: string | null;
          id: string;
          nombre: string;
          padre_id: string | null;
          tipo: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archivada?: boolean;
          clave_sistema?: string | null;
          color?: string | null;
          created_at?: string;
          icono?: string | null;
          id?: string;
          nombre: string;
          padre_id?: string | null;
          tipo: string;
          user_id?: string;
        };
        Update: {
          archivada?: boolean;
          clave_sistema?: string | null;
          color?: string | null;
          created_at?: string;
          icono?: string | null;
          id?: string;
          nombre?: string;
          padre_id?: string | null;
          tipo?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_padre_id_user_id_fkey";
            columns: ["padre_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "categorias_padre_id_user_id_fkey";
            columns: ["padre_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
        ];
      };
      cuotas_deuda: {
        Row: {
          created_at: string;
          deuda_id: string;
          fecha: string;
          id: string;
          numero: number;
          pagada_at: string | null;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deuda_id: string;
          fecha: string;
          id?: string;
          numero: number;
          pagada_at?: string | null;
          user_id?: string;
          valor: number;
        };
        Update: {
          created_at?: string;
          deuda_id?: string;
          fecha?: string;
          id?: string;
          numero?: number;
          pagada_at?: string | null;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cuotas_deuda_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "deudas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "cuotas_deuda_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "estado_deudas";
            referencedColumns: ["deuda_id", "user_id"];
          },
        ];
      };
      deudas: {
        Row: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          canal_id: string | null;
          categoria_id: string;
          created_at: string;
          dia_pago: number;
          fecha: string;
          id: string;
          medio_id: string | null;
          nota: string | null;
          num_cuotas: number;
          persona_id: string;
          total_pagar: number;
          user_id: string;
          valor_cuota: number;
        };
        ComputedFields: never;
        Insert: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_id: string;
          created_at?: string;
          dia_pago: number;
          fecha?: string;
          id?: string;
          medio_id?: string | null;
          nota?: string | null;
          num_cuotas: number;
          persona_id: string;
          total_pagar: number;
          user_id?: string;
          valor_cuota: number;
        };
        Update: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_id?: string;
          created_at?: string;
          dia_pago?: number;
          fecha?: string;
          id?: string;
          medio_id?: string | null;
          nota?: string | null;
          num_cuotas?: number;
          persona_id?: string;
          total_pagar?: number;
          user_id?: string;
          valor_cuota?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deudas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "deudas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "deudas_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "deudas_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
          {
            foreignKeyName: "deudas_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "deudas_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "personas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_personas";
            referencedColumns: ["persona_id", "user_id"];
          },
        ];
      };
      formas_pago: {
        Row: {
          archivada: boolean;
          clase: string;
          created_at: string;
          id: string;
          nombre: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archivada?: boolean;
          clase: string;
          created_at?: string;
          id?: string;
          nombre: string;
          user_id?: string;
        };
        Update: {
          archivada?: boolean;
          clase?: string;
          created_at?: string;
          id?: string;
          nombre?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          canal_id: string | null;
          categoria_color: string | null;
          categoria_icono: string | null;
          categoria_id: string;
          categoria_nombre: string;
          created_at: string;
          cuota_id: string | null;
          descripcion: string | null;
          es_ajuste: boolean;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          lugar_id: string | null;
          medio_id: string | null;
          prestamo_id: string | null;
          regla_id: string | null;
          saldo_real: number | null;
          subcategoria_id: string | null;
          subcategoria_nombre: string | null;
          titulo: string;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_color?: string | null;
          categoria_icono?: string | null;
          categoria_id: string;
          categoria_nombre: string;
          created_at?: string;
          cuota_id?: string | null;
          descripcion?: string | null;
          es_ajuste?: boolean;
          estado?: string;
          fecha: string;
          fecha_programada?: string | null;
          id?: string;
          lugar_id?: string | null;
          medio_id?: string | null;
          prestamo_id?: string | null;
          regla_id?: string | null;
          saldo_real?: number | null;
          subcategoria_id?: string | null;
          subcategoria_nombre?: string | null;
          titulo: string;
          user_id?: string;
          valor: number;
        };
        Update: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_color?: string | null;
          categoria_icono?: string | null;
          categoria_id?: string;
          categoria_nombre?: string;
          created_at?: string;
          cuota_id?: string | null;
          descripcion?: string | null;
          es_ajuste?: boolean;
          estado?: string;
          fecha?: string;
          fecha_programada?: string | null;
          id?: string;
          lugar_id?: string | null;
          medio_id?: string | null;
          prestamo_id?: string | null;
          regla_id?: string | null;
          saldo_real?: number | null;
          subcategoria_id?: string | null;
          subcategoria_nombre?: string | null;
          titulo?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gastos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_cuota_id_user_id_fkey";
            columns: ["cuota_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "cuotas_deuda";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_lugar_id_user_id_fkey";
            columns: ["lugar_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lugares";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_lugar_id_user_id_fkey";
            columns: ["lugar_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_lugares";
            referencedColumns: ["lugar_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_prestamo_id_user_id_fkey";
            columns: ["prestamo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "estado_prestamos";
            referencedColumns: ["prestamo_id", "user_id"];
          },
          {
            foreignKeyName: "gastos_prestamo_id_user_id_fkey";
            columns: ["prestamo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "prestamos";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_regla_id_user_id_fkey";
            columns: ["regla_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reglas_periodicas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "gastos_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
        ];
      };
      ingresos: {
        Row: {
          bolsa_id: string | null;
          categoria_color: string | null;
          categoria_icono: string | null;
          categoria_id: string;
          categoria_nombre: string;
          created_at: string;
          cuenta_estadisticas: boolean;
          descripcion: string | null;
          deuda_id: string | null;
          fecha: string;
          id: string;
          prestamo_id: string | null;
          subcategoria_id: string | null;
          subcategoria_nombre: string | null;
          titulo: string;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          bolsa_id?: string | null;
          categoria_color?: string | null;
          categoria_icono?: string | null;
          categoria_id: string;
          categoria_nombre: string;
          created_at?: string;
          cuenta_estadisticas?: boolean;
          descripcion?: string | null;
          deuda_id?: string | null;
          fecha: string;
          id?: string;
          prestamo_id?: string | null;
          subcategoria_id?: string | null;
          subcategoria_nombre?: string | null;
          titulo: string;
          user_id?: string;
          valor: number;
        };
        Update: {
          bolsa_id?: string | null;
          categoria_color?: string | null;
          categoria_icono?: string | null;
          categoria_id?: string;
          categoria_nombre?: string;
          created_at?: string;
          cuenta_estadisticas?: boolean;
          descripcion?: string | null;
          deuda_id?: string | null;
          fecha?: string;
          id?: string;
          prestamo_id?: string | null;
          subcategoria_id?: string | null;
          subcategoria_nombre?: string | null;
          titulo?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ingresos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "deudas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_deuda_id_user_id_fkey";
            columns: ["deuda_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "estado_deudas";
            referencedColumns: ["deuda_id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_prestamo_id_user_id_fkey";
            columns: ["prestamo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "estado_prestamos";
            referencedColumns: ["prestamo_id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_prestamo_id_user_id_fkey";
            columns: ["prestamo_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "prestamos";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ingresos_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
        ];
      };
      lugares: {
        Row: {
          archivado: boolean;
          created_at: string;
          id: string;
          nombre: string;
          nombre_normalizado: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archivado?: boolean;
          created_at?: string;
          id?: string;
          nombre: string;
          nombre_normalizado?: never;
          user_id?: string;
        };
        Update: {
          archivado?: boolean;
          created_at?: string;
          id?: string;
          nombre?: string;
          nombre_normalizado?: never;
          user_id?: string;
        };
        Relationships: [];
      };
      metas_ahorro: {
        Row: {
          bolsa_id: string;
          created_at: string;
          eliminada_at: string | null;
          fecha_final: string;
          icono: string;
          id: string;
          monto_meta: number;
          nombre: string;
          pausada: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bolsa_id: string;
          created_at?: string;
          eliminada_at?: string | null;
          fecha_final: string;
          icono?: string;
          id?: string;
          monto_meta: number;
          nombre: string;
          pausada?: boolean;
          user_id?: string;
        };
        Update: {
          bolsa_id?: string;
          created_at?: string;
          eliminada_at?: string | null;
          fecha_final?: string;
          icono?: string;
          id?: string;
          monto_meta?: number;
          nombre?: string;
          pausada?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metas_ahorro_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "metas_ahorro_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "metas_ahorro_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
        ];
      };
      movimientos_bolsa: {
        Row: {
          afecta_presupuesto: boolean;
          bolsa_id: string;
          created_at: string;
          enlace_id: string | null;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          medio_id: string | null;
          meta_id: string | null;
          nota: string | null;
          regla_aporte_id: string | null;
          saldo_real: number | null;
          sentido: string;
          tipo: string;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          afecta_presupuesto?: boolean;
          bolsa_id: string;
          created_at?: string;
          enlace_id?: string | null;
          estado?: string;
          fecha: string;
          fecha_programada?: string | null;
          id?: string;
          medio_id?: string | null;
          meta_id?: string | null;
          nota?: string | null;
          regla_aporte_id?: string | null;
          saldo_real?: number | null;
          sentido: string;
          tipo: string;
          user_id?: string;
          valor: number;
        };
        Update: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string;
          created_at?: string;
          enlace_id?: string | null;
          estado?: string;
          fecha?: string;
          fecha_programada?: string | null;
          id?: string;
          medio_id?: string | null;
          meta_id?: string | null;
          nota?: string | null;
          regla_aporte_id?: string | null;
          saldo_real?: number | null;
          sentido?: string;
          tipo?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_bolsa_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_enlace_id_user_id_fkey";
            columns: ["enlace_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "movimientos_bolsa";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_meta_id_user_id_fkey";
            columns: ["meta_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "metas_ahorro";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movimientos_bolsa_regla_aporte_id_user_id_fkey";
            columns: ["regla_aporte_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "reglas_aporte";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      pares_distintos: {
        Row: {
          a_id: string;
          b_id: string;
          created_at: string;
          entidad: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          a_id: string;
          b_id: string;
          created_at?: string;
          entidad: string;
          id?: string;
          user_id?: string;
        };
        Update: {
          a_id?: string;
          b_id?: string;
          created_at?: string;
          entidad?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      perfiles: {
        Row: {
          created_at: string;
          dia_inicio: number;
          id: string;
          idioma: string;
          nombre: string | null;
          presupuesto_defecto: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dia_inicio?: number;
          id?: string;
          idioma?: string;
          nombre?: string | null;
          presupuesto_defecto?: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          dia_inicio?: number;
          id?: string;
          idioma?: string;
          nombre?: string | null;
          presupuesto_defecto?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      periodos: {
        Row: {
          cerrado_at: string | null;
          created_at: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          nota_presupuesto: string | null;
          presupuesto: number;
          resumen: Json | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cerrado_at?: string | null;
          created_at?: string;
          fecha_fin: string;
          fecha_inicio: string;
          id?: string;
          nota_presupuesto?: string | null;
          presupuesto: number;
          resumen?: Json | null;
          user_id?: string;
        };
        Update: {
          cerrado_at?: string | null;
          created_at?: string;
          fecha_fin?: string;
          fecha_inicio?: string;
          id?: string;
          nota_presupuesto?: string | null;
          presupuesto?: number;
          resumen?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      personas: {
        Row: {
          archivada: boolean;
          created_at: string;
          id: string;
          nombre: string;
          nombre_normalizado: string | null;
          tipo: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archivada?: boolean;
          created_at?: string;
          id?: string;
          nombre: string;
          nombre_normalizado?: never;
          tipo: string;
          user_id?: string;
        };
        Update: {
          archivada?: boolean;
          created_at?: string;
          id?: string;
          nombre?: string;
          nombre_normalizado?: never;
          tipo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      prestamos: {
        Row: {
          created_at: string;
          fecha: string;
          fecha_acordada: string | null;
          id: string;
          monto: number;
          no_recuperado: boolean;
          nota: string | null;
          persona_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          fecha: string;
          fecha_acordada?: string | null;
          id?: string;
          monto: number;
          no_recuperado?: boolean;
          nota?: string | null;
          persona_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          fecha?: string;
          fecha_acordada?: string | null;
          id?: string;
          monto?: number;
          no_recuperado?: boolean;
          nota?: string | null;
          persona_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prestamos_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "personas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "prestamos_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_personas";
            referencedColumns: ["persona_id", "user_id"];
          },
        ];
      };
      reglas_aporte: {
        Row: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          created_at: string;
          dia: number | null;
          frecuencia: string;
          id: string;
          medio_id: string | null;
          meta_id: string;
          pausada: boolean;
          proxima_fecha: string;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          created_at?: string;
          dia?: number | null;
          frecuencia: string;
          id?: string;
          medio_id?: string | null;
          meta_id: string;
          pausada?: boolean;
          proxima_fecha: string;
          user_id?: string;
          valor: number;
        };
        Update: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          created_at?: string;
          dia?: number | null;
          frecuencia?: string;
          id?: string;
          medio_id?: string | null;
          meta_id?: string;
          pausada?: boolean;
          proxima_fecha?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reglas_aporte_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_aporte_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_aporte_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_aporte_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_aporte_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_aporte_meta_id_user_id_fkey";
            columns: ["meta_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "metas_ahorro";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      reglas_periodicas: {
        Row: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          canal_id: string | null;
          categoria_id: string;
          created_at: string;
          descripcion: string | null;
          dia: number | null;
          fecha_inicio: string;
          frecuencia: string;
          id: string;
          intervalo: number;
          lugar_id: string | null;
          medio_id: string | null;
          pausada: boolean;
          proxima_fecha: string;
          repeticiones: number | null;
          subcategoria_id: string | null;
          titulo: string;
          user_id: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_id: string;
          created_at?: string;
          descripcion?: string | null;
          dia?: number | null;
          fecha_inicio: string;
          frecuencia: string;
          id?: string;
          intervalo?: number;
          lugar_id?: string | null;
          medio_id?: string | null;
          pausada?: boolean;
          proxima_fecha: string;
          repeticiones?: number | null;
          subcategoria_id?: string | null;
          titulo: string;
          user_id?: string;
          valor: number;
        };
        Update: {
          afecta_presupuesto?: boolean;
          bolsa_id?: string | null;
          canal_id?: string | null;
          categoria_id?: string;
          created_at?: string;
          descripcion?: string | null;
          dia?: number | null;
          fecha_inicio?: string;
          frecuencia?: string;
          id?: string;
          intervalo?: number;
          lugar_id?: string | null;
          medio_id?: string | null;
          pausada?: boolean;
          proxima_fecha?: string;
          repeticiones?: number | null;
          subcategoria_id?: string | null;
          titulo?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reglas_periodicas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bolsas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "saldos_bolsa";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_bolsa_id_user_id_fkey";
            columns: ["bolsa_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_bolsas";
            referencedColumns: ["bolsa_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_canal_id_user_id_fkey";
            columns: ["canal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_categoria_id_user_id_fkey";
            columns: ["categoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_lugar_id_user_id_fkey";
            columns: ["lugar_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "lugares";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_lugar_id_user_id_fkey";
            columns: ["lugar_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_lugares";
            referencedColumns: ["lugar_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "formas_pago";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_medio_id_user_id_fkey";
            columns: ["medio_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_formas_pago";
            referencedColumns: ["forma_pago_id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "reglas_periodicas_subcategoria_id_user_id_fkey";
            columns: ["subcategoria_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_categorias";
            referencedColumns: ["categoria_id", "user_id"];
          },
        ];
      };
      suscripciones_push: {
        Row: {
          claves: NonNullable<Json>;
          created_at: string;
          dispositivo: string | null;
          endpoint: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          claves: NonNullable<Json>;
          created_at?: string;
          dispositivo?: string | null;
          endpoint: string;
          id?: string;
          user_id?: string;
        };
        Update: {
          claves?: NonNullable<Json>;
          created_at?: string;
          dispositivo?: string | null;
          endpoint?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      disponible_periodo: {
        Row: {
          aportes_presupuesto: number | null;
          disponible: number | null;
          fecha_fin: string;
          fecha_inicio: string;
          gastado: number | null;
          ingresos_presupuesto: number | null;
          periodo_id: string;
          presupuesto: number;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
      estado_deudas: {
        Row: {
          abonos: number | null;
          cuotas_pagadas: number | null;
          deuda_id: string;
          estado: string | null;
          fecha_ultima_cuota: string | null;
          num_cuotas: number;
          pagado_cuotas: number | null;
          persona_id: string;
          proxima_cuota: string | null;
          saldo: number | null;
          total_pagar: number;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "deudas_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "personas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "deudas_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_personas";
            referencedColumns: ["persona_id", "user_id"];
          },
        ];
      };
      estado_prestamos: {
        Row: {
          cobrado: number | null;
          estado: string | null;
          fecha: string;
          fecha_acordada: string | null;
          monto: number;
          no_recuperado: boolean;
          persona_id: string;
          prestamo_id: string;
          saldo: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "prestamos_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "personas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "prestamos_persona_id_user_id_fkey";
            columns: ["persona_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "uso_personas";
            referencedColumns: ["persona_id", "user_id"];
          },
        ];
      };
      movimientos_de_bolsa: {
        Row: {
          bolsa_id: string | null;
          contraparte: string | null;
          created_at: string | null;
          fecha: string | null;
          id: string | null;
          meta_id: string | null;
          tipo: string | null;
          titulo: string | null;
          user_id: string | null;
          valor: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      saldos_bolsa: {
        Row: {
          bolsa_id: string;
          saldo: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bolsa_id?: string | null;
          saldo?: never;
          user_id?: string | null;
        };
        Update: {
          bolsa_id?: string | null;
          saldo?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      uso_bolsas: {
        Row: {
          bolsa_id: string;
          en_uso_por_reglas: boolean | null;
          ultimo: string | null;
          ultimo_tipo: string | null;
          ultimo_titulo: string | null;
          user_id: string;
          usos: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      uso_categorias: {
        Row: {
          categoria_id: string;
          ultimo: string | null;
          user_id: string;
          usos: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      uso_formas_pago: {
        Row: {
          forma_pago_id: string;
          ultimo: string | null;
          user_id: string;
          usos: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      uso_lugares: {
        Row: {
          lugar_id: string;
          ultimo: string | null;
          user_id: string;
          usos: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      uso_personas: {
        Row: {
          persona_id: string;
          ultimo: string | null;
          user_id: string;
          usos: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      ajustar_presupuesto_periodo: {
        Args: { p_ajuste: number; p_nota?: string; p_periodo_id: string };
        Returns: {
          cerrado_at: string | null;
          created_at: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          nota_presupuesto: string | null;
          presupuesto: number;
          resumen: Json | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "periodos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      ajustar_saldo: {
        Args: { p_bolsa_id: string; p_fecha?: string; p_nota?: string; p_saldo_real: number };
        Returns: string;
      };
      aportar_meta: {
        Args: {
          p_afecta_presupuesto?: boolean;
          p_bolsa_id?: string;
          p_fecha?: string;
          p_medio_id?: string;
          p_meta_id: string;
          p_nota?: string;
          p_valor: number;
        };
        Returns: string;
      };
      aporte_pendiente: {
        Args: { p_movimiento_id: string };
        Returns: {
          afecta_presupuesto: boolean;
          bolsa_id: string;
          created_at: string;
          enlace_id: string | null;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          medio_id: string | null;
          meta_id: string | null;
          nota: string | null;
          regla_aporte_id: string | null;
          saldo_real: number | null;
          sentido: string;
          tipo: string;
          user_id: string;
          valor: number;
        };
        SetofOptions: {
          from: "*";
          to: "movimientos_bolsa";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      asegurar_periodos: {
        Args: { p_hoy?: string };
        Returns: {
          cerrado_at: string | null;
          created_at: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          nota_presupuesto: string | null;
          presupuesto: number;
          resumen: Json | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "periodos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      asegurar_periodos_de: {
        Args: { p_hoy: string; p_user_id: string };
        Returns: {
          cerrado_at: string | null;
          created_at: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          nota_presupuesto: string | null;
          presupuesto: number;
          resumen: Json | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "periodos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bolsa_activa: {
        Args: { p_bolsa_id: string };
        Returns: {
          archivada: boolean;
          created_at: string;
          forma_pago_id: string | null;
          id: string;
          nombre: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "bolsas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      bolsa_en_uso_por_reglas: { Args: { p_bolsa_id: string }; Returns: boolean };
      calcular_periodo: {
        Args: { p_dia: number; p_hoy: string };
        Returns: {
          fecha_fin: string;
          fecha_inicio: string;
        }[];
      };
      cambiar_presupuesto_defecto: {
        Args: { p_actual?: boolean; p_hoy?: string; p_valor: number };
        Returns: undefined;
      };
      cerrar_periodo: {
        Args: { p_periodo_id: string };
        Returns: {
          cerrado_at: string | null;
          created_at: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          nota_presupuesto: string | null;
          presupuesto: number;
          resumen: Json | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "periodos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cerrar_periodos_de: { Args: { p_hoy: string; p_user_id: string }; Returns: number };
      confirmar_aporte: {
        Args: { p_en_adelante?: boolean; p_movimiento_id: string; p_valor?: number };
        Returns: {
          afecta_presupuesto: boolean;
          bolsa_id: string;
          created_at: string;
          enlace_id: string | null;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          medio_id: string | null;
          meta_id: string | null;
          nota: string | null;
          regla_aporte_id: string | null;
          saldo_real: number | null;
          sentido: string;
          tipo: string;
          user_id: string;
          valor: number;
        };
        SetofOptions: {
          from: "*";
          to: "movimientos_bolsa";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirmar_gasto_pendiente: {
        Args: { p_gasto_id: string; p_valor?: number };
        Returns: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          canal_id: string | null;
          categoria_color: string | null;
          categoria_icono: string | null;
          categoria_id: string;
          categoria_nombre: string;
          created_at: string;
          cuota_id: string | null;
          descripcion: string | null;
          es_ajuste: boolean;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          lugar_id: string | null;
          medio_id: string | null;
          prestamo_id: string | null;
          regla_id: string | null;
          saldo_real: number | null;
          subcategoria_id: string | null;
          subcategoria_nombre: string | null;
          titulo: string;
          user_id: string;
          valor: number;
        };
        SetofOptions: {
          from: "*";
          to: "gastos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      crear_bolsa: {
        Args: { p_fecha?: string; p_nombre: string; p_saldo_inicial?: number };
        Returns: string;
      };
      crear_lugar: {
        Args: { p_nombre: string };
        Returns: {
          estado: string;
          id: string;
        }[];
      };
      crear_meta: {
        Args: {
          p_afecta_presupuesto?: boolean;
          p_bolsa_id?: string;
          p_dia?: number;
          p_fecha_final: string;
          p_frecuencia?: string;
          p_hoy?: string;
          p_icono: string;
          p_medio_id?: string;
          p_monto: number;
          p_nombre: string;
          p_saldo_inicial?: number;
          p_valor?: number;
        };
        Returns: string;
      };
      crear_persona: {
        Args: { p_nombre: string; p_tipo?: string };
        Returns: {
          estado: string;
          id: string;
        }[];
      };
      dia_en_mes: { Args: { p_dia: number; p_mes: string }; Returns: string };
      editar_meta: {
        Args: {
          p_afecta_presupuesto?: boolean;
          p_bolsa_id?: string;
          p_dia?: number;
          p_fecha_final: string;
          p_frecuencia?: string;
          p_hoy?: string;
          p_icono: string;
          p_medio_id?: string;
          p_meta_id: string;
          p_monto: number;
          p_nombre: string;
          p_valor?: number;
        };
        Returns: undefined;
      };
      eliminar_bolsa: {
        Args: { p_bolsa_id: string; p_destino?: string; p_fecha?: string };
        Returns: string;
      };
      eliminar_categoria: { Args: { p_id: string }; Returns: string };
      eliminar_forma_pago: { Args: { p_id: string }; Returns: string };
      eliminar_lugar: { Args: { p_id: string }; Returns: string };
      eliminar_meta: {
        Args: { p_bolsa_id?: string; p_fecha?: string; p_meta_id: string };
        Returns: undefined;
      };
      eliminar_persona: { Args: { p_id: string }; Returns: string };
      estado_metas: {
        Args: { p_hoy?: string };
        Returns: {
          aporte_sugerido: number;
          aportes_restantes: number;
          estado: string;
          fecha_final: string;
          fecha_proyectada: string;
          meta_id: string;
          monto_meta: number;
          nombre: string;
          ritmo_ideal: number;
          saldo: number;
          user_id: string;
        }[];
      };
      exigir_clase_forma_pago: {
        Args: { p_clase: string; p_forma_pago_id: string; p_user_id: string };
        Returns: undefined;
      };
      exigir_datos_meta: {
        Args: { p_fecha_final: string; p_hoy: string; p_monto: number };
        Returns: undefined;
      };
      exigir_nombre_bolsa_libre: {
        Args: { p_excepto?: string; p_nombre: string };
        Returns: undefined;
      };
      exigir_origen_aporte: {
        Args: { p_afecta: boolean; p_bolsa_id: string; p_medio_id: string };
        Returns: undefined;
      };
      exigir_tipo_categoria: {
        Args: { p_categoria_id: string; p_tipo: string; p_user_id: string };
        Returns: undefined;
      };
      exigir_valor: { Args: { p_cero?: boolean; p_valor: number }; Returns: undefined };
      fecha_serie: {
        Args: {
          p_dia: number;
          p_frecuencia: string;
          p_inicio: string;
          p_intervalo: number;
          p_n: number;
        };
        Returns: string;
      };
      fin_periodo_desde: { Args: { p_dia: number; p_inicio: string }; Returns: string };
      generar_aportes_de: { Args: { p_hoy: string; p_user_id: string }; Returns: number };
      generar_cuotas_de: { Args: { p_hoy: string; p_user_id: string }; Returns: number };
      generar_periodicos_de: { Args: { p_hoy: string; p_user_id: string }; Returns: number };
      generar_plan_cuotas: { Args: { p_deuda_id: string }; Returns: number };
      hoy_bogota: { Args: Record<PropertyKey, never>; Returns: string };
      inicializar_usuario: { Args: { p_user_id: string }; Returns: undefined };
      marcar_distintos: {
        Args: { p_a: string; p_b: string; p_entidad: string };
        Returns: undefined;
      };
      meta_vigente: {
        Args: { p_meta_id: string };
        Returns: {
          bolsa_id: string;
          created_at: string;
          eliminada_at: string | null;
          fecha_final: string;
          icono: string;
          id: string;
          monto_meta: number;
          nombre: string;
          pausada: boolean;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "metas_ahorro";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      normalizar_nombre: { Args: { texto: string }; Returns: string };
      omitir_aporte: {
        Args: { p_movimiento_id: string };
        Returns: {
          afecta_presupuesto: boolean;
          bolsa_id: string;
          created_at: string;
          enlace_id: string | null;
          estado: string;
          fecha: string;
          fecha_programada: string | null;
          id: string;
          medio_id: string | null;
          meta_id: string | null;
          nota: string | null;
          regla_aporte_id: string | null;
          saldo_real: number | null;
          sentido: string;
          tipo: string;
          user_id: string;
          valor: number;
        };
        SetofOptions: {
          from: "*";
          to: "movimientos_bolsa";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      pausar_meta: { Args: { p_meta_id: string }; Returns: undefined };
      ponerse_al_dia: { Args: Record<PropertyKey, never>; Returns: Json };
      posibles_duplicados: {
        Args: { p_entidad: string };
        Returns: {
          a_id: string;
          a_nombre: string;
          b_id: string;
          b_nombre: string;
        }[];
      };
      primera_fecha_serie_desde: {
        Args: {
          p_desde: string;
          p_dia: number;
          p_frecuencia: string;
          p_inicio: string;
          p_intervalo: number;
        };
        Returns: string;
      };
      reanudar_meta: { Args: { p_hoy?: string; p_meta_id: string }; Returns: undefined };
      reanudar_regla: {
        Args: { p_hoy?: string; p_regla_id: string };
        Returns: {
          afecta_presupuesto: boolean;
          bolsa_id: string | null;
          canal_id: string | null;
          categoria_id: string;
          created_at: string;
          descripcion: string | null;
          dia: number | null;
          fecha_inicio: string;
          frecuencia: string;
          id: string;
          intervalo: number;
          lugar_id: string | null;
          medio_id: string | null;
          pausada: boolean;
          proxima_fecha: string;
          repeticiones: number | null;
          subcategoria_id: string | null;
          titulo: string;
          user_id: string;
          valor: number;
        };
        SetofOptions: {
          from: "*";
          to: "reglas_periodicas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      recalcular_resumen_en: { Args: { p_fecha: string; p_user_id: string }; Returns: undefined };
      recargar_bolsa: {
        Args: { p_bolsa_id: string; p_fecha?: string; p_nota?: string; p_valor: number };
        Returns: string;
      };
      registrar_alertas: { Args: { p_periodo_id: string }; Returns: number };
      registrar_alertas_en: { Args: { p_fecha: string; p_user_id: string }; Returns: number };
      renombrar_bolsa: { Args: { p_bolsa_id: string; p_nombre: string }; Returns: undefined };
      resumen_dinero: { Args: { p_periodo_id: string }; Returns: Json };
      retirar_meta: {
        Args: {
          p_bolsa_id: string;
          p_fecha?: string;
          p_meta_id: string;
          p_motivo?: string;
          p_valor: number;
        };
        Returns: string;
      };
      sugerir_aporte: {
        Args: {
          p_dia: number;
          p_fecha_final: string;
          p_frecuencia: string;
          p_hoy?: string;
          p_monto: number;
          p_saldo_inicial: number;
        };
        Returns: {
          aporte: number;
          aportes: number;
          ultima_fecha: string;
        }[];
      };
      sugerir_lugares: {
        Args: { p_limite?: number; p_texto: string };
        Returns: {
          id: string;
          nombre: string;
        }[];
      };
      tarea_diaria: { Args: { p_hoy?: string }; Returns: Json };
      tarea_diaria_de: { Args: { p_hoy: string; p_user_id: string }; Returns: Json };
      trasladar: {
        Args: {
          p_destino: string;
          p_fecha?: string;
          p_nota?: string;
          p_origen: string;
          p_valor: number;
        };
        Returns: string;
      };
      unir_formas_pago: { Args: { p_destino: string; p_origen: string }; Returns: undefined };
      unir_lugares: { Args: { p_destino: string; p_origen: string }; Returns: undefined };
      unir_personas: { Args: { p_destino: string; p_origen: string }; Returns: undefined };
      vista_previa_periodos: {
        Args: { p_dia: number; p_hoy?: string };
        Returns: {
          fecha_fin: string;
          fecha_inicio: string;
          orden: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
