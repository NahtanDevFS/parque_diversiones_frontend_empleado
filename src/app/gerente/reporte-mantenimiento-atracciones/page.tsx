'use client';

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import { supabase } from './actions';
import jsPDF from 'jspdf';
import './reporte_mantenimiento_atracciones.css';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

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

export default function ReporteMantenimientoAtraccion() {
  const router = useRouter();
  
  const [atracciones, setAtracciones] = useState<AtraccionCard[]>([]);
  const [filtros, setFiltros] = useState<Record<string, FiltroPorFecha>>({});

  useEffect(() => {
    fetchHistorial();
  }, []);

  // Estado para el selector de actividad manual
    const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

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
                .update({ estado_actividad_empleado: 'En el módulo de reporte de mantenimientos' })
                .eq('id_empleado', id_empleado);
              if (error) console.error('Error al actualizar estado automático:', error);
              else console.log('Estado automático actualizado:', data);
            }
          })();
    
          // Control de acceso
          if(session.id_puesto!==3&&session.id_puesto!==6){
            Swal.fire({
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
        Swal.fire('Éxito', 'Estado actualizado a ' + selectedStatus, 'success');
      };

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

    // 1) Construimos un Set de todos los id_atraccion que tienen unidades
    const idsConUnidad = new Set(
      (unidadesData || []).map((u) => u.id_atraccion)
    );

    // 2) Unidades como antes (si necesitas filtrar solo unidades con mantenimiento, añade .filter historialUnidad.length > 0)
    const unidadesConMantenimiento = (unidadesData || [])
      .map((unidad) => {
        const atraccion = (atraccionesData || []).find(
          (a) => a.id_atraccion === unidad.id_atraccion
        );
        if (!atraccion || atraccion.estado_atraccion.toLowerCase() === 'deshabilitada')
          return null;
        const historialUnidad = (mantenimientosUnidad || []).filter(
          (m) => m.id_unidad === unidad.id_unidad
        );
        return {
          id: `unidad-${unidad.id_unidad}`,
          nombre: `${atraccion.nombre} - Unidad ${unidad.id_unidad}`,
          estado: unidad.estado,
          foto: atraccion.juego_foto,
          historial: historialUnidad,
        };
      })
      .filter(Boolean) as AtraccionCard[];

    // 3) Atracciones SIN unidades (ni deshabilitadas)
    const atraccionesConMantenimiento = (atraccionesData || [])
      .filter(
        (a) =>
          a.estado_atraccion.toLowerCase() !== 'deshabilitada' &&
          // Aquí excluimos las atracciones que tienen al menos una unidad
          !idsConUnidad.has(a.id_atraccion)
      )
      .map((a) => {
        const historialAtraccion = (mantenimientosAtraccion || []).filter(
          (m) => m.id_atraccion === a.id_atraccion
        );
        return {
          id: `atraccion-${a.id_atraccion}`,
          nombre: a.nombre,
          estado: a.estado_atraccion,
          foto: a.juego_foto,
          historial: historialAtraccion,
        };
      }) as AtraccionCard[];

    // 4) Combinamos y actualizamos el estado
    setAtracciones([...atraccionesConMantenimiento, ...unidadesConMantenimiento]);
  };

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

  const exportarPDF = (atraccion: AtraccionCard) => {
    const doc = new jsPDF();
    const filtro = filtros[atraccion.id]?.filtro || 'hoy';
    const inicio = filtros[atraccion.id]?.fechaInicio || '';
    const fin = filtros[atraccion.id]?.fechaFin || '';
    const { desde, hasta } = calcularRango(filtro, inicio, fin);

    const historialFiltrado = atraccion.historial.filter(
      (m) => m.fecha >= desde && m.fecha <= hasta
    );

    doc.setFontSize(16);
    doc.text(`Historial de Mantenimiento - ${atraccion.nombre}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 10, 25);
    doc.text(`Rango del reporte: ${desde} a ${hasta}`, 10, 32);

    let y = 40;
    doc.text('Fecha', 10, y);
    doc.text('Tipo', 50, y);
    doc.text('Descripción', 90, y);
    doc.text('Costo', 170, y);
    y += 10;

    if (historialFiltrado.length === 0) {
      doc.text('No hay registros de mantenimiento para este periodo.', 10, y);
    } else {
      historialFiltrado.forEach((m) => {
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

    doc.save(`historial_${atraccion.id}.pdf`);
  };

  const handleFiltro = (id: string, campo: keyof FiltroPorFecha, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor,
      },
    }));
  };

  return (
    <LayoutWithSidebar>
      <div className="historial_mantenimiento_page">

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

        <h2 className="titulo_reporte">Reportes de historial de Mantenimientos</h2>
        <div className="cards-container">
          {atracciones.map((atr) => {
            const filtro = filtros[atr.id]?.filtro || 'hoy';
            const inicio = filtros[atr.id]?.fechaInicio || '';
            const fin = filtros[atr.id]?.fechaFin || '';
            const { desde, hasta } = calcularRango(filtro, inicio, fin);
            const historialFiltrado = atr.historial.filter(
              (m) => m.fecha >= desde && m.fecha <= hasta
            );

            const estadoClass =
              atr.estado.toLowerCase() === 'funcional'
                ? 'estado-funcional'
                : 'estado-mantenimiento';

            return (
              <div className="card-mantenimiento" key={atr.id}>
                <img src={atr.foto} alt={atr.nombre} className="img-atraccion" />
                <h3>{atr.nombre}</h3>
                <p className="estado-atraccion-mantenimiento">
                  Estado: <strong className={estadoClass}>{atr.estado}</strong>
                </p>
                <p className="filtro-mantenimiento-title">Filtrar mantenimientos por:</p>
                <select onChange={(e) => handleFiltro(atr.id, 'filtro', e.target.value)}>
                  <option value="hoy">Hoy</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                  <option value="personalizado">Personalizado</option>
                </select>
                {filtros[atr.id]?.filtro === 'personalizado' && (
                  <>
                    <input
                      type="date"
                      onChange={(e) => handleFiltro(atr.id, 'fechaInicio', e.target.value)}
                    />
                    <input
                      type="date"
                      onChange={(e) => handleFiltro(atr.id, 'fechaFin', e.target.value)}
                    />
                  </>
                )}
                <button onClick={() => exportarPDF(atr)} className="export-btn">
                  Exportar PDF
                </button>

                <div className="historial-lista">
                  <h4>Historial filtrado:</h4>
                  {historialFiltrado.length === 0 ? (
                    <p>No hay mantenimientos registrados en este periodo.</p>
                  ) : (
                    <ul>
                      {historialFiltrado.map((m, idx) => (
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
