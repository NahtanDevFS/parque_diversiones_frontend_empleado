'use client';

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import './reporte_atraccion.css';
import { supabase } from './actions';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

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

export default function ReporteAtraccion() {
  const [atracciones, setAtracciones] = useState<Atraccion[]>([]);
  const [filtrosPorAtraccion, setFiltrosPorAtraccion] = useState<Record<number, FiltroPorAtraccion>>({});
  const [filtroGeneral, setFiltroGeneral] = useState<FiltroFecha>('hoy');
  const [fechaInicioGeneral, setFechaInicioGeneral] = useState('');
  const [fechaFinGeneral, setFechaFinGeneral] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

  const router = useRouter();
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

          const { id_puesto, id_empleado } = session;
          
          // Función async para update
          (async () => {
            if (id_puesto !== 6) {
              const { data, error } = await supabase
                .from('empleado')
                .update({ estado_actividad_empleado: 'En el módulo de reporte de atracciones' })
                .eq('id_empleado', id_empleado);
              if (error) console.error('Error al actualizar estado automático:', error);
              else console.log('Estado automático actualizado:', data);
            }
          })();

          // Solo el gerente (id_puesto = 3) y administrador (id_puesto = 6) tiene acceso a esta página
        if (session.id_puesto !== 3 && session.id_puesto !== 6) {
             Swal.fire({
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

    // Handler para actualizar estado desde el combobox
      const handleStatusUpdate = async () => {
        const stored = localStorage.getItem('employeeSession');
        if (!stored) return;
        const session = JSON.parse(stored);
        await supabase
          .from('empleado')
          .update({ estado_actividad_empleado: selectedStatus })
          .eq('id_empleado', session.id_empleado);
        Swal.fire('Éxito', 'Estado actualizado a ' + selectedStatus, 'success');
      };

  useEffect(() => {
    fetchData();
  }, []);

  const calcularRango = (atraccionId: number) => {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const filtro = filtrosPorAtraccion[atraccionId]?.filtro || 'hoy';
    let desde = hoyStr;
    let hasta = hoyStr;

    if (filtro === 'semana') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtro === 'mes') {
      const inicio = new Date();
      inicio.setMonth(hoy.getMonth() - 1);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtro === 'anio') {
      const inicio = new Date();
      inicio.setFullYear(hoy.getFullYear() - 1);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtro === 'personalizado') {
      desde = filtrosPorAtraccion[atraccionId]?.fechaInicio || hoyStr;
      hasta = filtrosPorAtraccion[atraccionId]?.fechaFin || hoyStr;
    }

    return { desde, hasta };
  };

  const calcularRangoGeneral = () => {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    let desde = hoyStr;
    let hasta = hoyStr;

    if (filtroGeneral === 'semana') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtroGeneral === 'mes') {
      const inicio = new Date();
      inicio.setMonth(hoy.getMonth() - 1);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtroGeneral === 'anio') {
      const inicio = new Date();
      inicio.setFullYear(hoy.getFullYear() - 1);
      desde = inicio.toLocaleDateString('en-CA');
    } else if (filtroGeneral === 'personalizado') {
      desde = fechaInicioGeneral || hoyStr;
      hasta = fechaFinGeneral || hoyStr;
    }

    return { desde, hasta };
  };

  const fetchData = async () => {
    const { data: atraccionesData, error } = await supabase
      .from('atraccion')
      .select('id_atraccion, nombre, juego_foto');

    if (error) {
      console.error('Error al obtener atracciones:', error.message);
      return;
    }

    if (!atraccionesData) return;

    const filtros: Record<number, FiltroPorAtraccion> = {};
    const atraccionesConUsos: Atraccion[] = [];

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA');
    const semana = new Date(hoy);
    semana.setDate(hoy.getDate() - 7);
    const semanaStr = semana.toLocaleDateString('en-CA');
    const mes = new Date(hoy);
    mes.setDate(hoy.getDate() - 30);
    const mesStr = mes.toLocaleDateString('en-CA');

    for (const atraccion of atraccionesData) {
      filtros[atraccion.id_atraccion] = {
        filtro: 'hoy',
        fechaInicio: '',
        fechaFin: '',
      };

      const usosHoy = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', atraccion.id_atraccion)
        .eq('fecha_ciclo_atraccion', hoyStr);

      const usosSemana = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', atraccion.id_atraccion)
        .gte('fecha_ciclo_atraccion', semanaStr);

      const usosMes = await supabase
        .from('uso_atraccion')
        .select('id_uso_atraccion', { count: 'exact', head: true })
        .eq('id_atraccion', atraccion.id_atraccion)
        .gte('fecha_ciclo_atraccion', mesStr);

      atraccionesConUsos.push({
        ...atraccion,
        usos_hoy: usosHoy.count || 0,
        usos_semana: usosSemana.count || 0,
        usos_mes: usosMes.count || 0,
      });
    }

    setAtracciones(atraccionesConUsos);
    setFiltrosPorAtraccion(filtros);
  };

  const handleFiltroChange = (id: number, field: keyof FiltroPorAtraccion, value: string) => {
    setFiltrosPorAtraccion((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const exportarPDFIndividual = async (atraccion: Atraccion) => {
    const { desde, hasta } = calcularRango(atraccion.id_atraccion);

    const { data: usos, error } = await supabase
      .from('uso_atraccion')
      .select('fecha_ciclo_atraccion, hora_ciclo_atraccion')
      .eq('id_atraccion', atraccion.id_atraccion)
      .gte('fecha_ciclo_atraccion', desde)
      .lte('fecha_ciclo_atraccion', hasta);

    if (error) {
      console.error('Error al obtener usos:', error.message);
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Reporte de Usos - ${atraccion.nombre}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 10, 25);
    doc.text(`Filtrado desde: ${desde} hasta: ${hasta}`, 10, 35);
    doc.text(`Cantidad de veces usada: ${usos?.length ?? 0}`, 10, 45);

    let y = 60;
    doc.text('Fecha', 10, y);
    doc.text('Hora', 80, y);
    y += 10;

    if (usos && usos.length > 0) {
      usos.forEach((uso) => {
        doc.text(uso.fecha_ciclo_atraccion, 10, y);
        doc.text(uso.hora_ciclo_atraccion, 80, y);
        y += 10;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    } else {
      doc.text('No hay registros de uso en el periodo seleccionado.', 10, y);
    }

    doc.save(`reporte_${atraccion.nombre.replaceAll(' ', '_')}.pdf`);
  };

  const exportarPDFGeneral = () => {
    const { desde, hasta } = calcularRangoGeneral();
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte General de Atracciones', 10, 15);
    doc.setFontSize(12);
    doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 10, 25);
    doc.text(`Rango aplicado: ${desde} a ${hasta}`, 10, 35);

    let y = 60;
    doc.text('Cantidad de veces usada', 90, y-10);
    doc.text('Nombre', 10, y);
    doc.text('Hoy', 80, y);
    doc.text('Semana', 110, y);
    doc.text('Mes', 150, y);
    y += 10;

    atracciones.forEach((a) => {
      doc.text(a.nombre, 10, y);
      doc.text(a.usos_hoy.toString(), 80, y);
      doc.text(a.usos_semana.toString(), 110, y);
      doc.text(a.usos_mes.toString(), 150, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save('reporte_general_atracciones.pdf');
  };

  return (
    <LayoutWithSidebar>
      <div className='reporte_atraccion_page'>

        {/*SELECCIÓN DE ESTADO*/}
          <div className="estado-row">
            <h4>Opciones para notificar cese de actividades:</h4>
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

        <h2 className='titulo_reporte'>Reporte de Uso de Atracciones</h2>

        <div className='filtros-container'>
          <p>Filtrar reporte general por:</p>
          <select value={filtroGeneral} onChange={(e) => setFiltroGeneral(e.target.value as FiltroFecha)}>
            <option value='hoy'>Hoy</option>
            <option value='semana'>Últimos 7 días</option>
            <option value='mes'>Último mes</option>
            <option value='anio'>Último año</option>
            <option value='personalizado'>Rango personalizado</option>
          </select>

          {filtroGeneral === 'personalizado' && (
            <>
              <input type='date' value={fechaInicioGeneral} onChange={(e) => setFechaInicioGeneral(e.target.value)} />
              <input type='date' value={fechaFinGeneral} onChange={(e) => setFechaFinGeneral(e.target.value)} />
            </>
          )}

          <button className='export-btn' onClick={exportarPDFGeneral}>
            Exportar todos en un solo PDF
          </button>
        </div>

        <div className='atracciones-container'>
          {atracciones.map((atraccion) => (
            <div key={atraccion.id_atraccion} className='atraccion-card'>
              <img src={atraccion.juego_foto} alt={atraccion.nombre} className='atraccion-img' />
              <h3>{atraccion.nombre}</h3>
              <p className='veces-usada'>Usos hoy: <strong>{atraccion.usos_hoy}</strong></p>
              <p className='veces-usada'>Usos última semana: <strong>{atraccion.usos_semana}</strong></p>
              <p className='veces-usada'>Usos último mes: <strong>{atraccion.usos_mes}</strong></p>

              <div className='filtros-individuales'>
                <p>Filtrar reporte por:</p>
                <select
                  value={filtrosPorAtraccion[atraccion.id_atraccion]?.filtro}
                  onChange={(e) => handleFiltroChange(atraccion.id_atraccion, 'filtro', e.target.value)}
                >
                  <option value='hoy'>Hoy</option>
                  <option value='semana'>Últimos 7 días</option>
                  <option value='mes'>Último mes</option>
                  <option value='anio'>Último año</option>
                  <option value='personalizado'>Rango personalizado</option>
                </select>

                {filtrosPorAtraccion[atraccion.id_atraccion]?.filtro === 'personalizado' && (
                  <>
                    <input
                      type='date'
                      value={filtrosPorAtraccion[atraccion.id_atraccion]?.fechaInicio}
                      onChange={(e) =>
                        handleFiltroChange(atraccion.id_atraccion, 'fechaInicio', e.target.value)
                      }
                    />
                    <input
                      type='date'
                      value={filtrosPorAtraccion[atraccion.id_atraccion]?.fechaFin}
                      onChange={(e) =>
                        handleFiltroChange(atraccion.id_atraccion, 'fechaFin', e.target.value)
                      }
                    />
                  </>
                )}
              </div>

              <button className='export-btn' onClick={() => exportarPDFIndividual(atraccion)}>
                Reporte en PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
