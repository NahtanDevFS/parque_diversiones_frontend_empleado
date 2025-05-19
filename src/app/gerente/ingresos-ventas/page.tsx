"use client";

import React, { useEffect, useState } from "react";
import "./ingresos_ventas.css";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import TicketChart from "@/components/TicketChart";
import { supabase } from "./actions";
import { jsPDF } from "jspdf";
import { utils, writeFile } from 'xlsx';
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

type Ticket = { precio: number; fecha_compra: string; tipo_ticket: string };

type SummaryFilter = "today" | "month" | "year" | "custom";
type ChartFilter = "week" | "month" | "year" | "custom";
type GroupBy = "day" | "week" | "month" | "year";
type SortOrder = "asc" | "desc" | "newest" | "oldest";

export default function Ingresos_ventas_page() {
  const router = useRouter();

  /* ---------- ESTADOS GENERALES ---------- */
  const [selectedStatus, setSelectedStatus] = useState("En el almuerzo");

    const [showOnlyTotal, setShowOnlyTotal] = useState(false); // TOTAL-MOD ➊

  /* === Filtros Resumen de Ventas (compacto) === */
  const [salesFilter, setSalesFilter] = useState<SummaryFilter>("today");
  const [customSalesStart, setCustomSalesStart] = useState("");
  const [customSalesEnd, setCustomSalesEnd] = useState("");
  const [salesGroupBy, setSalesGroupBy] = useState<GroupBy>("day");
  const [salesSortOrder, setSalesSortOrder] = useState<SortOrder>("newest");
  const [salesTickets, setSalesTickets] = useState<Ticket[]>([]);

  /* === Filtros Resumen de Tickets Vendidos === */
  const [ticketsFilter, setTicketsFilter] = useState<SummaryFilter>("today");
  const [customTicketsStart, setCustomTicketsStart] = useState("");
  const [customTicketsEnd, setCustomTicketsEnd] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("todos");
  const [ticketsGroupBy, setTicketsGroupBy] = useState<GroupBy>("day");
  const [ticketsSortOrder, setTicketsSortOrder] = useState<SortOrder>("newest");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsByType, setTicketsByType] = useState<Ticket[]>([]);

  /* === Gráfica === */
  const [chartFilter, setChartFilter] = useState<ChartFilter>("week");
  const [customChartStart, setCustomChartStart] = useState("");
  const [customChartEnd, setCustomChartEnd] = useState("");
  const [chartGroupBy, setChartGroupBy] = useState<GroupBy>("day");
  const [chartTickets, setChartTickets] = useState<Ticket[]>([]);

  /* === Totales rápidos === */
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [annualTotal, setAnnualTotal] = useState(0);

  const [dayTypeCounts, setDayTypeCounts] = useState<Record<string, number>>({});
  const [monthTypeCounts, setMonthTypeCounts] = useState<Record<string, number>>(
    {}
  );
  const [annualTypeCounts, setAnnualTypeCounts] = useState<
    Record<string, number>
  >({});

  /* ---------- SESIÓN ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return void router.push("/");

    try {
      const session = JSON.parse(stored);
      const { id_puesto, id_empleado } = session;

      if (id_puesto !== 6) {
        supabase
          .from("empleado")
          .update({ estado_actividad_empleado: "En el módulo de ventas" })
          .eq("id_empleado", id_empleado);
      }

      if (id_puesto !== 3 && id_puesto !== 6) {
        MySwal.fire({
          title: "Acceso denegado",
          text: "No tienes permiso para acceder a este módulo",
          icon: "error",
          confirmButtonText: "Ok",
        }).then(() => router.push("/"));
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

  /* ---------- Totales rápidos (cards superiores) ---------- */
  const fetchTotalsWithCounts = async (range: "day" | "month" | "year") => {
    const now = new Date();
    let start: Date;
    if (range === "day")
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "month")
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const { data } = await supabase
      .from("ticket")
      .select("precio, tipo_ticket")
      .gte("fecha_compra", start.toISOString());

    if (!data) return;

    const total = (data as Ticket[]).reduce((s, t) => s + t.precio, 0);
    const counts = (data as Ticket[]).reduce<Record<string, number>>(
      (acc, t) => {
        acc[t.tipo_ticket] = (acc[t.tipo_ticket] || 0) + 1;
        return acc;
      },
      {}
    );

    if (range === "day") {
      setDayTotal(total);
      setDayTypeCounts(counts);
    } else if (range === "month") {
      setMonthTotal(total);
      setMonthTypeCounts(counts);
    } else setAnnualTotal(total), setAnnualTypeCounts(counts);
  };

  /* ---------- Obtener tickets (generic) ---------- */
  const fetchTickets = async (
    range: SummaryFilter,
    customStart: string,
    customEnd: string,
    setState: React.Dispatch<React.SetStateAction<Ticket[]>>
  ) => {
    let startDate: Date;
    let endDate: Date = new Date();

    switch (range) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "custom":
        if (!customStart || !customEnd) {
          MySwal.fire("Error", "Debes seleccionar ambas fechas", "warning");
          return;
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    const { data } = await supabase
      .from("ticket")
      .select("precio, fecha_compra, tipo_ticket")
      .gte("fecha_compra", startDate.toISOString())
      .lte("fecha_compra", endDate.toISOString())
      .order("fecha_compra", { ascending: false });

    if (data) setState(data as Ticket[]);
  };

  /* ---------- Filtrar por tipo ---------- */
  const filterTicketsByType = (type: string, base = tickets) => {
    setTicketsByType(
      type === "todos" ? [...base] : base.filter((t) => t.tipo_ticket === type)
    );
  };

  /* ---------- Agrupar + ordenar Tickets Vendidos ---------- */
  const getGroupedAndSortedTickets = () => {
  /* agrupar */
  const grouped = ticketsByType.reduce((acc: Record<string, Ticket[]>, t) => {
    const key = keyFromDate(new Date(t.fecha_compra), ticketsGroupBy);
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  /* helpers */
  const groupTotal = (arr: Ticket[]) => arr.reduce((s, t) => s + t.precio, 0);

  const keyToDate = (k: string): Date => {
    switch (ticketsGroupBy) {
      case "day":
        return new Date(k); // mm/dd/yyyy local
      case "week": {
        const [y, w] = k.split("-W");
        return new Date(Number(y), 0, 1 + (Number(w) - 1) * 7);
      }
      case "month": {
        const [y, m] = k.split("-");
        return new Date(Number(y), Number(m) - 1, 1);
      }
      case "year":
        return new Date(Number(k), 0, 1);
    }
  };

  /* ordenar */
  return Object.entries(grouped).sort(([ka, va], [kb, vb]) => {
    const dateA = keyToDate(ka).getTime();
    const dateB = keyToDate(kb).getTime();

    switch (ticketsSortOrder) {
      case "newest":
        return dateB - dateA;          // fechas
      case "oldest":
        return dateA - dateB;
      case "desc":
        return groupTotal(vb) - groupTotal(va); // monto Q
      case "asc":
        return groupTotal(va) - groupTotal(vb);
      default:
        return 0;
    }
  });
};

  /* ---------- ISO WEEK helper ---------- */
  const getISOWeek = (date: Date) => {
    const tmp = new Date(date.valueOf());
    tmp.setDate(tmp.getDate() - ((date.getDay() + 6) % 7) + 3);
    const firstThu = tmp.valueOf();
    tmp.setMonth(0, 1);
    if (tmp.getDay() !== 4) tmp.setMonth(0, 1 + ((4 - tmp.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThu - tmp.valueOf()) / 604800000);
  };

  /* ---------- Agrupados de Resumen Ventas ---------- */
  const aggregatedSalesSummary = salesTickets.reduce(
    (acc: Record<string, number>, t) => {
      const d = new Date(t.fecha_compra);
      let key = d.toLocaleDateString();
      if (salesGroupBy === "week")
        key = `${d.getFullYear()}-W${getISOWeek(d).toString().padStart(2, "0")}`;
      if (salesGroupBy === "month")
        key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      if (salesGroupBy === "year") key = `${d.getFullYear()}`;
      acc[key] = (acc[key] || 0) + t.precio;
      return acc;
    },
    {}
  );

  /* ---------- Gráfica ---------- */
   const fetchChartTickets = async (filter: ChartFilter) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    switch (filter) {
      case "week":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "custom":
        if (!customChartStart || !customChartEnd) {
          Swal.fire("Rango inválido", "Selecciona ambas fechas", "warning");
          return;
        }
        startDate = new Date(customChartStart);
        endDate = new Date(customChartEnd);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    let q = supabase
      .from("ticket")
      .select("precio, fecha_compra")
      .gte("fecha_compra", startDate.toISOString());
    if (endDate) q = q.lte("fecha_compra", endDate.toISOString());

    const { data } = await q;
    if (data) setChartTickets(data as Ticket[]);
  };

  const keyFromDate = (d: Date, group: GroupBy) => {
    switch (group) {
      case "day":
        return d.toLocaleDateString();
      case "week":
        return `${d.getFullYear()}-W${getISOWeek(d).toString().padStart(2, "0")}`;
      case "month":
        return `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      case "year":
        return `${d.getFullYear()}`;
    }
  };

  const aggregatedChart = chartTickets.reduce((acc: Record<string, number>, t) => {
    const key = keyFromDate(new Date(t.fecha_compra), chartGroupBy);
    acc[key] = (acc[key] || 0) + t.precio;
    return acc;
  }, {});

  

  /* ---------- Helpers formato ---------- */
  const formatKey = (key: string, group: GroupBy) => {
    if (group === "month") {
      const [y, m] = key.split("-");
      return new Date(Number(y), Number(m) - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
    }
    if (group === "week") {
    // key = "2025-W17"
    const [y, w] = key.split("-W").map(Number);

    // Obtener lunes de la semana ISO
    const monday = new Date(y, 0, 1 + (w - 1) * 7);
    while (monday.getDay() !== 1) monday.setDate(monday.getDate() - 1);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const diaInicio = monday.getDate();
    const diaFin = sunday.getDate();

    const mesInicio = monday.toLocaleString("es", { month: "short" });
    const mesFin = sunday.toLocaleString("es", { month: "short" });

    const rango =
      mesInicio === mesFin
        ? `${diaInicio}-${diaFin} ${mesInicio}`
        : `${diaInicio} ${mesInicio}-${diaFin} ${mesFin}`;

    return `Semana ${w} (${rango}) - ${y}`;
  }
    return key;
  };

    /* ---------- Etiquetas legibles para la gráfica ---------- */
  const aggregatedChartPretty = Object.fromEntries(
    Object.entries(aggregatedChart).map(([k, v]) => [
      formatKey(k, chartGroupBy), // convierte la clave
      v,
    ])
  );

  /* ---------- PDF Resumen Ventas ---------- */
  const exportSalesPDF = () => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const marginTop = 20;
  const marginBottom = 20;
  const watermark = () =>
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

  watermark();

  const titleMap: Record<SummaryFilter, string> = {
    today: "Resumen de ventas del día",
    month: "Resumen de ventas de los últimos 30 días",
    year: "Resumen de ventas de los últimos 12 meses",
    custom: `Resumen de ventas de ${customSalesStart} a ${customSalesEnd}`,
  };

  doc.setFontSize(18);
  doc.text(titleMap[salesFilter], 10, marginTop);
  let y = marginTop + 10;

  Object.entries(aggregatedSalesSummary)
    .sort(getSummaryComparator(salesSortOrder, salesGroupBy))
    .forEach(([k, v]) => {
      if (y > ph - marginBottom) {
        doc.addPage();
        watermark();
        y = marginTop;
      }
      doc.setFontSize(12);
      doc.text(`${formatKey(k, salesGroupBy)}: Q ${v}.00`, 10, y);
      y += 8;
    });

  doc.save(`Ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/* ---------- EXCEL Resumen Ventas ---------- */
const exportSalesExcel = () => {
  /* 1. Creamos un libro y una hoja */
  const wb = utils.book_new();
  const rows: any[][] = [
    ['Periodo', 'Total (Q)']
  ];

  /* 2. Rellenamos con los mismos datos que el PDF */
  Object.entries(aggregatedSalesSummary)
    .sort(getSummaryComparator(salesSortOrder, salesGroupBy))
    .forEach(([key, value]) =>
      rows.push([formatKey(key, salesGroupBy), value])
    );

  /* 3. Convertimos a hoja y la añadimos al libro */
  const ws = utils.aoa_to_sheet(rows);
  utils.book_append_sheet(wb, ws, 'Resumen ventas');

  /* 4. Descargamos */
  writeFile(
    wb,
    `Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

  /* ---------- PDF Tickets Vendidos ---------- */
  const exportTicketsPDF = () => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const marginTop = 20;
  const marginBottom = 20;

  /* Marca de agua */
  const watermark = () =>
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
  watermark();

  /* Título dinámico */
  const title =
    ticketTypeFilter === "todos"
      ? "Resumen de tickets (todos los tipos)"
      : `Resumen de tickets tipo ${ticketTypeFilter}`;

  doc.setFontSize(18).text(title, 10, marginTop);

  /* Indicador de modo compacto */
  if (showOnlyTotal) {
    doc.setFontSize(11).text("(Modo solo total)", 10, marginTop + 8);
  }

  /* Punto de partida del cursor Y */
  let y = marginTop + (showOnlyTotal ? 14 : 10);

  /* Recorremos los grupos (día / semana / mes / año) */
  getGroupedAndSortedTickets().forEach(([dateKey, ticketsArr]) => {
    /* Salto de página si es necesario */
    if (y > ph - marginBottom) {
      doc.addPage();
      watermark();
      y = marginTop;
    }

    /* Encabezado del grupo */
    doc.setFontSize(12).text(formatKey(dateKey, ticketsGroupBy), 10, y);
    y += 7;

    /* Detalle sólo si showOnlyTotal está desactivado */
    if (!showOnlyTotal) {
      ticketsArr.forEach((t) => {
        if (y > ph - marginBottom) {
          doc.addPage();
          watermark();
          y = marginTop;
        }
        doc.setFontSize(10).text(
          `${t.tipo_ticket}: Q ${
            t.precio
          }.00`,
          14,
          y
        );
        y += 6;
      });
    } else {
      /* pequeño espacio antes del total cuando ocultamos detalle */
      y += 2;
    }

    /* Línea total del grupo */
    const groupTotal = ticketsArr.reduce((s, t) => s + t.precio, 0);
    if (y > ph - marginBottom) {
      doc.addPage();
      watermark();
      y = marginTop;
    }
    doc.setFontSize(11).text(
      `Total: ${ticketsArr.length} tickets – Q ${groupTotal}.00`,
      10,
      y
    );
    y += 10;
  });

  /* Guardar archivo */
  doc.save(
    `Tickets_${ticketTypeFilter}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
};

/* ---------- EXCEL Tickets Vendidos ---------- */
/* ---------- EXCEL Tickets Vendidos ---------- */
const exportTicketsExcel = () => {
  const wb   = utils.book_new();
  const rows: any[][] = [];

  if (showOnlyTotal) {
    /* ➊ Solo totales → tabla compacta */
    rows.push(["Periodo", "Tickets", "Total (Q)"]);

    getGroupedAndSortedTickets().forEach(([key, arr]) => {
      const periodo = formatKey(key, ticketsGroupBy);
      const totalQ  = arr.reduce((s, t) => s + t.precio, 0);
      rows.push([periodo, arr.length, totalQ]);
    });

  } else {
    /* ➋ Detalle completo */
    rows.push(["Periodo", "Tipo", "Precio (Q)"]);

    getGroupedAndSortedTickets().forEach(([key, arr]) => {
      const periodo = formatKey(key, ticketsGroupBy);

      arr.forEach((t, i) => {
        rows.push([
          i === 0 ? periodo : "",        // sólo en la 1ª línea del bloque
          t.tipo_ticket,
          t.precio
        ]);
      });

      /* línea subtotal */
      const subtotal = arr.reduce((s, t) => s + t.precio, 0);
      rows.push(["", `TOTAL ${periodo}`, subtotal]);
      rows.push([]);                      // línea en blanco separadora
    });
  }

  const ws = utils.aoa_to_sheet(rows);
  utils.book_append_sheet(wb, ws, "Tickets");
  writeFile(
    wb,
    `Tickets_${ticketTypeFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    fetchTickets(salesFilter, customSalesStart, customSalesEnd, setSalesTickets);
  }, [salesFilter, customSalesStart, customSalesEnd]);

  useEffect(() => {
    fetchTickets(ticketsFilter, customTicketsStart, customTicketsEnd, setTickets);
  }, [ticketsFilter, customTicketsStart, customTicketsEnd]);

  useEffect(() => {
    filterTicketsByType(ticketTypeFilter);
  }, [ticketTypeFilter, tickets]);

  useEffect(() => {
    fetchTotalsWithCounts("day");
    fetchTotalsWithCounts("month");
    fetchTotalsWithCounts("year");
  }, []);

  useEffect(() => {
    fetchChartTickets(chartFilter);
  }, [chartFilter, customChartStart, customChartEnd]);

  /* ---------- RENDER ---------- */
  return (
    <LayoutWithSidebar>
      <div className="ingresos_ventas_page">
        <div className="dashboard">
          {/* --------- ESTADO EMPLEADO --------- */}
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

          <h1>Panel de Ventas de Tickets</h1>

          {/* --------- CARDS MONTOS --------- */}
          <section className="cards-summary">
            <div className="card">
              <h3>Ventas del Día</h3>
              <p>Q {dayTotal}.00</p>
            </div>
            <div className="card">
              <h3>Ventas últimos 30 días</h3>
              <p>Q {monthTotal}.00</p>
            </div>
            <div className="card">
              <h3>Ventas últimos 12 meses</h3>
              <p>Q {annualTotal}.00</p>
            </div>
          </section>

          {/* --------- RESUMEN DE VENTAS --------- */}
          <section className="compact-summary-container">
            <div className="summary-tabs">
              {(["today", "month", "year", "custom"] as SummaryFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setSalesFilter(f)}
                  className={salesFilter === f ? "active" : ""}
                >
                  {f === "today"
                    ? "Hoy"
                    : f === "month"
                    ? "Últimos 30 días"
                    : f === "year"
                    ? "Últimos 12 meses"
                    : "Personalizado"}
                </button>
              ))}
            </div>

            {salesFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customSalesStart}
                  onChange={(e) => setCustomSalesStart(e.target.value)}
                />
                <input
                  type="date"
                  value={customSalesEnd}
                  onChange={(e) => setCustomSalesEnd(e.target.value)}
                />
                <button
                  onClick={() =>
                    fetchTickets(
                      "custom",
                      customSalesStart,
                      customSalesEnd,
                      setSalesTickets
                    )
                  }
                  className="button_ventas"
                >
                  Aplicar
                </button>
              </div>
            )}

            <div className="filter-controls">
              <div className="group-by-control">
                <label>Agrupar por:</label>
                <select
                  value={salesGroupBy}
                  onChange={(e) => setSalesGroupBy(e.target.value as GroupBy)}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                  <option value="year">Año</option>
                </select>
              </div>

              <div className="sort-control">
                <label>Ordenar por:</label>
                <select
                  value={salesSortOrder}
                  onChange={(e) => setSalesSortOrder(e.target.value as SortOrder)}
                >
                  <option value="newest">Más reciente primero</option>
                  <option value="oldest">Más antiguo primero</option>
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </div>
            </div>

            <div className="compact-summary-content">
              <h3>Resumen de Ventas</h3>
              <div className="summary-scrollable">
                {Object.entries(aggregatedSalesSummary)
                  .sort(getSummaryComparator(salesSortOrder, salesGroupBy))
                  .map(([k, v]) => (
                    <div key={k} className="summary-item">
                      <span>{formatKey(k, salesGroupBy)}</span>
                      <span>Q {v}.00</span>
                    </div>
                  ))}
              </div>
              <button className="export-btn" onClick={exportSalesPDF}>
                Exportar a PDF
              </button>
              <button className="export-btn-excel" onClick={exportSalesExcel}>
                Exportar a Excel
              </button>
            </div>
          </section>

          {/* --------- CARDS POR TIPO --------- */}
          <section className="cards-type-summary">
            <h1>Cantidad de tickets vendidos por tipo</h1>
            <div className="card-type_general-card">
              {["juegos", "completo", "entrada"].map((tipo) => (
                <div key={tipo} className={`card-type ${tipo}-card`}>
                  <h3>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h3>
                  <p>Hoy: {dayTypeCounts[tipo] || 0}</p>
                  <p>últimos 30 días: {monthTypeCounts[tipo] || 0}</p>
                  <p>últimos 12 meses: {annualTypeCounts[tipo] || 0}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --------- RESUMEN TICKETS VENDIDOS --------- */}
          <section className="tickets-by-type">
            <h2>Resumen de Tickets Vendidos</h2>

            <div className="summary-filters">
              {(["today", "month", "year", "custom"] as SummaryFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTicketsFilter(f)}
                  className={ticketsFilter === f ? "active" : "button_ventas"}
                >
                  {f === "today"
                    ? "Hoy"
                    : f === "month"
                    ? "Últimos 30 días"
                    : f === "year"
                    ? "Últimos 12 meses"
                    : "Personalizado"}
                </button>
              ))}
            </div>

            {ticketsFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customTicketsStart}
                  onChange={(e) => setCustomTicketsStart(e.target.value)}
                />
                <input
                  type="date"
                  value={customTicketsEnd}
                  onChange={(e) => setCustomTicketsEnd(e.target.value)}
                />
                <button
                  onClick={() =>
                    fetchTickets(
                      "custom",
                      customTicketsStart,
                      customTicketsEnd,
                      setTickets
                    )
                  }
                  className="button_ventas"
                >
                  Aplicar
                </button>
              </div>
            )}

            <div className="filter-controls">
              <div className="ticket-type-filter">
                <label>Tipo de ticket:</label>
                <select
                  value={ticketTypeFilter}
                  onChange={(e) => {
                    setTicketTypeFilter(e.target.value);
                    filterTicketsByType(e.target.value, tickets);
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="juegos">Juegos</option>
                  <option value="completo">Completo</option>
                  <option value="entrada">Entrada</option>
                </select>
              </div>

              <div className="group-by-control">
                <label>Agrupar por:</label>
                <select
                  value={ticketsGroupBy}
                  onChange={(e) => setTicketsGroupBy(e.target.value as GroupBy)}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                  <option value="year">Año</option>
                </select>
              </div>

              <div className="sort-control">
                <label>Ordenar por:</label>
                <select
                  value={ticketsSortOrder}
                  onChange={(e) =>
                    setTicketsSortOrder(e.target.value as SortOrder)
                  }
                >
                  <option value="newest">Más reciente primero</option>
                  <option value="oldest">Más antiguo primero</option>
                  <option value="desc">Mayor a menor</option>   {/* nuevo */}
                  <option value="asc">Menor a mayor</option>    {/* nuevo */}
                </select>
              </div>
              {/* TOTAL-MOD ➋  NUEVO CHECK */}
              <div className="total-only-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showOnlyTotal}
                    onChange={(e) => setShowOnlyTotal(e.target.checked)}
                  />{" "}
                  Mostrar solo total
                </label>
              </div>
            </div>

            <div className="tickets-scrollable">
              {getGroupedAndSortedTickets().length ? (
                getGroupedAndSortedTickets().map(([date, arr]) => (
                  <div key={date} className="ticket-group">
                    <h4>{formatKey(date, ticketsGroupBy)}</h4>
                    {/* TOTAL-MOD ➌   DETALLE SOLO SI no showOnlyTotal */}
                    {!showOnlyTotal &&
                      arr.map((t, i) => (
                        <div key={i} className="ticket-item">
                          <span>
                            {/*{new Date(t.fecha_compra).toLocaleTimeString()}*/}
                          </span>
                          <span>Tipo: {t.tipo_ticket}</span>
                          <span>Q {t.precio}.00</span>
                        </div>
                      ))}
                    <div className="ticket-group-total">
                      Total: {arr.length} tickets – Q{" "}
                      {arr.reduce((s, tt) => s + tt.precio, 0)}
                      .00
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay tickets para mostrar con los filtros actuales</p>
              )}
            </div>
            <div className="ticket-type-controls">
              <button className="export-btn" onClick={exportTicketsPDF}>
                Exportar a PDF
              </button>
              <button className="export-btn-excel" onClick={exportTicketsExcel}>
                Exportar a Excel
              </button>
            </div>
          </section>

          {/* --------- GRÁFICA --------- */}
          <section className="chart-section">
            <h2>Gráfica de Ventas</h2>
            <div className="chart-filters">
              <div className="chart-tabs">
              {(["week", "month", "year", "custom"] as ChartFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setChartFilter(f)}
                  className={chartFilter === f ? "active" : "button_ventas"}
                >
                  {f === "week"
                    ? "Última Semana"
                    : f === "month"
                    ? "Últimos 30 días"
                    : f === "year"
                    ? "Últimos 12 meses"
                    : "Personalizado"}
                </button>
              ))}
              </div>
              {/* NUEVO COMBOBOX AGRUPAR */}
              <div className="group-by-control">
                <label>Agrupar por:</label>
                <select
                  value={chartGroupBy}
                  onChange={(e) => setChartGroupBy(e.target.value as GroupBy)}
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                  <option value="year">Año</option>
                </select>
              </div>
            </div>

            {chartFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customChartStart}
                  onChange={(e) => setCustomChartStart(e.target.value)}
                />
                <input
                  type="date"
                  value={customChartEnd}
                  onChange={(e) => setCustomChartEnd(e.target.value)}
                />
                <button
                  onClick={() => fetchChartTickets("custom")}
                  className="button_ventas"
                >
                  Aplicar
                </button>
              </div>
            )}

            <div className="chart">
              <TicketChart data={aggregatedChartPretty} />
            </div>
          </section>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

/* ---------- Comparator genérico ---------- */
function getSummaryComparator(
  order: SortOrder,
  groupBy: GroupBy
): (a: [string, number], b: [string, number]) => number {
  const keyToDate = (k: string) => {
    if (groupBy === "week") {
      const [y, w] = k.split("-W");
      return new Date(Number(y), 0, 1 + (Number(w) - 1) * 7);
    }
    if (groupBy === "month") {
      const [y, m] = k.split("-");
      return new Date(Number(y), Number(m) - 1, 1);
    }
    if (groupBy === "year") return new Date(Number(k), 0, 1);
    return new Date(k);
  };

  return (a, b) => {
    if (order === "asc") return a[1] - b[1];
    if (order === "desc") return b[1] - a[1];
    if (order === "newest") return keyToDate(b[0]).getTime() - keyToDate(a[0]).getTime();
    if (order === "oldest") return keyToDate(a[0]).getTime() - keyToDate(b[0]).getTime();
    return 0;
  };
}
