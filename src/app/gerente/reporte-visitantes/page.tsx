"use client";

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import { supabase } from './actions';
import jsPDF from 'jspdf';
import './reporte_visitantes.css'
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ReporteVisitantes() {
    const router = useRouter();

    const [visitantes, setVisitantes] = useState<any[]>([]);
    const [filtro, setFiltro] = useState('hoy');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [conteos, setConteos] = useState({ hoy: 0, semana: 0, mes: 0 });

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
                .update({ estado_actividad_empleado: 'En el módulo de reporte de visitantes' })
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
  
    useEffect(() => {
      fetchData();
    }, [filtro, fechaInicio, fechaFin]);
  
    useEffect(() => {
      contarVisitantes();
    }, []);
  
    const calcularRango = () => {
      const hoy = new Date();
      const hoyStr = hoy.toLocaleDateString('en-CA');
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
        desde = fechaInicio;
        hasta = fechaFin;
      }
      return {
        desde: `${desde}T00:00:00`,
        hasta: `${hasta}T23:59:59`
      };
    };
  
    const contarVisitantes = async () => {
      const hoy = new Date().toLocaleDateString('en-CA');
      const semana = new Date();
      semana.setDate(semana.getDate() - 7);
      const semanaStr = semana.toLocaleDateString('en-CA');
      const mes = new Date();
      mes.setDate(mes.getDate() - 30);
      const mesStr = mes.toLocaleDateString('en-CA');
  
      const [resHoy, resSemana, resMes] = await Promise.all([
        supabase.from('control_acceso_visitante').select('id_acceso', { count: 'exact', head: true }).gte('fecha_hora_visita', `${hoy}T00:00:00`),
        supabase.from('control_acceso_visitante').select('id_acceso', { count: 'exact', head: true }).gte('fecha_hora_visita', `${semanaStr}T00:00:00`),
        supabase.from('control_acceso_visitante').select('id_acceso', { count: 'exact', head: true }).gte('fecha_hora_visita', `${mesStr}T00:00:00`),
      ]);
  
      setConteos({
        hoy: resHoy.count || 0,
        semana: resSemana.count || 0,
        mes: resMes.count || 0,
      });
    };
  
    const fetchData = async () => {
      const { desde, hasta } = calcularRango();
      const { data, error } = await supabase
        .from('control_acceso_visitante')
        .select('*')
        .gte('fecha_hora_visita', desde)
        .lte('fecha_hora_visita', hasta);
  
      if (!error && data) setVisitantes(data);
    };
  
    const exportarPDF = () => {
        const doc = new jsPDF();
        const fechaHora = new Date().toLocaleString();
        doc.setFontSize(16);
        doc.text('Reporte de Visitantes', 10, 15);
        doc.setFontSize(12);
        doc.text(`Fecha y hora de generación: ${fechaHora}`, 10, 25);
        
    
        let y = 35;
        doc.text(`Total de visitas: ${visitantes.length}`, 10, y);
        y += 10;
        doc.text('ID', 10, y);
        doc.text('Ingreso', 40, y);
        doc.text('Salida', 100, y);
        doc.text('Cliente', 160, y);
        y += 10;
    
        if (visitantes.length === 0) {
          doc.text('No hay visitas registradas para la opción seleccionada.', 10, y);
        } else {
          visitantes.forEach((v) => {
            const ingreso = new Date(v.fecha_hora_visita).toLocaleString();
            const salida = v.fecha_hora_salida ? new Date(v.fecha_hora_salida).toLocaleString() : '-';
            doc.text(v.id_acceso.toString(), 10, y);
            doc.text(ingreso, 40, y);
            doc.text(salida, 100, y);
            doc.text(v.numero_de_cliente?.toString() || '', 160, y);
            y += 10;
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
          });
        }
        y += 10;
        doc.save('reporte_visitantes.pdf');
    };
  
    return (
      <LayoutWithSidebar>
        <div className='reporte_visitantes_page'>

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

          <h2 className='titulo_reporte'>Reporte de Visitantes</h2>
  
          <div className='cards-summary'>
            <div className='card'>
              <h3>Visitantes Hoy</h3>
              <p>{conteos.hoy}</p>
            </div>
            <div className='card'>
              <h3>Esta Semana</h3>
              <p>{conteos.semana}</p>
            </div>
            <div className='card'>
              <h3>Este Mes</h3>
              <p>{conteos.mes}</p>
            </div>
          </div>
  
          <div className='filtros-container'>
            <h2 className='filtros-title'>Filtrar visitas por:</h2>
            <div className='filtros-opciones'>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value='hoy'>Hoy</option>
                <option value='semana'>Última semana</option>
                <option value='mes'>Último mes</option>
                <option value='anio'>Último año</option>
                <option value='personalizado'>Personalizado</option>
                </select>
                {filtro === 'personalizado' && (
                <>
                    <input type='date' value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                    <input type='date' value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </>
                )}
                <button className='export-btn' onClick={exportarPDF}>Exportar a PDF</button>
            </div>
          </div>
  
          <div className='summary'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Listado de Visitantes</h2>
            <h2>Total de visitas en la tabla: {visitantes.length}</h2>
          </div>
            <div className='tabla-visitantes'>
              <div className='tabla-header'>
                <span>ID</span>
                <span>Ingreso</span>
                <span>Salida</span>
                <span>Cliente</span>
              </div>
              {visitantes.length === 0 ? (
                <p style={{ textAlign: 'center', marginTop: '20px', fontWeight: 'bold', color: '#aa0000' }}>
                  No hay visitas registradas para la opción seleccionada.
                </p>
              ) : (
                visitantes.map((v) => (
                  <div key={v.id_acceso} className='tabla-row'>
                    <span>{v.id_acceso}</span>
                    <span>{v.fecha_hora_visita}</span>
                    <span>{v.fecha_hora_salida}</span>
                    <span>{v.numero_de_cliente}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }
  