'use client';

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import { supabase } from './actions';
import jsPDF from 'jspdf';
import './reporte_mantenimiento_atracciones.css';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

/* ------------------------------ Tipos ------------------------------------ */
interface Mantenimiento {
  fecha: string;
  tipo: string;
  descripcion: string;
  costo_reparacion: number;
}

interface AtraccionCard {
  id: string;
  nombre: string;
  estado: string;
  foto: string;
  historial: Mantenimiento[];
}

interface FiltroPorFecha {
  filtro: string;
  fechaInicio?: string;
  fechaFin?: string;
}

/* ------------------------------------------------------------------------- */
export default function ReporteMantenimientoAtraccion() {
  const router = useRouter();
  const [atracciones, setAtracciones] = useState<AtraccionCard[]>([]);
  const [filtros, setFiltros] = useState<Record<string, FiltroPorFecha>>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

  /* ------------------------------ Seguridad ------------------------------ */
  useEffect(() => {
    const stored = localStorage.getItem('employeeSession');
    if (!stored) return void router.push('/');

    try {
      const session = JSON.parse(stored);
      const { id_puesto, id_empleado } = session;

      (async () => {
        if (id_puesto !== 6) {
          await supabase
            .from('empleado')
            .update({ estado_actividad_empleado: 'En el módulo de reporte de mantenimientos' })
            .eq('id_empleado', id_empleado);
        }
      })();

      if (id_puesto !== 3 && id_puesto !== 6) {
        Swal.fire({
          title: 'Acceso denegado',
          text: 'No tienes permiso para acceder a este módulo',
          icon: 'error',
          confirmButtonText: 'Ok',
        }).then(() => router.push('/'));
      }
    } catch {
      router.push('/');
    }
  }, [router]);

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

  /* ----------------------------- Carga datos ----------------------------- */
  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    const { data: atraccionesData } = await supabase
      .from('atraccion')
      .select('id_atraccion, nombre, estado_atraccion, juego_foto');

    const { data: unidadesData } = await supabase
      .from('unidad_atraccion')
      .select('id_unidad, id_atraccion, estado');

    const { data: mantenimientosAtraccion } = await supabase
      .from('mantenimientos')
      .select('id_atraccion, fecha, tipo, descripcion, costo_reparacion');

    const { data: mantenimientosUnidad } = await supabase
      .from('mantenimiento_unidad')
      .select('id_unidad, fecha, tipo, descripcion, costo_reparacion');

    const idsConUnidad = new Set((unidadesData || []).map((u) => u.id_atraccion));

    const unidadesConMantenimiento = (unidadesData || [])
      .map((unidad) => {
        const atr = (atraccionesData || []).find((a) => a.id_atraccion === unidad.id_atraccion);
        if (!atr || atr.estado_atraccion.toLowerCase() === 'deshabilitada') return null;
        const historialUnidad = (mantenimientosUnidad || []).filter(
          (m) => m.id_unidad === unidad.id_unidad,
        );
        return {
          id: `unidad-${unidad.id_unidad}`,
          nombre: `${atr.nombre} - Unidad ${unidad.id_unidad}`,
          estado: unidad.estado,
          foto: atr.juego_foto,
          historial: historialUnidad,
        };
      })
      .filter(Boolean) as AtraccionCard[];

    const atraccionesConMantenimiento = (atraccionesData || [])
      .filter(
        (a) =>
          a.estado_atraccion.toLowerCase() !== 'deshabilitada' && !idsConUnidad.has(a.id_atraccion),
      )
      .map((a) => {
        const historialAtr = (mantenimientosAtraccion || []).filter(
          (m) => m.id_atraccion === a.id_atraccion,
        );
        return {
          id: `atraccion-${a.id_atraccion}`,
          nombre: a.nombre,
          estado: a.estado_atraccion,
          foto: a.juego_foto,
          historial: historialAtr,
        };
      }) as AtraccionCard[];

    setAtracciones([...atraccionesConMantenimiento, ...unidadesConMantenimiento]);
  };

  /* --------------------------- Utilidades -------------------------------- */
  const calcularRango = (tipo: string, inicio?: string, fin?: string) => {
    const hoy = new Date();
    let desde = new Date(hoy);
    let hasta = new Date(hoy);

    if (tipo === 'semana') {
      desde.setDate(hoy.getDate() - 7);
    } else if (tipo === 'mes') {
      desde.setMonth(hoy.getMonth() - 1);
    } else if (tipo === 'personalizado') {
      desde = new Date(inicio || hoy);
      hasta = new Date(fin || hoy);
    }

    return {
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0],
    };
  };

  const exportarPDF = (atr: AtraccionCard) => {
    const doc = new jsPDF();
    const { filtro = 'hoy', fechaInicio = '', fechaFin = '' } = filtros[atr.id] || {};
    const { desde, hasta } = calcularRango(filtro, fechaInicio, fechaFin);
    const lista = atr.historial.filter((m) => m.fecha >= desde && m.fecha <= hasta);

    doc.setFontSize(16).text(`Historial de Mantenimiento - ${atr.nombre}`, 10, 15);
    doc.setFontSize(12)
      .text(`Fecha de generación: ${new Date().toLocaleString()}`, 10, 25)
      .text(`Rango del reporte: ${desde} a ${hasta}`, 10, 32)
      .text(`Cantidad de mantenimientos: ${lista.length}`, 10, 39); // NUEVO

    let y = 47;
    doc.text('Fecha', 10, y);
    doc.text('Tipo', 50, y);
    doc.text('Descripción', 90, y);
    doc.text('Costo', 170, y);
    y += 10;

    if (!lista.length) {
      doc.text('No hay registros en este periodo.', 10, y);
    } else {
      lista.forEach((m) => {
        doc.text(m.fecha, 10, y);
        doc.text(m.tipo, 50, y);
        doc.text(m.descripcion.slice(0, 70), 90, y);
        doc.text(`Q${m.costo_reparacion}`, 170, y);
        y += 10;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    doc.save(`historial_${atr.id}.pdf`);
  };

  const handleFiltro = (id: string, campo: keyof FiltroPorFecha, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  };

  /* ----------------------------------------------------------------------- */
  return (
    <LayoutWithSidebar>
      <div className='historial_mantenimiento_page'>
        {/* ----- Estado del empleado ----- */}
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

        <h2 className='titulo_reporte'>Reportes de historial de Mantenimientos</h2>

        {/* --------------------- Tarjetas de atracción ---------------------- */}
        <div className='cards-container'>
          {atracciones.map((atr) => {
            const { filtro = 'hoy', fechaInicio = '', fechaFin = '' } = filtros[atr.id] || {};
            const { desde, hasta } = calcularRango(filtro, fechaInicio, fechaFin);
            const lista = atr.historial.filter((m) => m.fecha >= desde && m.fecha <= hasta);

            const estadoClass =
              atr.estado.toLowerCase() === 'funcional' ? 'estado-funcional' : 'estado-mantenimiento';

            return (
              <div className='card-mantenimiento' key={atr.id}>
                <img src={atr.foto} alt={atr.nombre} className='img-atraccion' />
                <h3>{atr.nombre}</h3>
                <p className='estado-atraccion-mantenimiento'>
                  Estado:{' '}
                  <strong className={estadoClass}>
                    {atr.estado}
                  </strong>
                </p>

                {/* ---------------- Filtro ---------------- */}
                <p className='filtro-mantenimiento-title'>Filtrar mantenimientos por:</p>
                <select onChange={(e) => handleFiltro(atr.id, 'filtro', e.target.value)}>
                  <option value='hoy'>Hoy</option>
                  <option value='semana'>Últimos 7 días</option>
                  <option value='mes'>Últimos 30 días</option>
                  <option value='personalizado'>Personalizado</option>
                </select>
                {filtro === 'personalizado' && (
                  <>
                    <input
                      type='date'
                      onChange={(e) => handleFiltro(atr.id, 'fechaInicio', e.target.value)}
                    />
                    <input
                      type='date'
                      onChange={(e) => handleFiltro(atr.id, 'fechaFin', e.target.value)}
                    />
                  </>
                )}

                <button onClick={() => exportarPDF(atr)} className='export-btn'>
                  Exportar PDF
                </button>

                {/* ---------- Conteo de mantenimientos ---------- */}
                <p className='conteo-mantenimientos'>
                  Cantidad de mantenimientos en el rango de fecha: <strong>{lista.length}</strong>
                </p>

                {/* ---------- Historial filtrado ---------- */}
                <div className='historial-lista'>
                  <h4>Historial filtrado:</h4>
                  {!lista.length ? (
                    <p>No hay mantenimientos registrados en este periodo.</p>
                  ) : (
                    <ul>
                      {lista.map((m, idx) => (
                        <li
                          key={idx}
                          className={
                            m.tipo.toLowerCase().includes('preventivo')
                              ? 'mantenimiento-preventivo'
                              : m.tipo.toLowerCase().includes('correctivo')
                              ? 'mantenimiento-correctivo'
                              : 'mantenimiento-reparacion'
                          }
                        >
                          <strong>{m.fecha}</strong> - {m.tipo}: {m.descripcion} (Q
                          {m.costo_reparacion})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
