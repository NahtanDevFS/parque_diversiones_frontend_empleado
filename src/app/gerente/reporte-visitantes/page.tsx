"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import React, { useEffect, useState } from "react";
import { supabase } from "./actions";
import jsPDF from "jspdf";
import "./reporte_visitantes.css";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { utils, writeFile } from "xlsx";

type GroupBy = "day" | "week" | "month" | "year";
type SortOrder = "newest" | "oldest" | "desc" | "asc";

export default function ReporteVisitantes() {
  const router = useRouter();

  /* ---------- estados principales ---------- */
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("hoy");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [visitGroupBy, setVisitGroupBy] = useState<GroupBy>("day");
  const [visitSortOrder, setVisitSortOrder] = useState<SortOrder>("newest");
  const [showTable, setShowTable] = useState(true);

  const [conteos, setConteos] = useState({ hoy: 0, semana: 0, mes: 0 });

  const [selectedStatus, setSelectedStatus] = useState("En el almuerzo");

  /* ---------- sesión y acceso ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return void router.push("/");

    try {
      const { id_puesto, id_empleado } = JSON.parse(stored);
      if (id_puesto !== 6) {
        supabase
          .from("empleado")
          .update({
            estado_actividad_empleado: "En el módulo de reporte de visitantes",
          })
          .eq("id_empleado", id_empleado);
      }
      if (id_puesto !== 3 && id_puesto !== 6) {
        Swal.fire("Acceso denegado", "No tienes permiso", "error").then(() =>
          router.push("/")
        );
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return;
    const { id_empleado } = JSON.parse(stored);
    await supabase
      .from("empleado")
      .update({ estado_actividad_empleado: selectedStatus })
      .eq("id_empleado", id_empleado);
    Swal.fire("Éxito", "Estado actualizado", "success");
  };

  /* ---------- helpers fecha ---------- */
  const getISOWeek = (d: Date) => {
    const tmp = new Date(d.valueOf());
    tmp.setDate(tmp.getDate() - ((d.getDay() + 6) % 7) + 3);
    const firstThu = tmp.valueOf();
    tmp.setMonth(0, 1);
    if (tmp.getDay() !== 4)
      tmp.setMonth(0, 1 + ((4 - tmp.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThu - tmp.valueOf()) / 604800000);
  };

  const keyFromDate = (d: Date, g: GroupBy) => {
    switch (g) {
      case "day":
        return d.toLocaleDateString();
      case "week":
        return `${d.getFullYear()}-W${getISOWeek(d)
          .toString()
          .padStart(2, "0")}`;
      case "month":
        return `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      case "year":
        return `${d.getFullYear()}`;
    }
  };

  const prettyKey = (k: string, g: GroupBy) => {
    if (g === "month") {
      const [y, m] = k.split("-");
      return new Date(Number(y), Number(m) - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
    }
    if (g === "week") {
      const [y, w] = k.split("-W");
      const monday = new Date(Number(y), 0, 1 + (Number(w) - 1) * 7);
      while (monday.getDay() !== 1) monday.setDate(monday.getDate() - 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const rango =
        monday.toLocaleDateString("es", { day: "numeric", month: "short" }) +
        "-" +
        sunday.toLocaleDateString("es", { day: "numeric", month: "short" });
      return `Semana ${w} (${rango}) - ${y}`;
    }
    return k;
  };

  /* ---------- rango filters ---------- */
  const calcularRango = () => {
    const hoy = new Date();
    const f = (d: Date) => d.toLocaleDateString("en-CA");
    let desde = f(hoy),
      hasta = f(hoy);
    if (filtro === "semana") {
      const d = new Date();
      d.setDate(hoy.getDate() - 7);
      desde = f(d);
    } else if (filtro === "mes") {
      const d = new Date();
      d.setMonth(hoy.getMonth() - 1);
      desde = f(d);
    } else if (filtro === "anio") {
      const d = new Date();
      d.setFullYear(hoy.getFullYear() - 1);
      desde = f(d);
    } else if (filtro === "personalizado") {
      desde = fechaInicio;
      hasta = fechaFin;
    }
    return { desde: `${desde}T00:00:00`, hasta: `${hasta}T23:59:59` };
  };

  /* ---------- fetch & contadores ---------- */
  useEffect(() => {
    (async () => {
      await fetchData();
      await contarVisitantes();
    })();
  }, [filtro, fechaInicio, fechaFin]);

  const fetchData = async () => {
    const { desde, hasta } = calcularRango();
    const { data } = await supabase
      .from("control_acceso_visitante")
      .select("*")
      .gte("fecha_hora_visita", desde)
      .lte("fecha_hora_visita", hasta);
    if (data) setVisitantes(data);
  };

  const contarVisitantes = async () => {
    const hoy = new Date().toLocaleDateString("en-CA");
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    const mes = new Date();
    mes.setDate(mes.getDate() - 30);

    const [{ count: h }, { count: s }, { count: m }] = await Promise.all([
      supabase
        .from("control_acceso_visitante")
        .select("*", { head: true, count: "exact" })
        .gte("fecha_hora_visita", `${hoy}T00:00:00`),
      supabase
        .from("control_acceso_visitante")
        .select("*", { head: true, count: "exact" })
        .gte(
          "fecha_hora_visita",
          `${semana.toLocaleDateString("en-CA")}T00:00:00`
        ),
      supabase
        .from("control_acceso_visitante")
        .select("*", { head: true, count: "exact" })
        .gte("fecha_hora_visita", `${mes.toLocaleDateString("en-CA")}T00:00:00`),
    ]);

    setConteos({ hoy: h || 0, semana: s || 0, mes: m || 0 });
  };

  /* ---------- ordenar y agrupar ---------- */
  const flatSorted = [...visitantes].sort((a, b) => {
    const dA = new Date(a.fecha_hora_visita).getTime();
    const dB = new Date(b.fecha_hora_visita).getTime();
    switch (visitSortOrder) {
      case "newest":
        return dB - dA;
      case "oldest":
        return dA - dB;
      case "desc":
        return b.id_acceso - a.id_acceso;
      case "asc":
        return a.id_acceso - b.id_acceso;
      default:
        return 0;
    }
  });

  const grouped = flatSorted.reduce((acc: Record<string, any[]>, v) => {
    const k = keyFromDate(new Date(v.fecha_hora_visita), visitGroupBy);
    (acc[k] ||= []).push(v);
    return acc;
  }, {});

  const toDateKey = (k: string): number => {
    switch (visitGroupBy) {
      case "day":
        return new Date(k).getTime();
      case "week": {
        const [y, w] = k.split("-W");
        return new Date(Number(y), 0, 1 + (Number(w) - 1) * 7).getTime();
      }
      case "month": {
        const [y, m] = k.split("-");
        return new Date(Number(y), Number(m) - 1, 1).getTime();
      }
      case "year":
        return new Date(Number(k), 0, 1).getTime();
    }
  };

  const groupEntries = Object.entries(grouped).sort(([a], [b]) =>
    visitSortOrder === "oldest" ? toDateKey(a) - toDateKey(b) : toDateKey(b) - toDateKey(a)
  );

  /* ---------- PDF export ---------- */
  const exportarPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;
  const marginBottom = 20;

  /* ---------- Encabezado ---------- */
  doc.setFontSize(16).text("Listado de Visitantes", margin, 20);
  doc.setFontSize(11).text(`Generado: ${new Date().toLocaleString()}`, margin, 27);
  doc.setFontSize(11).text(`Total general: ${flatSorted.length}`, margin, 34);

  if (!showTable) {                                         // PDF-MOD ➊
    doc.setFontSize(11).text("(Modo solo totales)", margin, 40);
  }

  /* ---------- Punto inicial ---------- */
  let y = showTable ? 42 : 46;                              // PDF-MOD ➋

  const salto = (inc: number) => {
    if (y + inc > ph - marginBottom) {
      doc.addPage();
      y = 20;
    }
    y += inc;
  };

  /* ---------- Recorrido de grupos ---------- */
  groupEntries.forEach(([key, arr]) => {
    doc.setFontSize(12).text(prettyKey(key, visitGroupBy), margin, y);
    doc.setFontSize(12).text(`—  ${arr.length} visitas`, pw - margin, y, { align: "right" });
    salto(6);

    if (showTable) {                                        // PDF-MOD ➌   Detalles opcionales
      /* Encabezados de tabla */
      doc.setFontSize(10);
      doc.text("ID", margin, y);
      doc.text("Ingreso", margin + 18, y);
      doc.text("Salida", margin + 80, y);
      doc.text("Cliente", pw - margin, y, { align: "right" });
      salto(5);

      /* Filas */
      arr.forEach((v) => {
        const ingreso = new Date(v.fecha_hora_visita).toLocaleString();
        const salida = v.fecha_hora_salida
          ? new Date(v.fecha_hora_salida).toLocaleString()
          : "-";
        doc.text(String(v.id_acceso), margin, y);
        doc.text(ingreso, margin + 18, y);
        doc.text(salida, margin + 80, y);
        doc.text(String(v.numero_de_cliente || "-"), pw - margin, y, { align: "right" });
        salto(5);
      });
      salto(3); // espacio extra tras la tabla
    }
  });

  /* ---------- Guardar ---------- */
  doc.save("Listado_visitantes.pdf");
};

/* ---------- Excel export ---------- */
const exportarExcel = () => {
  /* 1. Preparamos filas usando el mismo agrupamiento que el PDF */
  const rows: any[][] = [];

  // Encabezado general
  rows.push(["Listado de Visitantes"]);
  rows.push(["Generado:", new Date().toLocaleString()]);
  rows.push(["Total general:", flatSorted.length]);
  rows.push([]);                                  // línea en blanco

  groupEntries.forEach(([key, arr]) => {
    /* Título del grupo */
    rows.push([prettyKey(key, visitGroupBy), `${arr.length} visitas`]);

    if (showTable) {
      /* Encabezados de tabla */
      rows.push(["ID", "Ingreso", "Salida", "Cliente"]);

      /* Detalle */
      arr.forEach((v) => {
        const ingreso = new Date(v.fecha_hora_visita).toLocaleString();
        const salida =
          v.fecha_hora_salida
            ? new Date(v.fecha_hora_salida).toLocaleString()
            : "-";
        rows.push([
          v.id_acceso,
          ingreso,
          salida,
          v.numero_de_cliente || "-",
        ]);
      });

      /* Línea separadora */
      rows.push([]);
    }
  });

  /* 2. SheetJS → libro + hoja */
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(rows);
  utils.book_append_sheet(wb, ws, "Visitantes");

  /* 3. Descargar */
  writeFile(wb, "Listado_visitantes.xlsx");
};

  /* ---------- UI ---------- */
  return (
    <LayoutWithSidebar>
      <div className="reporte_visitantes_page">
        {/* estado empleado */}
        <div className="estado-row">
          <h4>Notificar cese de actividades:</h4>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option>En el almuerzo</option>
            <option>Turno cerrado</option>
            <option>Ausencia temporal</option>
          </select>
          <button onClick={handleStatusUpdate} className="button_ventas">Actualizar estado</button>
        </div>

        <h2 className="titulo_reporte">Reporte de Visitantes</h2>

        {/* tarjetas */}
        <div className="cards-summary">
          <div className="card_visitantes"><h3>Visitantes Hoy</h3><p>{conteos.hoy}</p></div>
          <div className="card_visitantes"><h3>Esta Semana</h3><p>{conteos.semana}</p></div>
          <div className="card_visitantes"><h3>Este Mes</h3><p>{conteos.mes}</p></div>
        </div>

        {/* filtros */}
        <div className="filtros-container">
          <h2 className="filtros-title">Filtrar visitas por:</h2>
          <div className="filtros-opciones">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="hoy">Hoy</option>
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Últimos 30 días</option>
              <option value="anio">Últimos 12 meses</option>
              <option value="personalizado">Personalizado</option>
            </select>

            {filtro === "personalizado" && (
              <>
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </>
            )}

            <div className="group-by-control">
              <label>Agrupar por:</label>
              <select value={visitGroupBy} onChange={(e) => setVisitGroupBy(e.target.value as GroupBy)}>
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>

            <div className="sort-control">
              <label>Ordenar por:</label>
              <select value={visitSortOrder} onChange={(e) => setVisitSortOrder(e.target.value as SortOrder)}>
                <option value="newest">Más reciente primero</option>
                <option value="oldest">Más antiguo primero</option>
                {/*<option value="desc">Mayor a menor (ID)</option>
                <option value="asc">Menor a mayor (ID)</option>*/}
              </select>
            </div>

            <label className="toggle-table">
              <input type="checkbox" checked={showTable} onChange={() => setShowTable(!showTable)} />
              Mostrar tabla
            </label>

            <button className="export-btn" onClick={exportarPDF}>Exportar a PDF</button>
            <button className="export-btn-excel" onClick={exportarExcel}>
              Exportar a Excel
            </button>
          </div>
        </div>

        {/* listado */}
        <div className="summary">
          <div className="summary-header">
            <h2>Listado de Visitantes</h2>
            <h2>Total: {flatSorted.length}</h2>
          </div>

          {groupEntries.length === 0 ? (
            <p className="no-data">No hay visitas registradas para la opción seleccionada.</p>
          ) : (
            groupEntries.map(([gKey, arr]) => (
              <div key={gKey}>
                <div className="grupo-header">
                  {prettyKey(gKey, visitGroupBy)} — {arr.length} visitas
                </div>

                {showTable && (
                  <div className="tabla-visitantes">
                    <div className="tabla-header">
                      <span>ID</span><span>Ingreso</span><span>Salida</span><span>Cliente</span>
                    </div>
                    {arr.map((v) => (
                      <div key={v.id_acceso} className="tabla-row">
                        <span>{v.id_acceso}</span>
                        <span>{v.fecha_hora_visita}</span>
                        <span>{v.fecha_hora_salida || "-"}</span>
                        <span>{v.numero_de_cliente || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
