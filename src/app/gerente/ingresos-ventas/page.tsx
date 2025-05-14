"use client";

import React, { useEffect, useState } from 'react';
import './ingresos_ventas.css';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import TicketChart from '@/components/TicketChart';
import { supabase } from './actions';
import { jsPDF } from "jspdf";
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Ticket = {
  precio: number;
  fecha_compra: string;
};

type SummaryFilter = 'today' | 'month' | 'year' | 'custom';

type ChartFilter = 'week' | 'month' | 'year' | 'custom';


export default function Ingresos_ventas_page() {
  const router = useRouter();

  // Estado para el selector de actividad manual
  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

  // Filtros resumen y gráfica
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('today');
  const [chartTickets, setChartTickets] = useState<Ticket[]>([]);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('week');

  // Rango personalizado resumen
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

    // Rango personalizado gráfica
  const [customChartStart, setCustomChartStart] = useState<string>('');
  const [customChartEnd, setCustomChartEnd] = useState<string>('');

  // Totales monetarios
  const [dayTotal,setDayTotal]=useState(0);
  const [monthTotal,setMonthTotal]=useState(0);
  const [annualTotal,setAnnualTotal]=useState(0);

  // Conteos por tipo
  const [dayTypeCounts,setDayTypeCounts]=useState<Record<string,number>>({});
  const [monthTypeCounts,setMonthTypeCounts]=useState<Record<string,number>>({});
  const [annualTypeCounts,setAnnualTypeCounts]=useState<Record<string,number>>({});

  // Validación sesión
  useEffect(()=>{
    const stored=localStorage.getItem('employeeSession');
    if(!stored) return void router.push('/');
    try{
      const session=JSON.parse(stored);
      const { id_puesto, id_empleado } = session;

      // Función async para update
      (async () => {
        if (id_puesto !== 6) {
          const { data, error } = await supabase
            .from('empleado')
            .update({ estado_actividad_empleado: 'En el módulo de ventas' })
            .eq('id_empleado', id_empleado);
          if (error) console.error('Error al actualizar estado automático:', error);
          else console.log('Estado automático actualizado:', data);
        }
      })();

      // Control de acceso
      if(session.id_puesto!==3&&session.id_puesto!==6){
        MySwal.fire({
          title:'Acceso denegado',
          text:'No tienes permiso para acceder a este módulo',
          icon:'error',
          confirmButtonText:'Ok'
        }).then(()=>router.push('/'));
      }
    }catch{router.push('/');}
  },[router]);

  // Handler para actualizar estado desde el combobox
  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem('employeeSession');
    if (!stored) return;
    const session = JSON.parse(stored);
    await supabase
      .from('empleado')
      .update({ estado_actividad_empleado: selectedStatus })
      .eq('id_empleado', session.id_empleado);
    MySwal.fire('Éxito', 'Estado actualizado a ' + selectedStatus, 'success');
  };

  // Fetch totales + conteos
  const fetchTotalsWithCounts=async(range:'day'|'month'|'year')=>{
    const now=new Date();
    let start:Date;
    if(range==='day') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    else if(range==='month') start=new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
    else start=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());

    const { data, error } = await supabase
      .from('ticket')
      .select('precio, tipo_ticket')
      .gte('fecha_compra', start.toISOString());
    if(error){ console.error(error); return; }

    const total=(data as any[]).reduce((s,t)=>s+t.precio,0);
    const counts=(data as any[]).reduce<Record<string,number>>((acc,t)=>{
      const tipo=t.tipo_ticket||'desconocido'; acc[tipo]=(acc[tipo]||0)+1; return acc;
    },{});

    if(range==='day'){ setDayTotal(total); setDayTypeCounts(counts); }
    if(range==='month'){ setMonthTotal(total); setMonthTypeCounts(counts); }
    if(range==='year'){ setAnnualTotal(total); setAnnualTypeCounts(counts); }
  };

  // Fetch resumen
  const fetchTickets = async (filter: SummaryFilter) => {
    let startDate: Date;
    let endDate: Date | undefined;
    const now = new Date();
    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          Swal.fire('Rango inválido', 'Por favor selecciona ambas fechas', 'warning');
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        // Extiende hasta fin de día
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    let query = supabase.from('ticket').select('precio, fecha_compra').gte('fecha_compra', startDate.toISOString());
    if (endDate) {
      query = query.lte('fecha_compra', endDate.toISOString());
    }
    const { data } = await query;
    if (data) setTickets(data as Ticket[]);
  };

  // Fetch gráfica
  const fetchChartTickets = async (filter: ChartFilter) => {
    let startDate: Date;
    let endDate: Date | undefined;
    const now = new Date();

    switch (filter) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (!customChartStart || !customChartEnd) {
          Swal.fire('Rango inválido', 'Selecciona ambas fechas', 'warning');
          return;
        }
        startDate = new Date(customChartStart);
        endDate = new Date(customChartEnd);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    let query = supabase.from('ticket').select('precio, fecha_compra').gte('fecha_compra', startDate.toISOString());
    if (endDate) query = query.lte('fecha_compra', endDate.toISOString());

    const { data } = await query;
    if (data) setChartTickets(data as Ticket[]);
  };


  useEffect(()=>{ fetchTickets(summaryFilter); },[summaryFilter]);
  useEffect(()=>{ fetchChartTickets(chartFilter); },[chartFilter]);
  useEffect(()=>{
    fetchTotalsWithCounts('day');
    fetchTotalsWithCounts('month');
    fetchTotalsWithCounts('year');
  },[]);

  // — agrupar por fecha para lista y gráfica
  const aggregatedSummary = tickets.reduce((acc: Record<string, number>, t) => {
    const d = new Date(t.fecha_compra).toLocaleDateString();
    acc[d] = (acc[d] || 0) + t.precio;
    return acc;
  }, {});

  const aggregatedChart = chartTickets.reduce((acc: Record<string, number>, t) => {
    const d = new Date(t.fecha_compra).toLocaleDateString();
    acc[d] = (acc[d] || 0) + t.precio;
    return acc;
  }, {});

  // — exportar resumen a PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const watermark = "/marca_agua_logo_circular.png";
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const iw = 180, ih = 180;
    doc.addImage(watermark, "PNG", (pw - iw) / 2, (ph - ih) / 2, iw, ih, "", "FAST");

    let title = '';
    switch (summaryFilter) {
      case 'today': title = 'Resumen de ventas del día'; break;
      case 'month': title = 'Resumen de ventas del último mes'; break;
      case 'year': title = 'Resumen de ventas del último año'; break;
      case 'custom': title = `Resumen de ventas de ${customStartDate} a ${customEndDate}`; break;
    }

    doc.setFontSize(18);
    doc.text(title, 10, 20);
    doc.setFontSize(12);
    let y = 30;
    Object.entries(aggregatedSummary).forEach(([date, total]) => {
      doc.text(`${date}: Q ${total}.00`, 10, y);
      y += 10;
    });
    doc.save(`${title}.pdf`);
  };

  return (
    <LayoutWithSidebar>
      <div className="ingresos_ventas_page">
        <div className="dashboard">
          {/*SELECCIÓN DE ESTADO*/}
          <div className="estado-row">
            <h4>Acciones para notificar cese de actividades:</h4>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="En el almuerzo">En el almuerzo</option>
              <option value="Turno cerrado">Turno cerrado</option>
            </select>
            <button onClick={handleStatusUpdate} className="button_ventas">
              Actualizar estado
            </button>
          </div>

          <h1>Panel de Ventas de Tickets</h1>

          {/* Cards de Montos */}
          <section className="cards-summary">
            <div className="card">
              <h3>Ventas del Día</h3>
              <p>Q {dayTotal}.00</p>
            </div>
            <div className="card">
              <h3>Ventas del Mes</h3>
              <p>Q {monthTotal}.00</p>
            </div>
            <div className="card">
              <h3>Ventas del Año</h3>
              <p>Q {annualTotal}.00</p>
            </div>
          </section>

          {/* Cards por Tipo de Ticket */}
          <section className="cards-type-summary">
            <h1>Cantidad de tickets vendidos por tipo</h1>
            <div className='card-type_general-card'>
              <div className="card-type juegos-card">
                <h3>Juegos</h3>
                <p>Hoy: {dayTypeCounts.juegos||0}</p>
                <p>Mes: {monthTypeCounts.juegos||0}</p>
                <p>Año: {annualTypeCounts.juegos||0}</p>
              </div>
              <div className="card-type completo-card">
                <h3>Completo</h3>
                <p>Hoy: {dayTypeCounts.completo||0}</p>
                <p>Mes: {monthTypeCounts.completo||0}</p>
                <p>Año: {annualTypeCounts.completo||0}</p>
              </div>
              <div className="card-type entrada-card">
                <h3>Entrada</h3>
                <p>Hoy: {dayTypeCounts.entrada||0}</p>
                <p>Mes: {monthTypeCounts.entrada||0}</p>
                <p>Año: {annualTypeCounts.entrada||0}</p>
              </div>
            </div>
          </section>

          {/* — BOTONES DE FILTRO */}
          <section className='section-resumen-ventas-buttons'>
            <h1>Resumen de Ventas de tickets</h1>
            <div className="summary-filters">
              <h2>Filtrar resumen de ventas por:</h2>
              <div className='summary-filter-buttons'>
                <button onClick={() => setSummaryFilter('today')} className={summaryFilter === 'today' ? 'active' : 'button_ventas'}>
                  Hoy
                </button>
                <button onClick={() => setSummaryFilter('month')} className={summaryFilter === 'month' ? 'active' : 'button_ventas'}>
                  Último Mes
                </button>
                <button onClick={() => setSummaryFilter('year')} className={summaryFilter === 'year' ? 'active' : 'button_ventas'}>
                  Último Año
                </button>
                <button onClick={() => setSummaryFilter('custom')} className={summaryFilter === 'custom' ? 'active' : 'button_ventas'}>Personalizado</button>
              </div>
                {summaryFilter === 'custom' && (
                  <div className="custom-date-range">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                    />
                    <button onClick={() => fetchTickets('custom')} className="button_ventas">Aplicar</button>
                  </div>
                )}
            </div>
          </section>

          {/* — LISTADO DE RESUMEN */}
          <section className="summary">
            <h2>Resumen de Ventas</h2>
            <ul>
              {Object.entries(aggregatedSummary).map(([date, total]) => (
                <li key={date}>
                  <span>{date}:</span>
                  <span>Q {total}.00</span>
                </li>
              ))}
            </ul>
            <div className='export-btn-container'>
              <button className="export-btn" onClick={handleExportPDF}>Exportar a PDF</button>
            </div>
          </section>

          {/* — GRÁFICA DE VENTAS */}
          <section className="chart-section">
            <h2>Gráfica de Ventas</h2>
            <div className="chart-filters">
              <button onClick={() => setChartFilter('week')} className={chartFilter === 'week' ? 'active' : 'button_ventas'}>Última Semana</button>
              <button onClick={() => setChartFilter('month')} className={chartFilter === 'month' ? 'active' : 'button_ventas'}>Último Mes</button>
              <button onClick={() => setChartFilter('year')} className={chartFilter === 'year' ? 'active' : 'button_ventas'}>Último Año</button>
              <button onClick={() => setChartFilter('custom')} className={chartFilter === 'custom' ? 'active' : 'button_ventas'}>Personalizado</button>
            </div>
              {chartFilter === 'custom' && (
                <div className="custom-date-range">
                  <input type="date" value={customChartStart} onChange={e => setCustomChartStart(e.target.value)} />
                  <input type="date" value={customChartEnd} onChange={e => setCustomChartEnd(e.target.value)} />
                  <button onClick={() => fetchChartTickets('custom')} className="button_ventas">Aplicar</button>
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
