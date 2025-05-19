'use client';

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import './reporte_atraccion.css';
import { supabase } from './actions';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import { utils, writeFile } from 'xlsx';

/* ---------------------------- Tipos e interfaces --------------------------- */
interface Atraccion {
  id_atraccion: number;
  nombre: string;
  juego_foto: string;
  usos_hoy: number;
  usos_semana: number;
  usos_mes: number;
}

type FiltroFecha = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

interface FiltroPorAtraccion {
  filtro: FiltroFecha;
  fechaInicio: string;
  fechaFin: string;
}

/* -------------------------------------------------------------------------- */
export default function ReporteAtraccion() {
  /* ------------------------------ Estados --------------------------------- */
  const [atracciones, setAtracciones] = useState<Atraccion[]>([]);
  const [filtrosPorAtraccion, setFiltrosPorAtraccion] = useState<
    Record<number, FiltroPorAtraccion>
  >({});
  const [filtroGeneral, setFiltroGeneral] = useState<FiltroFecha>('hoy');
  const [fechaInicioGeneral, setFechaInicioGeneral] = useState('');
  const [fechaFinGeneral, setFechaFinGeneral] = useState('');

  const [usosGenerales, setUsosGenerales] = useState<Record<number, number>>({});
  const [usosPorFiltro, setUsosPorFiltro] = useState<Record<number, number>>({});

  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

  const router = useRouter();

  /* ----------------------- Protección de la ruta -------------------------- */
  useEffect(() => {
    const storedSession = localStorage.getItem('employeeSession');
    if (!storedSession) {
      router.push('/');
      return;
    }

    try {
      const session = JSON.parse(storedSession);
      const { id_puesto, id_empleado } = session;

      (async () => {
        if (id_puesto !== 6) {
          await supabase
            .from('empleado')
            .update({ estado_actividad_empleado: 'En el módulo de reporte de atracciones' })
            .eq('id_empleado', id_empleado);
        }
      })();

      if (id_puesto !== 3 && id_puesto !== 6) {
        Swal.fire({
          title: 'Acceso denegado',
          text: 'No tienes permiso para acceder a ese módulo',
          icon: 'error',
          confirmButtonText: 'Ok',
        }).then(() => router.push('/'));
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  /* ------------ Actualizar estado manualmente desde el combobox ----------- */
  const handleStatusUpdate = async () => {
    const stored = localStorage.getItem('employeeSession');
    if (!stored) return;
    const { id_empleado } = JSON.parse(stored);

    await supabase
      .from('empleado')
      .update({ estado_actividad_empleado: selectedStatus })
      .eq('id_empleado', id_empleado);

    Swal.fire('Éxito', 'Estado actualizado a ' + selectedStatus, 'success');
  };

  /* --------------------------- Carga inicial ------------------------------ */
  useEffect(() => {
    fetchData();
  }, []);

  /* -------- Recalcular totales generales al cambiar el filtro ------------- */
  useEffect(() => {
    if (atracciones.length) fetchUsosGenerales();
  }, [filtroGeneral, fechaInicioGeneral, fechaFinGeneral, atracciones]);

  /* ------ Recalcular usos por tarjeta al cambiar su filtro individual ----- */
  useEffect(() => {
    if (!atracciones.length) return;
    (async () => {
      await Promise.all(
        Object.keys(filtrosPorAtraccion).map(async (idStr) => {
          const id = Number(idStr);
          const { desde, hasta } = calcularRango(id);
          if (!desde || !hasta) return;

          const { count } = await supabase
            .from('uso_atraccion')
            .select('id_uso_atraccion', { count: 'exact', head: true })
            .eq('id_atraccion', id)
            .gte('fecha_ciclo_atraccion', desde)
            .lte('fecha_ciclo_atraccion', hasta);

          setUsosPorFiltro((prev) => ({ ...prev, [id]: count ?? 0 }));
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosPorAtraccion]);

  /* ----------------------------- Rangos ----------------------------------- */
  const calcularRango = (id: number) => {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const { filtro, fechaInicio, fechaFin } = filtrosPorAtraccion[id] ?? {
      filtro: 'hoy',
      fechaInicio: '',
      fechaFin: '',
    };

    switch (filtro) {
      case 'semana': {
        const inicio = new Date();
        inicio.setDate(hoy.getDate() - 7);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'mes': {
        const inicio = new Date();
        inicio.setMonth(hoy.getMonth() - 1);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'anio': {
        const inicio = new Date();
        inicio.setFullYear(hoy.getFullYear() - 1);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'personalizado':
        return { desde: fechaInicio, hasta: fechaFin };
      default:
        return { desde: hoyStr, hasta: hoyStr };
    }
  };

  const calcularRangoGeneral = () => {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');

    switch (filtroGeneral) {
      case 'semana': {
        const inicio = new Date();
        inicio.setDate(hoy.getDate() - 7);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'mes': {
        const inicio = new Date();
        inicio.setMonth(hoy.getMonth() - 1);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'anio': {
        const inicio = new Date();
        inicio.setFullYear(hoy.getFullYear() - 1);
        return { desde: inicio.toLocaleDateString('en-CA'), hasta: hoyStr };
      }
      case 'personalizado':
        return { desde: fechaInicioGeneral, hasta: fechaFinGeneral };
      default:
        return { desde: hoyStr, hasta: hoyStr };
    }
  };

  /* ---------------------- Cargar atracciones y métricas ------------------- */
  const fetchData = async () => {
    const { data: atraccionesData, error } = await supabase
      .from('atraccion')
      .select('id_atraccion, nombre, juego_foto');

    if (error || !atraccionesData) return;

    const filtrosTemp: Record<number, FiltroPorAtraccion> = {};
    const tarjetas: Atraccion[] = [];
    const inicialUsosFiltro: Record<number, number> = {};

    const hoyStr = new Date().toLocaleDateString('en-CA');
    const semanaStr = new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA');
    const mesStr = new Date(Date.now() - 30 * 864e5).toLocaleDateString('en-CA');

    for (const a of atraccionesData) {
      filtrosTemp[a.id_atraccion] = { filtro: 'hoy', fechaInicio: '', fechaFin: '' };

      const usosHoy = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', a.id_atraccion)
        .eq('fecha_ciclo_atraccion', hoyStr);

      const usosSemana = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', a.id_atraccion)
        .gte('fecha_ciclo_atraccion', semanaStr);

      const usosMes = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', a.id_atraccion)
        .gte('fecha_ciclo_atraccion', mesStr);

      tarjetas.push({
        ...a,
        usos_hoy: usosHoy.count || 0,
        usos_semana: usosSemana.count || 0,
        usos_mes: usosMes.count || 0,
      });

      inicialUsosFiltro[a.id_atraccion] = usosHoy.count || 0;
    }

    setAtracciones(tarjetas);
    setFiltrosPorAtraccion(filtrosTemp);
    setUsosPorFiltro(inicialUsosFiltro);
  };

  /* --------------- Totales generales para el bloque superior -------------- */
  const fetchUsosGenerales = async () => {
    const { desde, hasta } = calcularRangoGeneral();
    const nuevos: Record<number, number> = {};

    await Promise.all(
      atracciones.map(async (a) => {
        const { count } = await supabase
          .from('uso_atraccion')
          .select('id_uso_atraccion', { count: 'exact', head: true })
          .eq('id_atraccion', a.id_atraccion)
          .gte('fecha_ciclo_atraccion', desde)
          .lte('fecha_ciclo_atraccion', hasta);

        nuevos[a.id_atraccion] = count ?? 0;
      }),
    );

    setUsosGenerales(nuevos);
  };

  /* ------------- Manejar cambio en filtro individual por tarjeta ---------- */
  const handleFiltroChange = (id: number, key: keyof FiltroPorAtraccion, value: string) => {
    setFiltrosPorAtraccion((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  /* ------------------------------- PDF ------------------------------------ */
  const exportarPDFIndividual = async (a: Atraccion) => {
    const { desde, hasta } = calcularRango(a.id_atraccion);

    const { data } = await supabase
      .from('uso_atraccion')
      .select('fecha_ciclo_atraccion, hora_ciclo_atraccion')
      .eq('id_atraccion', a.id_atraccion)
      .gte('fecha_ciclo_atraccion', desde)
      .lte('fecha_ciclo_atraccion', hasta);

    const doc = new jsPDF();
    doc.setFontSize(16).text(`Reporte de Usos - ${a.nombre}`, 10, 15);
    doc.setFontSize(12)
      .text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 10, 25)
      .text(`Filtrado desde: ${desde} hasta: ${hasta}`, 10, 35)
      .text(`Cantidad de veces usada: ${data?.length ?? 0}`, 10, 45);

    let y = 60;
    doc.text('Fecha', 10, y);
    doc.text('Hora', 80, y);
    y += 10;

    if (data && data.length) {
      data.forEach((u) => {
        doc.text(u.fecha_ciclo_atraccion, 10, y);
        doc.text(u.hora_ciclo_atraccion, 80, y);
        y += 10;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    } else {
      doc.text('No hay registros en el rango.', 10, y);
    }

    doc.save(`reporte_${a.nombre.replaceAll(' ', '_')}.pdf`);
  };

  const exportarPDFGeneral = () => {
    const { desde, hasta } = calcularRangoGeneral();

    const doc = new jsPDF();
    doc.setFontSize(16).text('Reporte General de Atracciones', 10, 15);
    doc.setFontSize(12)
      .text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 10, 25)
      .text(`Rango aplicado: ${desde} a ${hasta}`, 10, 35);

    let y = 55;
    doc.text('Nombre de la atracción', 10, y);
    doc.text('Usos', 160, y, { align: 'right' });
    y += 8;
    doc.line(10, y, 200, y);
    y += 6;

    atracciones.forEach((a) => {
      const total = usosGenerales[a.id_atraccion] ?? 0;
      doc.text(a.nombre, 10, y);
      doc.text(total.toString(), 160, y, { align: 'right' });
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`reporte_atracciones_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* --------------------------- EXCEL (NEW) ------------------------------- */
  const exportarExcelIndividual = async (a: Atraccion) => {
    const { desde, hasta } = calcularRango(a.id_atraccion);
    const { data } = await supabase
      .from('uso_atraccion')
      .select('fecha_ciclo_atraccion, hora_ciclo_atraccion')
      .eq('id_atraccion', a.id_atraccion)
      .gte('fecha_ciclo_atraccion', desde)
      .lte('fecha_ciclo_atraccion', hasta);

    const count = data?.length || 0;
    const rows: any[][] = [
      ['Reporte de Usos - ' + a.nombre],
      ['Rango:', `${desde} → ${hasta}`],
      ['Cantidad de usos', count],
      [],
      ['Fecha', 'Hora'],
      ...
        (data?.map(u => [u.fecha_ciclo_atraccion, u.hora_ciclo_atraccion]) || [])
    ];

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(rows);
    utils.book_append_sheet(wb, ws, a.nombre.slice(0, 31));
    writeFile(wb, `reporte_${a.nombre.replaceAll(' ', '_')}.xlsx`);
  };


  const exportarExcelGeneral = () => {
    const { desde, hasta } = calcularRangoGeneral();

    /* Encabezado */
    const rows: any[][] = [
      ['Rango:', `${desde} → ${hasta}`],
      [],
      ['Nombre atracción', 'Usos en el rango']
    ];

    atracciones.forEach((a) =>
      rows.push([a.nombre, usosGenerales[a.id_atraccion] ?? 0])
    );

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(rows);
    utils.book_append_sheet(wb, ws, 'Reporte Atracciones');
    writeFile(wb, `reporte_atracciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* -------------------------------- UI ------------------------------------ */
  return (
    <LayoutWithSidebar>
      <div className='reporte_atraccion_page'>
        {/* ---------- Barra de estado del empleado ---------- */}
        <div className='estado-row'>
          <h4>Opciones para notificar cese de actividades:</h4>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value='En el almuerzo'>En el almuerzo</option>
            <option value='Turno cerrado'>Turno cerrado</option>
            <option value='Ausencia temporal'>Ausencia temporal</option>
          </select>
          <button onClick={handleStatusUpdate} className='button_ventas'>
            Actualizar estado
          </button>
        </div>

        <h2 className='titulo_reporte'>Reporte de Uso de Atracciones</h2>

        {/* ------------------ Contenedor de filtros generales ---------------- */}
        <div className='filtros-container'>
          <p>Filtrar reporte general por:</p>
          <select value={filtroGeneral} onChange={(e) => setFiltroGeneral(e.target.value as FiltroFecha)}>
            <option value='hoy'>Hoy</option>
            <option value='semana'>Últimos 7 días</option>
            <option value='mes'>Últimos 30 días</option>
            <option value='anio'>Últimos 12 meses</option>
            <option value='personalizado'>Rango personalizado</option>
          </select>

          {filtroGeneral === 'personalizado' && (
            <>
              <input type='date' value={fechaInicioGeneral} onChange={(e) => setFechaInicioGeneral(e.target.value)} />
              <input type='date' value={fechaFinGeneral} onChange={(e) => setFechaFinGeneral(e.target.value)} />
            </>
          )}

          <button className='export-btn' onClick={exportarPDFGeneral}>
            Exportar PDF
          </button>

          {/* === NEW » botón Excel general === */}
          <button className='export-btn-excel' onClick={exportarExcelGeneral}>
            Exportar Excel
          </button>

          {/* ---------- Totales por atracción en el rango general ---------- */}
          <div className='totales-usos'>
            {atracciones.map((a) => (
              <p key={a.id_atraccion} className='totales-item'>
                <strong>{a.nombre}:</strong> {usosGenerales[a.id_atraccion] ?? 0} usos
              </p>
            ))}
          </div>
        </div>

        {/* ----------------------- Tarjetas por atracción -------------------- */}
        <div className='atracciones-container'>
          {atracciones.map((a) => (
            <div key={a.id_atraccion} className='atraccion-card'>
              <img src={a.juego_foto} alt={a.nombre} className='atraccion-img' />
              <h3>{a.nombre}</h3>

              <p className='veces-usada'>Usos hoy: <strong>{a.usos_hoy}</strong></p>
              <p className='veces-usada'>Usos última semana: <strong>{a.usos_semana}</strong></p>
              <p className='veces-usada'>Usos último mes: <strong>{a.usos_mes}</strong></p>

              {/* ---------------- Filtro individual ---------------- */}
              <div className='filtros-individuales'>
                <p>Filtrar reporte por:</p>
                <select
                  value={filtrosPorAtraccion[a.id_atraccion]?.filtro}
                  onChange={(e) => handleFiltroChange(a.id_atraccion, 'filtro', e.target.value)}
                >
                  <option value='hoy'>Hoy</option>
                  <option value='semana'>Últimos 7 días</option>
                  <option value='mes'>Último mes</option>
                  <option value='anio'>Último año</option>
                  <option value='personalizado'>Rango personalizado</option>
                </select>

                {filtrosPorAtraccion[a.id_atraccion]?.filtro === 'personalizado' && (
                  <>
                    <input
                      type='date'
                      value={filtrosPorAtraccion[a.id_atraccion]?.fechaInicio}
                      onChange={(e) => handleFiltroChange(a.id_atraccion, 'fechaInicio', e.target.value)}
                    />
                    <input
                      type='date'
                      value={filtrosPorAtraccion[a.id_atraccion]?.fechaFin}
                      onChange={(e) => handleFiltroChange(a.id_atraccion, 'fechaFin', e.target.value)}
                    />
                  </>
                )}
              </div>

              {/* ---------- Texto con usos del rango individual ---------- */}
              <p className='usos-individual'>
                <strong>{a.nombre}:</strong> {usosPorFiltro[a.id_atraccion] ?? 0} usos
              </p>

              <button className='export-btn' onClick={() => exportarPDFIndividual(a)}>
                Reporte en PDF
              </button>
              {/* === NEW » botón Excel individual === */}
              <button className='export-btn-excel' onClick={() => exportarExcelIndividual(a)}>
                Reporte en Excel
              </button>
            </div>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
