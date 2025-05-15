"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import "./maquinas.css";
import Swal from "sweetalert2";
import { supabase } from "@/app/login/actions";
import Link from "next/link";

export interface MantenimientoRealizado {
  id: number;
  fecha: string;
  tipo: "Preventivo" | "Correctivo" | "Reparación";
  descripcion: string;
  costo_reparacion: number;
}

export interface Machine {
  id_atraccion: number;
  nombre: string;
  juego_foto: string;
  estado_atraccion: string;
  contador_ciclos_actuales: number;
  ciclos_por_ticket: number;
  tiempo_reparacion: string; 
  ciclos_proximo_mantenimiento: number;
  detalle_proximo_mantenimiento: string;
  checklist: string[];
  fichaTecnica: {
    modelo: string;
    marca: string;
    anio: number;
    
  };
}

interface CicloRegistro {
  id: number;
  fecha: string;
  cantidad: number;
}

const staticData: Record<number, { checklist: string[]; fichaTecnica: Machine['fichaTecnica'] }> = {
  1: {
    checklist: ["Cambio de aceite", "Revisión de estructura", "Ajuste de mecanismos", "Limpieza general"],
    fichaTecnica: { modelo: "Cactus-PX1", marca: "Rotors Corp", anio: 2022 },
  },
  2: {
    checklist: [ "Cambio de aceite","Revisión de estructura","Ajuste de mecanismos","Limpieza general",],
    fichaTecnica: {modelo: "Toro-ZX9",marca: "FunRides",anio: 2021,},
  },
  4: {
    checklist: [  "Cambio de aceite","Revisión de estructura","Ajuste de mecanismos","Limpieza general",],
    fichaTecnica: {modelo: "Union-CL1",marca: "RollerCoaster Inc",anio: 2020,},
  },
  5: {
    checklist: [ "Cambio de aceite","Revisión de estructura","Ajuste de mecanismos","Limpieza general",],
    fichaTecnica: { modelo: "Tren-FRG", marca: "RailFun", anio: 2023,},
  },

};

export default function MaquinaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [maquina, setMaquina] = useState<Machine | null>(null);
  const [historial, setHistorial] = useState<MantenimientoRealizado[]>([]);

  const [tipo, setTipo] = useState<MantenimientoRealizado['tipo']>("Preventivo");
  const [desc, setDesc] = useState<string>("");
  const [costo, setCosto] = useState<number>(NaN);

  const [estadoSel, setEstadoSel] = useState<string>("");
  const [fechaHora, setFechaHora] = useState<string>("");

  const [manualIncrement, setManualIncrement] = useState<number>(0);
  const [registroCiclos, setRegistroCiclos] = useState<CicloRegistro[]>([]);
  
  

  // Protege la ruta según sesión
  useEffect(() => {
    const s = localStorage.getItem("employeeSession");
    if (!s) return void router.push("/");
    try {
      const sess = JSON.parse(s);
      if (![6, 5].includes(sess.id_puesto)) {
        Swal.fire("Acceso denegado", "No tienes permiso", "error").then(() => router.push("/"));
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  // Carga inicial
  useEffect(() => {
    async function fetchData() {
      const { data: m, error: errM } = await supabase
        .from("atraccion")
        .select(
          `id_atraccion, nombre, juego_foto, estado_atraccion, contador_ciclos_actuales, ciclos_por_ticket, ciclos_proximo_mantenimiento, detalle_proximo_mantenimiento, tiempo_reparacion`
        )
        .eq("id_atraccion", Number(id))
        .single();

      if (errM || !m) {
        return Swal.fire("Error", errM?.message || "No se encontró la atracción", "error");
      }

      const { data: h, error: errH } = await supabase
        .from("mantenimientos")
        .select("*")
        .eq("id_atraccion", m.id_atraccion)
        .order("fecha", { ascending: false });
      if (!errH && h) setHistorial(h as MantenimientoRealizado[]);

      const sd = staticData[m.id_atraccion] || {
        checklist: [],
        fichaTecnica: { modelo: "N/A", marca: "N/A", anio: 0 },
      };

      setMaquina({ ...m, checklist: sd.checklist, fichaTecnica: sd.fichaTecnica, tiempo_reparacion: m.tiempo_reparacion ?? "" });
      setEstadoSel(m.estado_atraccion);
      setFechaHora(m.detalle_proximo_mantenimiento || "");
    }
    fetchData();
  }, [id]);

  // Maneja agregar mantenimiento histórico
  const handleAgregarMantenimiento = async () => {
    if (!maquina) return;
   // 🚫 Si la máquina ya está funcional, no permitimos mantenimiento
   if (maquina.estado_atraccion === "Funcional") {
    return Swal.fire(
      "Atención",
      "La máquina está funcional y no requiere mantenimiento",
      "info"
    );
  }
    // 1) Validación de campos vacíos
    if (!desc.trim() || isNaN(costo)) {
      return Swal.fire(
        "Atención",
        "Por favor completa todos los campos de mantenimiento",
        "warning"
      );
    }
  
    // 2) Confirmación de si quiere aumentar ciclos o no
    const { isConfirmed } = await Swal.fire({
      title: "¿El juego ya está reparado? aumenta los ciclos, para el próximo mantenimiento.",
      text: `Has introducido ${manualIncrement} ciclos.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aumentar ciclos, ya está reparada",
      cancelButtonText: "No, aún se encuentra en mantenimiento",
    });
  
    // Preparamos la cantidad final a sumar
    let ciclosParaSumar = manualIncrement;
    if (!isConfirmed) {
      ciclosParaSumar = 0;           // si no confirma, 0 ciclos
    } else if (ciclosParaSumar <= 0) {
      // si confirmó aumentar pero puso 0 o negativo, rechazamos
      return Swal.fire(
        "Atención",
        "Introduce un número de ciclos mayor que 0 .",
        
        "warning"
      );
    }
  
    // 3) Actualizamos el total de ciclos (puede ser el mismo si ciclosParaSumar es 0)
    const nuevoTotal =
      maquina.ciclos_proximo_mantenimiento + ciclosParaSumar;
  
   // Preparamos los campos a actualizar
const updates: Record<string, any> = {
  ciclos_proximo_mantenimiento: nuevoTotal
};
// Si el usuario confirmó que ya está reparada, marcamos Funcional
if (isConfirmed) {
  updates.estado_atraccion = "Funcional"; 
  setEstadoSel("Funcional");
}

const { error: updateError } = await supabase
  .from("atraccion")
  .update(updates)
  .eq("id_atraccion", maquina.id_atraccion);

    if (updateError) {
      return Swal.fire("Error al guardar", updateError.message, "error");
    }
  
    // 4) Insertar el registro de mantenimiento
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevoRegistro = {
      id_atraccion: maquina.id_atraccion,
      fecha: hoy,
      tipo,
      descripcion: desc,
      costo_reparacion: isNaN(costo) ? 0 : costo,
    };
  
    const { data: inserted, error: insertError } = await supabase
      .from("mantenimientos")
      .insert(nuevoRegistro)
      .select()
      .single();
    if (insertError) {
      return Swal.fire("Error", insertError.message, "error");
    }
  
    // 5) Actualizamos la UI
    setHistorial((prev) => [{ id: inserted.id, ...nuevoRegistro }, ...prev]);
    setMaquina((prev) =>
      prev && {
        ...prev,
        ciclos_proximo_mantenimiento: nuevoTotal,
        // si cambió el estado, lo reflejamos
        estado_atraccion: isConfirmed ? "Funcional" : prev.estado_atraccion
      }
    );
    setManualIncrement(0);
    setTipo("Preventivo");
    setDesc("");
    setCosto(NaN);
  
    Swal.fire("Listo", "Mantenimiento registrado correctamente", "success");
  };
  

  // Maneja guardar cambios de estado y próxima fecha/hora
  const handleGuardarCambios = async () => {
    if (!maquina) return;
    const { error } = await supabase
      .from("atraccion")
      .update({
        estado_atraccion: estadoSel,
        tiempo_reparacion: fechaHora
        ? new Date(fechaHora).toISOString()
          : null,
      })
      .eq("id_atraccion", maquina.id_atraccion);
      

    if (error) {
      return Swal.fire("Error al guardar", error.message, "error");
    }

    setMaquina({ ...maquina, estado_atraccion: estadoSel, tiempo_reparacion: fechaHora });
    const ahora = new Date().toISOString().slice(0, 16).replace("T", " ");
    setRegistroCiclos((prev) => [...prev, { id: Date.now(), fecha: ahora, cantidad: manualIncrement }]);
    setManualIncrement(0);
    Swal.fire("Listo", "Estado cambiado y fecha guardada", "success");
  };

  if (!maquina) return <p>Cargando…</p>;

  return (
    
    <LayoutWithSidebar>
      <div className="panel-container">
        {/* HEADER */}
        <div className="panel-header">
          <img src={maquina.juego_foto} alt={maquina.nombre} />
          <h1>{maquina.nombre}</h1>
        </div>

        {/* FICHA TÉCNICA */}
        <div className="panel-section">
          <h3>Ficha Técnica</h3>
          <ul>
            <li><b>Modelo:</b> {maquina.fichaTecnica.modelo}</li>
            <li><b>Marca:</b> {maquina.fichaTecnica.marca}</li>
            <li><b>Año:</b> {maquina.fichaTecnica.anio}</li>
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

        {/* GUARDAR ESTADO, FECHA Y CICLOS */}
        <div className="panel-section form-full" style={{ textAlign: "right" }}>
          <button onClick={handleGuardarCambios}>Guardar Estado y Fecha</button>
        </div>

        {/* CICLOS MANUALES */}
        <div className="panel-section">
          <h3>Ciclos Próximo Mantenimiento</h3>
          <p>
            <b>Actual:</b> {maquina.contador_ciclos_actuales} <b>/ Límite:</b> {maquina.ciclos_proximo_mantenimiento}
          </p>
          <label style={{ display: "block", marginBottom: 8 }}>
            Añadir ciclos manualmente:
            <input
              type="number"
              min={1}
              step={1}
              value={manualIncrement}
              onChange={(e) => setManualIncrement(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          <h4 style={{ marginTop: 16 }}>Registro manual</h4>
          {registroCiclos.length === 0 ? (
            <p><i>No has agregado ciclos aún.</i></p>
          ) : (
            <ul style={{ marginLeft: 20 }}>
              {registroCiclos.map((r) => (
                <li key={r.id}>{r.fecha} — +{r.cantidad} ciclos</li>
              ))}
            </ul>
          )}
        </div>

        {/* HISTORIAL DE MANTENIMIENTOS */}
        <div className="panel-section">
          <h3>Historial de Mantenimientos</h3>
          <ul>
            {historial.map((h) => (
              <li key={h.id}>
                {h.fecha} — <b>{h.tipo}</b>: {h.descripcion} (<b>Costo:</b> Q{(h.costo_reparacion ?? 0).toFixed(2)})
              </li>
            ))}
          </ul>
        </div>

        {/* FORMULARIO HISTÓRICO */}
        <div className="panel-section form_mantenimiento" style={{ gridColumn: "span 2" }}>
          <h3>Registrar Mantenimiento Histórico</h3>
          <label>
            Tipo:
            <select value={tipo} onChange={(e) => setTipo(e.target.value as MantenimientoRealizado['tipo'])}>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Reparación">Reparación</option>
            </select>
          </label>
          <label>
            Descripción:
            <textarea
              placeholder="Exlique detalladamente el mantenimiento realizado"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          <label>
            Costo de reparación (Q):
            <input
              type="number"
              min={0}
              step={0.01}
              value={isNaN(costo) ? "" : costo}
               placeholder="Q0.00"
              onChange={(e) => setCosto(e.target.value === "" ? NaN : parseFloat(e.target.value))}
            />
          </label><div className="button-group">
  <button onClick={handleAgregarMantenimiento}>Guardar Mantenimiento</button>
  <Link href="/mantenimiento/hacer-mantenimiento">
    <button>← Volver al listado</button>
  </Link>
</div>
          </div>
      </div>
    </LayoutWithSidebar>
  );
}