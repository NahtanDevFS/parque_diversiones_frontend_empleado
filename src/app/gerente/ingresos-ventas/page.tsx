"use client";

import React, { useEffect, useState } from 'react';
import './ingresos_ventas.css';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import TicketChart from '@/components/TicketChart';
import { supabase } from './actions';
import { jsPDF } from "jspdf"; // Importar jsPDF
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);


type Ticket = {
  precio: number;
  fecha_compra: string;
};

export default function Ingresos_ventas_page() {
  const router = useRouter();

  // Estados para el resumen (filtros: hoy, último mes, último año)
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<'today' | 'month' | 'year'>('today');

  // Estados para la gráfica (filtros: última semana, último mes, último año)
  const [chartTickets, setChartTickets] = useState<Ticket[]>([]);
  const [chartFilter, setChartFilter] = useState<'week' | 'month' | 'year'>('week');

  // Estados para los totales de los cards
  const [dayTotal, setDayTotal] = useState<number>(0);
  const [monthTotal, setMonthTotal] = useState<number>(0);
  const [annualTotal, setAnnualTotal] = useState<number>(0);

  // Validación del token para proteger la ruta
    useEffect(() => {
      const storedSession = localStorage.getItem('employeeSession');
      if (!storedSession) {
        // Si no hay token, redireccionar a la página de inicio
        router.push('/');
        return;
      }
      try {
        const session = JSON.parse(storedSession);
        // Solo el gerente (id_puesto = 3) tiene acceso a esta página
        if (session.id_puesto !== 3) {
           MySwal.fire({
            title: 'Acceso denegado',
            text: 'No tienes permiso para acceder a ese módulo',
            icon: 'error',
            confirmButtonText: 'Ok'
          }).then(() => {
            router.push('/');
          });
        }
      } catch (error) {
        console.error("Error al parsear el token", error);
        router.push('/');
      }
    }, [router]);

  // Función para consultar datos del resumen según el filtro seleccionado
  const fetchTickets = async (filter: 'today' | 'month' | 'year') => {
    let startDate: Date;
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
      default:
        startDate = new Date();
    }
    const { data, error } = await supabase
      .from('ticket')
      .select('precio, fecha_compra')
      .gte('fecha_compra', startDate.toISOString());
    if (error) {
      console.error(error);
    } else {
      setTickets(data as Ticket[]);
    }
  };

  // Función para consultar datos para la gráfica según el filtro seleccionado
  const fetchChartTickets = async (filter: 'week' | 'month' | 'year') => {
    let startDate: Date;
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
      default:
        startDate = new Date();
    }
    const { data, error } = await supabase
      .from('ticket')
      .select('precio, fecha_compra')
      .gte('fecha_compra', startDate.toISOString());
    if (error) {
      console.error(error);
    } else {
      setChartTickets(data as Ticket[]);
    }
  };

  // Función para consultar el total de ventas del día
  const fetchDailyTotal = async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { data, error } = await supabase
      .from('ticket')
      .select('precio')
      .gte('fecha_compra', startOfDay.toISOString());
    if (error) {
      console.error(error);
    } else {
      const total = (data as Ticket[]).reduce((sum, ticket) => sum + ticket.precio, 0);
      setDayTotal(total);
    }
  };

  // Función para consultar el total de ventas del último mes
  const fetchMonthlyTotal = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const { data, error } = await supabase
      .from('ticket')
      .select('precio')
      .gte('fecha_compra', startOfMonth.toISOString());
    if (error) {
      console.error(error);
    } else {
      const total = (data as Ticket[]).reduce((sum, ticket) => sum + ticket.precio, 0);
      setMonthTotal(total);
    }
  };

  // Función para consultar el total de ventas del último año
  const fetchAnnualTotal = async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const { data, error } = await supabase
      .from('ticket')
      .select('precio')
      .gte('fecha_compra', startOfYear.toISOString());
    if (error) {
      console.error(error);
    } else {
      const total = (data as Ticket[]).reduce((sum, ticket) => sum + ticket.precio, 0);
      setAnnualTotal(total);
    }
  };

  useEffect(() => {
    fetchTickets(summaryFilter);
  }, [summaryFilter]);

  useEffect(() => {
    fetchChartTickets(chartFilter);
  }, [chartFilter]);

  useEffect(() => {
    // Consultar totales para los cards al montar el componente
    fetchDailyTotal();
    fetchMonthlyTotal();
    fetchAnnualTotal();
  }, []);

  // Agrupamos los datos por fecha para el resumen
  const aggregatedSummary = tickets.reduce((acc: { [key: string]: number }, ticket) => {
    const date = new Date(ticket.fecha_compra).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += ticket.precio;
    return acc;
  }, {});

  // Agrupamos los datos por fecha para la gráfica
  const aggregatedChart = chartTickets.reduce((acc: { [key: string]: number }, ticket) => {
    const date = new Date(ticket.fecha_compra).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += ticket.precio;
    return acc;
  }, {});

  // Función para exportar el resumen a PDF según el filtro seleccionado
  const handleExportPDF = () => {
    const doc = new jsPDF();

    const watermark_logo_Base64 = "/marca_agua_logo_circular.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Definir un tamaño más pequeño para la imagen
    const imageWidth = 180;  // Puedes ajustar el tamaño según lo necesites
    const imageHeight = 180;

    // Calcular la posición para centrar la imagen en la página
    const xPos = (pageWidth - imageWidth) / 2;
    const yPos = (pageHeight - imageHeight) / 2;

    // Agrega la imagen como marca de agua de fondo:
    doc.addImage(
      watermark_logo_Base64,
      "PNG",         // Tipo de imagen
      xPos,             // Coordenada X
      yPos,             // Coordenada Y
      imageWidth,     // Ancho para cubrir la página
      imageHeight,    // Altura para cubrir la página
      "",            // Alias (opcional)
      "FAST"         // Opcional: modo de renderizado
    );

    let title = '';
    if (summaryFilter === 'today') {
      title = 'Resumen de ventas del día';
    } else if (summaryFilter === 'month') {
      title = 'Resumen de ventas del último mes';
    } else if (summaryFilter === 'year') {
      title = 'Resumen de ventas del último año';
    }
    // Título del PDF
    doc.setFontSize(18);
    doc.text(title, 10, 20);
    doc.setFontSize(12);
    let yPosition = 30;
    // Agregar cada línea del resumen
    Object.entries(aggregatedSummary).forEach(([date, total]) => {
      doc.text(`${date}: Q ${total}.00`, 10, yPosition);
      yPosition += 10;
    });
    // Guardar el documento
    doc.save(`${title}.pdf`);
  };

  return (
    <LayoutWithSidebar>
      <div className="ingresos_ventas_page">
        <div className="dashboard">
          <h1>Panel de Ventas de Tickets</h1>

          {/* Sección de Cards con totales */}
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

          <section className='section-resumen-ventas-buttons'>
            <div className="summary-filters">
              <button onClick={() => setSummaryFilter('today')} className={summaryFilter === 'today' ? 'active' : 'button_ventas'}>
                Hoy
              </button>
              <button onClick={() => setSummaryFilter('month')} className={summaryFilter === 'month' ? 'active' : 'button_ventas'}>
                Último Mes
              </button>
              <button onClick={() => setSummaryFilter('year')} className={summaryFilter === 'year' ? 'active' : 'button_ventas'}>
                Último Año
              </button>
            </div>
          </section>


          <section className="summary">
            <h2>Resumen de Ventas</h2>
            <ul>
              {Object.entries(aggregatedSummary).map(([date, total]) => (
                <li key={date} className='summary-item'>
                  <span>{date}: </span>
                  <span>Q {total}.00</span>
                </li>
              ))}
            </ul>
            <div className='export-btn-container'>
              <button className="export-btn" onClick={handleExportPDF}>Exportar a PDF</button>
            </div>
          </section>

          

          <section className="chart-section">
            <h2>Gráfica de Ventas</h2>
            <div className="chart-filters">
              <button onClick={() => setChartFilter('week')} className={chartFilter === 'week' ? 'active' : 'button_ventas'}>
                Última Semana
              </button>
              <button onClick={() => setChartFilter('month')} className={chartFilter === 'month' ? 'active' : 'button_ventas'}>
                Último Mes
              </button>
              <button onClick={() => setChartFilter('year')} className={chartFilter === 'year' ? 'active' : 'button_ventas'}>
                Último Año
              </button>
            </div>
            <div className="chart">
              <TicketChart data={aggregatedChart} />
            </div>
          </section>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
