"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import React, { useEffect, useState } from "react";
import { supabase } from "./actions";
import "./control_personal.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { utils, writeFile } from "xlsx";

const MySwal = withReactContent(Swal);

/* ---------- Tipos ---------- */
type Employee = {
  id_empleado: number;
  nombre: string;
  apellido: string;
  empleado_foto: string;
  telefono: string;
  estado_actividad_empleado: string;
  estado_empleado: string;
  estado_cuenta: number;
  puesto: { nombre: string };
  fecha_contratacion: string;
  email: string;
};

type RangeType = "hoy" | "7dias" | "30dias" | "personalizado";

interface EmpRange {
  type: RangeType;
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
}

/* ---------- Componente ---------- */
export default function ControlPersonalPage() {
  const router = useRouter();

  /* --- Estados globales --- */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPuesto, setFilterPuesto] = useState("");
  const [filterEstadoEmpleado, setFilterEstadoEmpleado] = useState("");
  const [filterEstadoCuenta, setFilterEstadoCuenta] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("En el almuerzo");

  /* Rango individual por empleado */
  const [rangeByEmp, setRangeByEmp] = useState<Record<number, EmpRange>>({});

  /* ---------- Protección de ruta ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return void router.push("/");

    try {
      const { id_puesto, id_empleado } = JSON.parse(stored);

      (async () => {
        if (id_puesto !== 6) {
          await supabase
            .from("empleado")
            .update({
              estado_actividad_empleado: "En el módulo de control de personal",
            })
            .eq("id_empleado", id_empleado);
        }
      })();

      if (id_puesto !== 3 && id_puesto !== 6) {
        MySwal.fire(
          "Acceso denegado",
          "No tienes permiso para acceder a este módulo",
          "error"
        ).then(() => router.push("/"));
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  /* ---------- Cambiar estado manual ---------- */
  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return;
    const { id_empleado } = JSON.parse(stored);
    await supabase
      .from("empleado")
      .update({ estado_actividad_empleado: selectedStatus })
      .eq("id_empleado", id_empleado);
    MySwal.fire("Éxito", "Estado actualizado", "success");
  };

  /* ---------- Cargar empleados ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("empleado")
        .select(
          "id_empleado, nombre, apellido, empleado_foto, telefono, estado_actividad_empleado, estado_empleado, estado_cuenta, puesto(nombre), fecha_contratacion, email"
        );
      if (data) {
        const list: Employee[] = data.map((e: any) => ({
          ...e,
          puesto: Array.isArray(e.puesto) ? e.puesto[0] : e.puesto,
        }));
        setEmployees(list);
        /* inicializar rangos a 'hoy' */
        const init: Record<number, EmpRange> = {};
        list.forEach((e) => (init[e.id_empleado] = { type: "hoy" }));
        setRangeByEmp(init);
      }
    })();
  }, []);

  /* ---------- Helpers de rango ---------- */
  const calcRange = (r: EmpRange): { desde: string; hasta: string } | null => {
    const hoy = new Date();
    const f = (d: Date) => d.toISOString().split("T")[0];
    switch (r.type) {
      case "hoy":
        return { desde: f(hoy), hasta: f(hoy) };
      case "7dias": {
        const d = new Date();
        d.setDate(hoy.getDate() - 7);
        return { desde: f(d), hasta: f(hoy) };
      }
      case "30dias": {
        const d = new Date();
        d.setDate(hoy.getDate() - 30);
        return { desde: f(d), hasta: f(hoy) };
      }
      case "personalizado":
        if (!r.start || !r.end) return null;
        return { desde: r.start, hasta: r.end };
    }
  };

  /* ---------- Generar PDF ---------- */
  const genPDF = async (emp: Employee) => {
    const r = rangeByEmp[emp.id_empleado];
    const rango = calcRange(r);
    if (!rango)
      return MySwal.fire(
        "Rango incompleto",
        "Selecciona fecha inicio y fin",
        "warning"
      );
    const { desde, hasta } = rango;

    const { data } = await supabase
      .from("control_empleado")
      .select("*")
      .eq("id_empleado", emp.id_empleado)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.addImage(
      "/marca_agua_logo_circular.png",
      "PNG",
      (pw - 180) / 2,
      (ph - 180) / 2,
      180,
      180,
      "",
      "FAST"
    );

    doc
      .setFontSize(18)
      .text(
        `Reporte de asistencias de ${emp.nombre} ${emp.apellido}`,
        pw / 2,
        20,
        { align: "center" }
      );
    doc.setFontSize(12).text(`Rango: ${desde} a ${hasta}`, 20, 30);
    doc.text(`Total asistencias: ${data?.length || 0}`, 20, 37);

    /* Encabezados */
    let y = 50;
    doc.setFont("Helvetica", "bold");
    doc.text("Fecha", 20, y);
    doc.text("Día", 60, y);
    doc.text("Hora entrada", 100, y);
    doc.text("Hora salida", 140, y);
    doc.setFont("Helvetica", "normal");
    y += 8;

    data?.forEach((rec: any) => {
      const d = new Date(rec.fecha);
      doc.text(rec.fecha, 20, y);
      doc.text(
        d.toLocaleDateString("es-ES", { weekday: "long" }),
        60,
        y
      );
      doc.text(String(rec.hora_entrada), 100, y);
      doc.text(String(rec.hora_salida || "-"), 140, y);
      y += 7;
      if (y > ph - 20) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`Asistencias_${emp.id_empleado}.pdf`);
  };

  /* ---------- Generar Excel ---------- */
  const genExcel = async (emp: Employee) => {
    const r = rangeByEmp[emp.id_empleado];
    const rango = calcRange(r);
    if (!rango)
      return MySwal.fire(
        "Rango incompleto",
        "Selecciona fecha inicio y fin",
        "warning"
      );
    const { desde, hasta } = rango;

    const { data } = await supabase
      .from("control_empleado")
      .select("*")
      .eq("id_empleado", emp.id_empleado)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    const rows: any[][] = [
      [`Reporte de asistencias de ${emp.nombre} ${emp.apellido}`],
      ["Rango:", `${desde} → ${hasta}`],
      ["Total asistencias", data?.length || 0],
      [],
      ["Fecha", "Día", "Hora entrada", "Hora salida"],
    ];

    data?.forEach((rec: any) => {
      const d = new Date(rec.fecha);
      rows.push([
        rec.fecha,
        d.toLocaleDateString("es-ES", { weekday: "long" }),
        rec.hora_entrada,
        rec.hora_salida || "-",
      ]);
    });

    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet(rows), "Asistencias");
    writeFile(wb, `Asistencias_${emp.id_empleado}.xlsx`);
  };

  /* ---------- Filtro visual de la lista ---------- */
  const filteredEmployees = employees.filter((e) => {
    const term = searchTerm.toLowerCase();
    const full = `${e.nombre} ${e.apellido}`.toLowerCase();
    const idStr = e.id_empleado.toString();
    const matchSearch = !term || full.includes(term) || idStr.includes(term);
    const matchPuesto =
      !filterPuesto ||
      e.puesto?.nombre.toLowerCase() === filterPuesto.toLowerCase();
    const matchEstado =
      !filterEstadoEmpleado ||
      e.estado_empleado.toLowerCase() === filterEstadoEmpleado.toLowerCase();
    const matchCuenta =
      !filterEstadoCuenta || e.estado_cuenta === Number(filterEstadoCuenta);
    return matchSearch && matchPuesto && matchEstado && matchCuenta;
  });

  /* ---------- Render ---------- */
  return (
    <LayoutWithSidebar>
      <div className="control_personal_page">
        <div className="control_personal_container">
          {/* Estado empleado */}
          <div className="estado-row">
            <h4>Opciones para notificar cese de actividades:</h4>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="En el almuerzo">En el almuerzo</option>
              <option value="Turno cerrado">Turno cerrado</option>
              <option value="Ausencia temporal">Ausencia temporal</option>
            </select>
            <button onClick={handleStatusUpdate} className="button_ventas">
              Actualizar estado
            </button>
          </div>

          <h1>Panel de Visualización y Control de Acceso del Personal</h1>

          {/* Buscador global */}
          <div className="search_filters_container">
            <input
              type="text"
              placeholder="Buscar empleado por nombre o ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* ... aquí mantienes tus filtros globales (puesto, asistencia, cuenta) ... */}
          </div>

          {/* Listado */}
          <div className="personal_container">
            {filteredEmployees.map((emp) => {
              const thisRange = rangeByEmp[emp.id_empleado] || { type: "hoy" };

              return (
                <div key={emp.id_empleado} className="employee_card">
                  {/* -------- Info -------- */}
                  <div className="employee_info_container">
                    <div className="employee_info_left">
                      <img
                        src={emp.empleado_foto}
                        alt={`${emp.nombre} ${emp.apellido}`}
                      />
                      <p>
                        <strong>Nombre:</strong> {emp.nombre} {emp.apellido}
                      </p>
                    </div>
                    <div className="employee_info_right">
                      <p>
                        <strong>ID:</strong> {emp.id_empleado}
                      </p>
                      <p>
                        <strong>Fecha de contratación:</strong>{" "}
                        {emp.fecha_contratacion}
                      </p>
                      <p>
                        <strong>Puesto:</strong>{" "}
                        {emp.puesto?.nombre || "Sin asignar"}
                      </p>
                      <p>
                        <strong>Asistencia:</strong> {emp.estado_empleado}
                      </p>
                      <p>
                        <strong>Estado:</strong> {emp.estado_actividad_empleado}
                      </p>
                      <p>
                        <strong>Teléfono:</strong> {emp.telefono}
                      </p>
                      <p>
                        <strong>Email:</strong> {emp.email}
                      </p>
                      <p>
                        <strong>Estado de cuenta:</strong>{" "}
                        {emp.estado_cuenta === 1 ? "Activa" : "Desactivada"}
                      </p>
                    </div>
                  </div>

                  {/* -------- Controles -------- */}
                  <div className="employee_control_buttons_container">
                    {/* Selector rango */}
                    <select
                      className="employee_control_button_combobox"
                      value={thisRange.type}
                      onChange={(e) =>
                        setRangeByEmp((prev) => ({
                          ...prev,
                          [emp.id_empleado]: {
                            type: e.target.value as RangeType,
                            start: undefined,
                            end: undefined,
                          },
                        }))
                      }
                    >
                      <option value="hoy">Hoy</option>
                      <option value="7dias">Últimos 7 días</option>
                      <option value="30dias">Últimos 30 días</option>
                      <option value="personalizado">Personalizado</option>
                    </select>

                    {/* Inputs fechas si personalizado */}
                    {thisRange.type === "personalizado" && (
                      <>
                        <input
                          className="employee_control_button_combobox"
                          type="date"
                          value={thisRange.start || ""}
                          onChange={(e) =>
                            setRangeByEmp((prev) => ({
                              ...prev,
                              [emp.id_empleado]: {
                                ...thisRange,
                                start: e.target.value,
                              },
                            }))
                          }
                        />
                        <input
                          className="employee_control_button_combobox"
                          type="date"
                          value={thisRange.end || ""}
                          onChange={(e) =>
                            setRangeByEmp((prev) => ({
                              ...prev,
                              [emp.id_empleado]: {
                                ...thisRange,
                                end: e.target.value,
                              },
                            }))
                          }
                        />
                      </>
                    )}

                    {/* Botones exportar */}
                    <button
                      className="employee_control_button"
                      onClick={() => genPDF(emp)}
                    >
                      PDF asistencias
                    </button>
                    <button
                      className="employee_control_button_excel"
                      onClick={() => genExcel(emp)}
                    >
                      Excel asistencias
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
