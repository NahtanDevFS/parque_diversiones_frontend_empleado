"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import "./hacer_mantenimiento.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { supabase } from "@/app/login/actions";

/**
 * Interfaz que refleja los campos reales de tu tabla `atraccion`.
 */
interface Machine {
  id_atraccion: number;
  nombre: string;
  juego_foto: string;
  estado_atraccion: string;
  contador_ciclos_actuales: number;
  ciclos_por_ticket: number;
  ciclos_proximo_mantenimiento: number;
  detalle_proximo_mantenimiento: string;
}

const TOLERANCIA_CICLOS = 10;

export default function PanelMaquinas() {
  const [maquinas, setMaquinas] = useState<Machine[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("En el almuerzo");
  const router = useRouter();
  const MySwal = withReactContent(Swal);

  /**
   * 1) Protege la ruta y actualiza automáticamente el estado del empleado
   */
  useEffect(() => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return void router.push("/");

    try {
      const session = JSON.parse(stored);
      const { id_puesto, id_empleado } = session;

      // Protección de acceso
      if (id_puesto !== 3 && id_puesto !== 5) {
        Swal.fire({
          title: "Acceso denegado",
          text: "No tienes permiso para acceder a este módulo",
          icon: "error",
          confirmButtonText: "Ok",
        }).then(() => router.push("/"));
      }

      // Actualización automática de estado (excepto puesto 6)
      (async () => {
        if (id_puesto !== 6) {
          const { error } = await supabase
            .from("empleado")
            .update({ estado_actividad_empleado: "En el módulo de Mantenimiento" })
            .eq("id_empleado", id_empleado);

          if (error) {
            console.error("Error al actualizar estado automático:", error);
          }
        }
      })();
    } catch {
      router.push("/");
    }
  }, [router]);

  /**
   * 2) Carga las máquinas de la BD
   */
  useEffect(() => {
    async function fetchMaquinas() {
      const { data, error } = await supabase
        .from("atraccion")
        .select(
          `id_atraccion,
          nombre,
          juego_foto,
          estado_atraccion,
          contador_ciclos_actuales,
          ciclos_por_ticket,
          ciclos_proximo_mantenimiento,
          detalle_proximo_mantenimiento`
        );

      if (error) {
        console.error("Error al obtener atracciones:", error);
        return;
      }
      setMaquinas(data as Machine[]);
    }

    fetchMaquinas();
  }, []);

  /**
   * 3) Handler para actualizar estado desde el combobox
   */
  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return;

    const { id_empleado } = JSON.parse(stored);
    const { error } = await supabase
      .from("empleado")
      .update({ estado_actividad_empleado: selectedStatus })
      .eq("id_empleado", id_empleado);

    if (error) {
      console.error("Error al actualizar estado manual:", error);
      MySwal.fire("Error", "No se pudo actualizar el estado", "error");
    } else {
      MySwal.fire("Éxito", `Estado actualizado a \"${selectedStatus}\"`, "success");
    }
  };

  /**
   * Navega según el ID de la atracción
   */
  const handleVerDetalle = (id: number) => {
    if (id === 3) {
      router.push(`/mantenimiento/tuc-tuc`);
    } else {
      router.push(`/mantenimiento/maquinas/${id}`);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="hacer_mantenimiento_page">
        {/* SELECCIÓN DE ESTADO */}
        <div className="estado-row">
          <h4>Opciones para notificar cese de actividades:</h4>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="En el almuerzo">En el almuerzo</option>
            <option value="Turno cerrado">Turno cerrado</option>
          </select>
          <button onClick={handleStatusUpdate} className="button_ventas">
            Actualizar estado
          </button>
        </div>

        <h1>Monitoreo de Máquinas</h1>

        <div className="contenedor_juegos">
          {maquinas.map((m) => {
            const faltan =
              m.ciclos_proximo_mantenimiento - m.contador_ciclos_actuales;
            const vencido = faltan <= 0;
            const enTolerancia = !vencido && faltan <= TOLERANCIA_CICLOS;

            return (
              <div
                key={m.id_atraccion}
                className={`juego_card ${
                  m.estado_atraccion === "Mantenimiento" ? "card_mantenimiento" : ""
                } ${enTolerancia ? "card_advertencia" : ""}`}
              >
                <h2>{m.nombre}</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.juego_foto} alt={m.nombre} />

                <p>
                  <b>Estado:</b> {m.estado_atraccion}
                </p>
                 {m.id_atraccion !== 3 && (
                <p>
                  <b>Ciclos actuales:</b> {m.contador_ciclos_actuales} / {" "}
                  {m.ciclos_proximo_mantenimiento}
                  {vencido && (
                    <span className="badge-vencido">
                      <br />¡Mantenimiento vencido!
                    </span>
                  )}
                  {enTolerancia && (
                    <span className="badge-tolerancia">
                      <br />¡Atención!: quedan {faltan} ciclos
                    </span>
                  )}
                </p>
                )}
                <div className="botones_acciones">
                  <button onClick={() => handleVerDetalle(m.id_atraccion)}>
                    {m.id_atraccion === 3 ? "Ver Tuc Tuc" : "Realizar Mantenimiento"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

