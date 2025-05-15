"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import Swal from "sweetalert2";
import { supabase } from "@/app/login/actions";
import "./maquinas.css";
import Link from "next/link";

interface UnidadAtraccion {
  id_unidad: number;
  id_atraccion: number;
  estado: string;
  tiempo_reparacion: string | null;
  juego_foto: string | null;
  ciclos_proximo_mantenimiento: number; // Added property
  contador_ciclos_actuales: number; // Added missing property
}

interface MantenimientoUnidad {
  id_mantenimiento: number;
  id_unidad: number;
  fecha: string;
  tipo: string;
  descripcion: string;
  costo_reparacion: number;
}

interface StaticInfo {
  fichaTecnica: { modelo: string; marca: string; anio: number };

}
const staticData: Record<number, StaticInfo> = {
  1: {
    fichaTecnica: { modelo: "Unidad-PX1", marca: "Unicorp", anio: 2023 },
  },
  2: {
    fichaTecnica: { modelo: "Unidad-PX2", marca: "Unicorp", anio: 2023 },
    
  },
  // … añade más según tus unidades
};

interface ManualRegistro {
  id: number;
  fecha: string;
  cantidad: number;
}

export default function UnidadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [unidad, setUnidad] = useState<UnidadAtraccion | null>(null);
  const [historial, setHistorial] = useState<MantenimientoUnidad[]>([]);
  const [staticInfo, setStaticInfo] = useState<StaticInfo>({
    fichaTecnica: { modelo: "N/A", marca: "N/A", anio: 0 },
    
  });

  // Estado/fecha
  const [estadoSel, setEstadoSel] = useState<string>("");
  const [fechaHora, setFechaHora] = useState<string>("");

  // Ciclos manuales
  const [manualIncrement, setManualIncrement] = useState<number>(0);
  const [registroCiclos, setRegistroCiclos] = useState<ManualRegistro[]>([]);

  // Nuevo mantenimiento
  const [tipo, setTipo] = useState<"Preventivo" | "Correctivo" | "Reparación">("Preventivo");
  const [descripcion, setDescripcion] = useState("");
  const [costo, setCosto] = useState<number | "">("");

  // Protege ruta
  useEffect(() => {
    const s = localStorage.getItem("employeeSession");
    if (!s) return void router.push("/");
    try {
      const sess = JSON.parse(s);
      if (![6, 5].includes(sess.id_puesto)) {
        Swal.fire("Acceso denegado", "No tienes permiso", "error").then(() =>
          router.push("/")
        );
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  // Carga datos
  useEffect(() => {
    async function fetchData() {
      const { data: u, error } = await supabase
        .from("unidad_atraccion")
        .select("id_unidad, id_atraccion, estado, tiempo_reparacion, juego_foto,ciclos_proximo_mantenimiento,contador_ciclos_actuales")
        .eq("id_unidad", Number(id))
        .single();
      if (error || !u) {
        return Swal.fire("Error", error?.message || "Unidad no encontrada", "error");
      }
      setUnidad(u);
      setEstadoSel(u.estado);
      setFechaHora(u.tiempo_reparacion?.slice(0, 16) || "");

      // historial
      const { data: h, error: errH } = await supabase
        .from("mantenimiento_unidad")
        .select("*")
        .eq("id_unidad", u.id_unidad)
        .order("fecha", { ascending: false });
      if (!errH && h) setHistorial(h as MantenimientoUnidad[]);

      // ficha técnica + ciclos
      const info = staticData[u.id_unidad] || {
        fichaTecnica: { modelo: "N/A", marca: "N/A", anio: 0 },
        ciclosActual: 0,
        ciclosLimite: 0,
      };
      setStaticInfo(info);
    }
    fetchData();
  }, [id]);

  // Guarda estado y fecha
  const handleGuardarEstado = async () => {
    if (!unidad) return;
    const { error } = await supabase
      .from("unidad_atraccion")
      .update({
        estado: estadoSel,
        tiempo_reparacion: fechaHora
          ? new Date(fechaHora).toISOString()
          : null,
      })
      .eq("id_unidad", unidad.id_unidad);
    if (error) {
      return Swal.fire("Error al guardar", error.message, "error");
    }
    setUnidad({
      ...unidad,
      estado: estadoSel,
      tiempo_reparacion: fechaHora
        ? new Date(fechaHora).toISOString()
        : null,
    });
    Swal.fire("¡Listo!", "Estado y fecha guardados", "success");
  };

  // Agrega ciclos manuales
  const handleAgregarCiclos = () => {
    if (manualIncrement <= 0) {
      return Swal.fire("Atención", "Introduce un valor mayor que 0", "warning");
    }
    const ahora = new Date().toLocaleString();
    setUnidad((s) => 
      s ? {
        ...s,
        contador_ciclos_actuales: s.contador_ciclos_actuales + manualIncrement,
      } : s
    );
    setRegistroCiclos((prev) => [
      ...prev,
      { id: Date.now(), fecha: ahora, cantidad: manualIncrement },
    ]);
    setManualIncrement(0);
    Swal.fire("Listo", `Agregaste ${manualIncrement} ciclos`, "success");
  };

  // Agrega un nuevo mantenimiento en unidad_atraccion y mantenimiento_unidad
  const handleAgregarMantenimiento = async () => {
    if (!unidad) return;
  
    // 🚫 Si la unidad ya está funcional, no permitimos mantenimiento
    if (unidad.estado === "Funcional") {
      return Swal.fire(
        "Atención",
        "La unidad está funcional y no requiere mantenimiento",
        "info"
      );
    }
  
    // 1) Validación de campos vacíos
    if (!descripcion.trim() || costo === "" || isNaN(Number(costo))) {
      return Swal.fire(
        "Atención",
        "Por favor completa descripción y costo",
        "warning"
      );
    }
  
    // 2) Confirmación de si quiere aumentar ciclos o no
    const { isConfirmed } = await Swal.fire({
      title: "¿La unidad ya está reparada? Aumenta los ciclos para el próximo mantenimiento.",
      text: `Has introducido ${manualIncrement} ciclos.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aumentar ciclos",
      cancelButtonText: "No, aún está en mantenimiento",
    });
  
    // Preparamos la cantidad final a sumar
    let ciclosParaSumar = manualIncrement;
    if (!isConfirmed) {
      ciclosParaSumar = 0; // si no confirma, 0 ciclos
    } else if (ciclosParaSumar <= 0) {
      return Swal.fire(
        "Atención",
        "Introduce un número de ciclos mayor que 0",
        "warning"
      );
    }
  
    // 3) Actualizamos el total de ciclos
    const nuevoTotal = unidad.ciclos_proximo_mantenimiento + ciclosParaSumar;
  
    // Preparamos campos a actualizar
    const updates: Record<string, any> = {
      ciclos_proximo_mantenimiento: nuevoTotal
    };
    if (isConfirmed) {
      updates.estado = "Funcional";
      setEstadoSel("Funcional");
    }
  
    const { error: updateError } = await supabase
      .from("unidad_atraccion")
      .update(updates)
      .eq("id_unidad", unidad.id_unidad);
  
    if (updateError) {
      return Swal.fire("Error al guardar", updateError.message, "error");
    }
  
    // 4) Insertar el registro de mantenimiento
    const hoy = new Date().toISOString();
    const nuevoRegistro = {
      id_unidad: unidad.id_unidad,
      fecha: hoy,
      tipo,
      descripcion,
      costo_reparacion: Number(costo),
    };
  
    const { data: inserted, error: insertError } = await supabase
      .from("mantenimiento_unidad")
      .insert(nuevoRegistro)
      .select()
      .single();
  
    if (insertError || !inserted) {
      return Swal.fire("Error", insertError?.message || "No se guardó", "error");
    }
  
    // 5) Refrescar UI
    setHistorial((prev) => [inserted, ...prev]);
    setUnidad((prev) =>
      prev
        ? {
            ...prev,
            ciclos_proximo_mantenimiento: nuevoTotal,
            estado: isConfirmed ? "Funcional" : prev.estado
          }
        : prev
    );
    setManualIncrement(0);
    setTipo("Preventivo");
    setDescripcion("");
    setCosto("");
  
    Swal.fire("Listo", "Mantenimiento registrado correctamente", "success");
  };
  

  if (!unidad) return <p>Cargando…</p>;

  return (
    <LayoutWithSidebar>
      <div className="panel-container">
        {/* HEADER */}
        <div className="panel-header">
          {unidad.juego_foto && (
            <img src={unidad.juego_foto} alt={`Atracción ${unidad.id_atraccion}`} />
          )}
          <h1>
            Unidad #{unidad.id_unidad} – Atracción {unidad.id_atraccion}
          </h1>
        </div>

        {/* FICHA TÉCNICA */}
        <div className="panel-section">
          <h3>Ficha Técnica</h3>
          <ul>
            <li><b>Modelo:</b> {staticInfo.fichaTecnica.modelo}</li>
            <li><b>Marca:</b> {staticInfo.fichaTecnica.marca}</li>
            <li><b>Año:</b> {staticInfo.fichaTecnica.anio}</li>
          </ul>
        </div>

        {/* ESTADO */}
        <div className="panel-section">
          <h3>Cambiar Estado</h3>
          <select value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)}>
            <option value="Funcional">Funcional</option>
            <option value="Mantenimiento">Mantenimiento</option>
          </select>
        </div>

        {/* FECHA & HORA */}  
        <div className="panel-section">
          <h3>Fecha y Hora Estimada para Entregar Juego</h3>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
          />
        </div>

        {/* BOTÓN GUARDAR ESTADO Y FECHA */}
        <div className="panel-section form-full" style={{ textAlign: "right" }}>
          <button onClick={handleGuardarEstado}>Guardar Estado y Fecha</button>
        </div>

        {/* CICLOS MANUALES */}
        <div className="panel-section">
          <h3>Ciclos Próximo Mantenimiento</h3>
          <p>
            <b>Actual:</b> {unidad.contador_ciclos_actuales} <b>/ Límite:</b> {unidad.ciclos_proximo_mantenimiento}
          </p>
          <label style={{ display: "block", marginBottom: 8 }}>
            Añadir ciclos manualmente:
            <input
              type="number"
              min={1}
              value={manualIncrement}
              onChange={(e) => setManualIncrement(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          {/*<button onClick={handleAgregarCiclos}>Agregar Ciclos</button>*/}
          <h4 style={{ marginTop: 16 }}>Registro manual</h4>
          {registroCiclos.length === 0 ? (
            <p><i>No has agregado ciclos aún.</i></p>
          ) : (
            <ul>
              {registroCiclos.map((r) => (
                <li key={r.id}>{r.fecha} — +{r.cantidad} ciclos</li>
              ))}
            </ul>
          )}
        </div>

        {/* HISTORIAL DE MANTENIMIENTOS */}
        <div className="panel-section">
          <h3>Historial de Mantenimientos</h3>
          {historial.length === 0 ? (
            <p><i>No hay registros aún.</i></p>
          ) : (
            <ul>
              {historial.map((h) => (
                <li key={h.id_mantenimiento}>
                  {new Date(h.fecha).toLocaleDateString()} — <b>{h.tipo}</b>: {h.descripcion} (Q{h.costo_reparacion.toFixed(2)})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FORMULARIO HISTÓRICO */}
        <div className="panel-section form_mantenimiento" style={{ gridColumn: "span 2" }}>
          <h3>Registrar Nuevo Mantenimiento</h3>
          <label>
            Tipo:
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Reparación">Reparación</option>
            </select>
          </label>
          <label>
            Descripción:
            <textarea
              placeholder="Explica brevemente el mantenimiento realizado"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <label>
            Costo (Q):
            <input
              type="number"
              min={0}
              step={0.01}
              value={costo}
              onChange={(e) => setCosto(e.target.value === "" ? "" : Number(e.target.value))}
               placeholder="Q0.00"
            />
          </label>
          <div className="button-group">
  <button onClick={handleAgregarMantenimiento}>Guardar Mantenimiento</button>
  <Link href="/mantenimiento/tuc-tuc">
    <button>← Volver al listado</button>
  </Link>
</div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}