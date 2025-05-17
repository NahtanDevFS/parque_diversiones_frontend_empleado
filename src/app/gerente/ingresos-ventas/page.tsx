"use client";

import React, { useEffect, useState } from "react";
import "./ingresos_ventas.css";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import TicketChart from "@/components/TicketChart";
import { supabase } from "./actions";
import { jsPDF } from "jspdf";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

type Ticket = {
  precio: number;
  fecha_compra: string;
  tipo_ticket: string;
};

type SummaryFilter = "today" | "month" | "year" | "custom";
type ChartFilter = "week" | "month" | "year" | "custom";
type GroupBy = "day" | "week" | "month" | "year";
type SortOrder = "asc" | "desc" | "newest" | "oldest";

export default function Ingresos_ventas_page() {
  const router = useRouter();

  /* ---------- ESTADOS GENERALES ---------- */
  const [selectedStatus, setSelectedStatus] = useState("En el almuerzo");

  // Filtro global (lo usan los dos resúmenes)
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Orden y agrupación del resumen compacto
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  // Tickets vendidos por tipo
  const [ticketTypeFilter, setTicketTypeFilter] = useState("todos");
  const [ticketsGroupBy, setTicketsGroupBy] = useState<GroupBy>("day");
  const [ticketsSortOrder, setTicketsSortOrder] = useState<SortOrder>("newest");

  // Datos
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsByType, setTicketsByType] = useState<Ticket[]>([]);
  const [chartTickets, setChartTickets] = useState<Ticket[]>([]);

  // Filtros de la gráfica
  const [chartFilter, setChartFilter] = useState<ChartFilter>("week");
  const [customChartStart, setCustomChartStart] = useState("");
  const [customChartEnd, setCustomChartEnd] = useState("");

  // Totales monetarios
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [annualTotal, setAnnualTotal] = useState(0);

  // Conteos por tipo
  const [dayTypeCounts, setDayTypeCounts] = useState<Record<string, number>>(
    {}
  );
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

      // Estado automático
      (async () => {
        if (id_puesto !== 6) {
          const { error } = await supabase
            .from("empleado")
            .update({ estado_actividad_empleado: "En el módulo de ventas" })
            .eq("id_empleado", id_empleado);
          if (error) console.error("Error al actualizar estado automático:", error);
        }
      })();

      // Control de acceso
      if (session.id_puesto !== 3 && session.id_puesto !== 6) {
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

  /* ---------- ACTUALIZAR ESTADO MANUAL ---------- */
  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem("employeeSession");
    if (!stored) return;
    const session = JSON.parse(stored);
    await supabase
      .from("empleado")
      .update({ estado_actividad_empleado: selectedStatus })
      .eq("id_empleado", session.id_empleado);
    MySwal.fire("Éxito", "Estado actualizado a " + selectedStatus, "success");
  };

  /* ---------- TOTALES RÁPIDOS ---------- */
  const fetchTotalsWithCounts = async (range: "day" | "month" | "year") => {
    const now = new Date();
    let start: Date;
    if (range === "day")
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "month")
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const { data, error } = await supabase
      .from("ticket")
      .select("precio, tipo_ticket")
      .gte("fecha_compra", start.toISOString());

    if (error) {
      console.error(error);
      return;
    }

    const total = (data as Ticket[]).reduce((s, t) => s + t.precio, 0);
    const counts = (data as Ticket[]).reduce<Record<string, number>>(
      (acc, t) => {
        const tipo = t.tipo_ticket || "desconocido";
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      },
      {}
    );

    if (range === "day") {
      setDayTotal(total);
      setDayTypeCounts(counts);
    }
    if (range === "month") {
      setMonthTotal(total);
      setMonthTypeCounts(counts);
    }
    if (range === "year") {
      setAnnualTotal(total);
      setAnnualTypeCounts(counts);
    }
  };

  /* ---------- OBTENER TICKETS (RESÚMENES) ---------- */
  const fetchTickets = async (range: SummaryFilter) => {
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
        if (!customStartDate || !customEndDate) {
          MySwal.fire("Error", "Debes seleccionar ambas fechas", "warning");
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    const { data, error } = await supabase
      .from("ticket")
      .select("precio, fecha_compra, tipo_ticket")
      .gte("fecha_compra", startDate.toISOString())
      .lte("fecha_compra", endDate.toISOString())
      .order("fecha_compra", { ascending: false });

    if (error) {
      console.error("Error fetching tickets:", error);
      MySwal.fire("Error", "No se pudieron obtener los tickets", "error");
      return;
    }

    if (data) {
      setTickets(data as Ticket[]);
      filterTicketsByType(ticketTypeFilter, data as Ticket[]);
    }
  };

  /* ---------- FILTRO POR TIPO ---------- */
  const filterTicketsByType = (type: string, base?: Ticket[]) => {
    const data = base || tickets;
    const filtered =
      type === "todos" ? [...data] : data.filter((t) => t.tipo_ticket === type);
    setTicketsByType(filtered);
  };

  /* ---------- GROUP + SORT RESUMEN TICKETS ---------- */
  const getGroupedAndSortedTickets = () => {
    const grouped = ticketsByType.reduce(
      (acc: Record<string, Ticket[]>, ticket) => {
        const date = new Date(ticket.fecha_compra);
        let key: string;

        switch (ticketsGroupBy) {
          case "day":
            key = date.toLocaleDateString();
            break;
          case "week":
            key = `${date.getFullYear()}-W${getISOWeek(date)
              .toString()
              .padStart(2, "0")}`;
            break;
          case "month":
            key = `${date.getFullYear()}-${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}`;
            break;
          case "year":
            key = `${date.getFullYear()}`;
            break;
          default:
            key = date.toLocaleDateString();
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(ticket);
        return acc;
      },
      {}
    );

    const entries = Object.entries(grouped);

    /* orden */
    const comparator = (a: string, b: string, dir: "asc" | "desc") =>
      dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);

    return entries.sort(([a], [b]) => {
      switch (ticketsSortOrder) {
        case "newest":
          return comparator(a, b, "desc");
        case "oldest":
          return comparator(a, b, "asc");
        default:
          return 0;
      }
    });
  };

  /* ---------- EXPORTAR PDF (Tickets) ---------- */
  const handleExportTicketsPDF = () => {
    const doc = new jsPDF();
    const watermark = "/marca_agua_logo_circular.png";
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const iw = 180,
      ih = 180;
    doc.addImage(watermark, "PNG", (pw - iw) / 2, (ph - ih) / 2, iw, ih, "", "FAST");

    const title =
      ticketTypeFilter === "todos"
        ? "Resumen de tickets (todos los tipos)"
        : `Resumen de tickets tipo ${ticketTypeFilter}`;

    doc.setFontSize(18);
    doc.text(title, 10, 20);

    let y = 30;
    getGroupedAndSortedTickets().forEach(([date, tks]) => {
      doc.setFontSize(12);
      doc.text(formatKey(date, true), 10, y);
      y += 8;

      tks.forEach((t) => {
        doc.setFontSize(10);
        doc.text(
          `${new Date(t.fecha_compra).toLocaleTimeString()} - ${t.tipo_ticket}: Q ${t.precio}.00`,
          15,
          y
        );
        y += 6;
      });

      const total = tks.reduce((s, t) => s + t.precio, 0);
      doc.text(`Total: ${tks.length} tickets - Q ${total}.00`, 10, y);
      y += 10;
    });

    doc.save(
      `Tickets_${ticketTypeFilter}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  /* ---------- CAMBIOS DE FILTRO GLOBAL ---------- */
  const handleSummaryRangeChange = (range: SummaryFilter) => {
    setSummaryFilter(range);
    if (range !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  /* ---------- ISO WEEK ---------- */
  const getISOWeek = (date: Date) => {
    const tmp = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    tmp.setDate(tmp.getDate() - dayNumber + 3);
    const firstThursday = tmp.valueOf();
    tmp.setMonth(0, 1);
    if (tmp.getDay() !== 4)
      tmp.setMonth(0, 1 + ((4 - tmp.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - tmp.valueOf()) / 604800000);
  };

  /* ---------- GRÁFICA ---------- */
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

    let query = supabase
      .from("ticket")
      .select("precio, fecha_compra")
      .gte("fecha_compra", startDate.toISOString());
    if (endDate) query = query.lte("fecha_compra", endDate.toISOString());

    const { data } = await query;
    if (data) setChartTickets(data as Ticket[]);
  };

  /* ---------- AGREGADOS ---------- */
  const aggregatedSummary = tickets.reduce((acc: Record<string, number>, t) => {
    const d = new Date(t.fecha_compra);
    let key: string;
    switch (groupBy) {
      case "day":
        key = d.toLocaleDateString();
        break;
      case "week":
        key = `${d.getFullYear()}-W${getISOWeek(d).toString().padStart(2, "0")}`;
        break;
      case "month":
        key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        break;
      case "year":
        key = `${d.getFullYear()}`;
        break;
    }
    acc[key] = (acc[key] || 0) + t.precio;
    return acc;
  }, {});

  const aggregatedChart = chartTickets.reduce(
    (acc: Record<string, number>, t) => {
      const d = new Date(t.fecha_compra).toLocaleDateString();
      acc[d] = (acc[d] || 0) + t.precio;
      return acc;
    },
    {}
  );

  /* ---------- FORMATO DE LLAVE ---------- */
  const formatKey = (key: string, forTickets = false) => {
    const currentGroupBy = forTickets ? ticketsGroupBy : groupBy;

    if (currentGroupBy === "month") {
      const [y, m] = key.split("-");
      const date = new Date(Number(y), Number(m) - 1);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    }
    if (currentGroupBy === "week") {
      const [y, w] = key.split("-W");
      return `Semana ${w} - ${y}`;
    }
    return key;
  };

  /* ---------- EXPORT PDF RESUMEN COMPACTO ---------- */
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const watermark = "/marca_agua_logo_circular.png";
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const iw = 180,
      ih = 180;
    doc.addImage(watermark, "PNG", (pw - iw) / 2, (ph - ih) / 2, iw, ih, "", "FAST");

    const titles: Record<SummaryFilter, string> = {
      today: "Resumen de ventas del día",
      month: "Resumen de ventas del último mes",
      year: "Resumen de ventas del último año",
      custom: `Resumen de ventas de ${customStartDate} a ${customEndDate}`,
    };

    doc.setFontSize(18);
    doc.text(titles[summaryFilter], 10, 20);

    let y = 30;
    Object.entries(aggregatedSummary).forEach(([date, total]) => {
      doc.text(`${formatKey(date)}: Q ${total}.00`, 10, y);
      y += 8;
    });

    doc.save(`${titles[summaryFilter]}.pdf`);
  };

  /* ---------- EFECTOS ---------- */
  useEffect(() => {
    fetchTickets(summaryFilter);
  }, [summaryFilter, customStartDate, customEndDate]);

  useEffect(() => {
    filterTicketsByType(ticketTypeFilter);
  }, [ticketTypeFilter]);

  useEffect(() => {
    fetchTotalsWithCounts("day");
    fetchTotalsWithCounts("month");
    fetchTotalsWithCounts("year");
  }, []);

  useEffect(() => {
    fetchChartTickets(chartFilter);
  }, [chartFilter]);

  /* ---------- RENDER ---------- */
  return (
    <LayoutWithSidebar>
      <div className="ingresos_ventas_page">
        <div className="dashboard">
          {/* ---------- ESTADO EMPLEADO ---------- */}
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

          {/* ---------- CARDS MONTOS ---------- */}
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

          {/* ---------- RESUMEN COMPACTO ---------- */}
          <section className="compact-summary-container">
            <div className="summary-tabs">
              {(["today", "month", "year", "custom"] as SummaryFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => handleSummaryRangeChange(f)}
                    className={summaryFilter === f ? "active" : ""}
                  >
                    {f === "today"
                      ? "Hoy"
                      : f === "month"
                      ? "Últimos 30 días"
                      : f === "year"
                      ? "Últimos 12 meses"
                      : "Personalizado"}
                  </button>
                )
              )}
            </div>

            {summaryFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
                <button
                  onClick={() => fetchTickets("custom")}
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
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
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
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
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
                {Object.entries(aggregatedSummary)
                  .sort(getSummaryComparator(sortOrder, groupBy) as any)
                  .map(([date, total]) => (
                    <div key={date} className="summary-item">
                      <span>{formatKey(date)}</span>
                      <span>Q {total}.00</span>
                    </div>
                  ))}
              </div>
              <button className="export-btn" onClick={handleExportPDF}>
                Exportar a PDF
              </button>
            </div>
          </section>

          {/* ---------- CARDS POR TIPO ---------- */}
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

          {/* ---------- RESUMEN TICKETS POR TIPO ---------- */}
          <section className="tickets-by-type">
            <h2>Resumen de Tickets Vendidos</h2>

            <div className="ticket-type-controls">
              <div className="ticket-type-filter">
                <label>Tipo de ticket:</label>
                <select
                  value={ticketTypeFilter}
                  onChange={(e) => {
                    setTicketTypeFilter(e.target.value);
                    filterTicketsByType(e.target.value);
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="juegos">Juegos</option>
                  <option value="completo">Completo</option>
                  <option value="entrada">Entrada</option>
                </select>
              </div>

              <button className="export-btn" onClick={handleExportTicketsPDF}>
                Exportar a PDF
              </button>
            </div>

            {/* Filtros de fecha (reutilizamos summaryFilter) */}
            <div className="summary-filters">
              {(["today", "month", "year", "custom"] as SummaryFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => handleSummaryRangeChange(f)}
                    className={summaryFilter === f ? "active" : ""}
                  >
                    {f === "today"
                      ? "Hoy"
                      : f === "month"
                      ? "Últimos 30 días"
                      : f === "year"
                      ? "Últimos 12 meses"
                      : "Personalizado"}
                  </button>
                )
              )}
            </div>

            {summaryFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
                <button
                  onClick={() => fetchTickets("custom")}
                  className="button_ventas"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Controles de agrupación y orden */}
            <div className="filter-controls">
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
                  onChange={(e) => setTicketsSortOrder(e.target.value as SortOrder)}
                >
                  <option value="newest">Más reciente primero</option>
                  <option value="oldest">Más antiguo primero</option>
                </select>
              </div>
            </div>

            <div className="tickets-scrollable">
              {getGroupedAndSortedTickets().length ? (
                getGroupedAndSortedTickets().map(([date, tks]) => (
                  <div key={date} className="ticket-group">
                    <h4>{formatKey(date, true)}</h4>
                    {tks.map((t, i) => (
                      <div key={i} className="ticket-item">
                        <span>{new Date(t.fecha_compra).toLocaleTimeString()}</span>
                        <span>Tipo: {t.tipo_ticket}</span>
                        <span>Q {t.precio}.00</span>
                      </div>
                    ))}
                    <div className="ticket-group-total">
                      Total: {tks.length} tickets – Q{" "}
                      {tks.reduce((s, tt) => s + tt.precio, 0)}
                      .00
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay tickets para mostrar con los filtros actuales</p>
              )}
            </div>
          </section>

          {/* ---------- GRÁFICA ---------- */}
          <section className="chart-section">
            <h2>Gráfica de Ventas</h2>
            <div className="chart-filters">
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
              <TicketChart data={aggregatedChart} />
            </div>
          </section>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

/* ---------- ORDEN RESUMEN COMPACTO ---------- */
function getSummaryComparator(order: SortOrder, groupBy: GroupBy): (a: [string, number], b: [string, number]) => number {
  const dateKeyToDate = (k: string) => {
    if (groupBy === "week") {
      const [y, w] = k.split("-W");
      const firstJan = new Date(Number(y), 0, 1);
      const days = (Number(w) - 1) * 7;
      return new Date(firstJan.setDate(firstJan.getDate() + days));
    }
    if (groupBy === "month") {
      const [y, m] = k.split("-");
      return new Date(Number(y), Number(m) - 1, 1);
    }
    if (groupBy === "year") return new Date(Number(k), 0, 1);
    return new Date(k);
  };

  return ([a], [b]: [string, number]) => {
    switch (order) {
      case "asc":
        return aggregatedCompare(a, b);
      case "desc":
        return aggregatedCompare(b, a);
      case "newest":
        return dateKeyToDate(b).getTime() - dateKeyToDate(a).getTime();
      case "oldest":
        return dateKeyToDate(a).getTime() - dateKeyToDate(b).getTime();
      default:
        return 0;
    }
  };

  function aggregatedCompare(x: string, y: string) {
    return Number(x) - Number(y);
  }
}
