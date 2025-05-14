"use client";

import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import React, { useEffect, useState } from 'react';
import { supabase } from './actions';
import './control_personal.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import jsPDF from 'jspdf';
import { useRouter } from 'next/navigation';

const MySwal = withReactContent(Swal);

type Employee = {
  id_empleado: number;
  nombre: string;
  apellido: string;
  empleado_foto: string;
  telefono: string;
  estado_actividad_empleado: string;
  estado_empleado: string;
  estado_cuenta: number;
  puesto: {
    nombre: string;
  };
  fecha_contratacion: string;
  email: string;
};

export default function ControlPersonalPage() {
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPuesto, setFilterPuesto] = useState('');
  const [filterEstadoEmpleado, setFilterEstadoEmpleado] = useState('');
  const [filterEstadoCuenta, setFilterEstadoCuenta] = useState('');

  // Estado para el selector de actividad manual
    const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');

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
                  .update({ estado_actividad_empleado: 'En el módulo de control de personal' })
                  .eq('id_empleado', id_empleado);
                if (error) console.error('Error al actualizar estado automático:', error);
                else console.log('Estado automático actualizado:', data);
              }
            })();

      // Solo el gerente (id_puesto = 3) y administrador (id_puesto = 6) tiene acceso a esta página
      if (session.id_puesto !== 3 && session.id_puesto !== 6) {
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

  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from('empleado')
        .select(
          'id_empleado, nombre, apellido, empleado_foto, telefono, estado_actividad_empleado, estado_empleado, estado_cuenta, puesto(nombre), fecha_contratacion, email'
        );
      if (error) {
        console.error("Error al obtener empleados:", error);
      } else if (data) {
        // Convertimos el campo 'puesto' que se devuelve como arreglo a objeto simple
        const formattedEmployees: Employee[] = data.map((emp: any) => ({
          ...emp,
          puesto: emp.puesto && Array.isArray(emp.puesto) ? emp.puesto[0] : emp.puesto,
        }));
        setEmployees(formattedEmployees);
      }
    }
    fetchEmployees();
  }, []);

  // Filtrado de empleados basado en búsqueda y filtros
  const filteredEmployees = employees.filter(employee => {
    // Buscamos por nombre completo o ID (como cadena)
    const term = searchTerm.toLowerCase();
    const fullName = `${employee.nombre} ${employee.apellido}`.toLowerCase();
    const idStr = employee.id_empleado.toString();
    const matchesSearch = term === '' || idStr.includes(term) || fullName.includes(term);

    // Filtrar por puesto; si se seleccionó algún puesto (valor distinto de vacío)
    const matchesPuesto =
      filterPuesto === '' ||
      (employee.puesto && employee.puesto.nombre.toLowerCase() === filterPuesto.toLowerCase());

    // Filtrar por estado de asistencia (estado_empleado)
    const matchesEstadoEmpleado =
      filterEstadoEmpleado === '' ||
      employee.estado_empleado.toLowerCase() === filterEstadoEmpleado.toLowerCase();

    // Filtrar por estado de cuenta
    const matchesEstadoCuenta =
      filterEstadoCuenta === '' ||
      employee.estado_cuenta === parseInt(filterEstadoCuenta);

    return matchesSearch && matchesPuesto && matchesEstadoEmpleado && matchesEstadoCuenta;
  });

  async function handleToggleAccount(employee: Employee) {
    if (employee.estado_cuenta === 1) {
      // Proceso para desactivar la cuenta
      const confirmResult = await MySwal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción desactivará la cuenta del empleado.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });

      if (confirmResult.isConfirmed) {
        const { value: confirmation } = await MySwal.fire({
          title: 'Confirmación de seguridad',
          text: 'Escribe "desactivar" para confirmar la desactivación de la cuenta.',
          input: 'text',
          inputPlaceholder: 'Escribe "desactivar"',
          showCancelButton: true,
        });

        if (confirmation && confirmation.toLowerCase() === 'desactivar') {
          const { error } = await supabase
            .from('empleado')
            .update({ estado_cuenta: 0 })
            .eq('id_empleado', employee.id_empleado);
          if (error) {
            console.error("Error al desactivar la cuenta:", error);
            await MySwal.fire('Error', 'Ocurrió un error al desactivar la cuenta.', 'error');
          } else {
            await MySwal.fire('Cuenta desactivada', 'La cuenta ha sido desactivada correctamente.', 'success');
            setEmployees(employees.map(emp =>
              emp.id_empleado === employee.id_empleado ? { ...emp, estado_cuenta: 0 } : emp
            ));
          }
        } else {
          await MySwal.fire('Cancelado', 'La desactivación fue cancelada o la confirmación no fue correcta.', 'info');
        }
      }
    } else {
      // Proceso para activar la cuenta
      const confirmResult = await MySwal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción activará la cuenta del empleado.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });

      if (confirmResult.isConfirmed) {
        const { value: confirmation } = await MySwal.fire({
          title: 'Confirmación de seguridad',
          text: 'Escribe "activar" para confirmar la activación de la cuenta.',
          input: 'text',
          inputPlaceholder: 'Escribe "activar"',
          showCancelButton: true,
        });

        if (confirmation && confirmation.toLowerCase() === 'activar') {
          const { error } = await supabase
            .from('empleado')
            .update({ estado_cuenta: 1 })
            .eq('id_empleado', employee.id_empleado);
          if (error) {
            console.error("Error al activar la cuenta:", error);
            await MySwal.fire('Error', 'Ocurrió un error al activar la cuenta.', 'error');
          } else {
            await MySwal.fire('Cuenta activada', 'La cuenta ha sido activada correctamente.', 'success');
            setEmployees(employees.map(emp =>
              emp.id_empleado === employee.id_empleado ? { ...emp, estado_cuenta: 1 } : emp
            ));
          }
        } else {
          await MySwal.fire('Cancelado', 'La activación fue cancelada o la confirmación no fue correcta.', 'info');
        }
      }
    }
  }

  // Función que consulta el reporte y genera el PDF
  async function handleGenerateReportPDF(employee: Employee) {
    const { data, error } = await supabase
      .from('control_empleado')
      .select('*')
      .eq('id_empleado', employee.id_empleado);

    if (error) {
      console.error("Error al generar reporte:", error);
      await MySwal.fire('Error', 'Ocurrió un error al generar el reporte.', 'error');
      return;
    }

    const doc = new jsPDF();
    const watermark_logo_Base64 = "/marca_agua_logo_circular.png";
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const imageWidth = 180;
    const imageHeight = 180;
    const xPos = (pageWidth - imageWidth) / 2;
    const yPos = (pageHeight - imageHeight) / 2;

    doc.addImage(
      watermark_logo_Base64,
      "PNG",
      xPos,
      yPos,
      imageWidth,
      imageHeight,
      "",
      "FAST"
    );

    const title = `Reporte de asistencias de ${employee.nombre} ${employee.apellido}`;
    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, 20, { align: "center" });

    const xFecha = 20;
    const xHoraLlegada = 70;
    const xHoraSalida = 120;
    doc.setFontSize(12);
    let y = 40;
    doc.text("Fecha", xFecha, y);
    doc.text("Hora de llegada", xHoraLlegada, y);
    doc.text("Hora de salida", xHoraSalida, y);
    y += 10;

    if (data && data.length > 0) {
      data.forEach((record: any) => {
        doc.text(String(record.fecha), xFecha, y);
        doc.text(String(record.hora_entrada), xHoraLlegada, y);
        doc.text(String(record.hora_salida), xHoraSalida, y);
        y += 10;
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
          doc.text("Fecha", xFecha, y);
          doc.text("Hora de llegada", xHoraLlegada, y);
          doc.text("Hora de salida", xHoraSalida, y);
          y += 10;
        }
      });
    } else {
      doc.text("No se encontraron registros de asistencia.", 20, y);
    }

    doc.save(`${title}.pdf`);
  }

  return (
    <LayoutWithSidebar>
      <div className="control_personal_page">
        <div className="control_personal_container">
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

          <h1>Panel de Visualización y Control de Acceso del Personal</h1>
          {/* Barra de búsqueda y filtros */}
          <div className="search_filters_container">
            <input 
              type="text" 
              placeholder="Buscar empleado por nombre o ID" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <div className='filter_item_container'>
                <div className="filter_item">
                    <label>Filtrar por puesto:</label>
                    <select 
                        value={filterPuesto} 
                        onChange={(e) => setFilterPuesto(e.target.value)}
                    >
                        <option value="">Todos los puestos</option>
                        <option value="gerente">Gerente</option>
                        <option value="operador">Operador</option>
                        <option value="vendedor">Vendedor</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="guardia de seguridad">Guardia de seguridad</option>
                        {/* Agrega más opciones según tus datos */}
                    </select>
                </div>
                <div className="filter_item">
                    <label>Filtrar por asistencia:</label>
                    <select 
                        value={filterEstadoEmpleado} 
                        onChange={(e) => setFilterEstadoEmpleado(e.target.value)}
                    >
                        <option value="">Todas las asistencias</option>
                        <option value="Presente">Presente</option>
                        <option value="Ausente">Ausente</option>
                    </select>
                </div>
                <div className="filter_item">
                    <label>Filtrar por estado de cuenta:</label>
                    <select 
                        value={filterEstadoCuenta} 
                        onChange={(e) => setFilterEstadoCuenta(e.target.value)}
                    >
                        <option value="">Todas las cuentas</option>
                        <option value="1">Activa</option>
                        <option value="0">Desactivada</option>
                    </select>
                </div>
            </div>
          </div>
          <div className="personal_container">
            {filteredEmployees.map((employee) => (
              <div key={employee.id_empleado} className="employee_card">
                <div className="employee_info_container">
                  <div className="employee_info_left">
                    <img
                      src={employee.empleado_foto}
                      alt={`${employee.nombre} ${employee.apellido}`}
                    />
                    <p>
                      <strong>Nombre:</strong> {employee.nombre} {employee.apellido}
                    </p>
                  </div>
                  <div className="employee_info_right">
                    <p>
                      <strong>ID:</strong> {employee.id_empleado}
                    </p>
                    <p>
                      <strong>Fecha de contratación:</strong> {employee.fecha_contratacion}
                    </p>
                    <p>
                      <strong>Puesto:</strong> {employee.puesto?.nombre || "Sin asignar"}
                    </p>
                    <p>
                      <strong>Asistencia:</strong> {employee.estado_empleado}
                    </p>
                    <p>
                      <strong>Estado:</strong> {employee.estado_actividad_empleado}
                    </p>
                    <p>
                      <strong>Teléfono:</strong> {employee.telefono}
                    </p>
                    <p>
                      <strong>Email:</strong> {employee.email}
                    </p>
                    <p>
                      <strong>Estado de cuenta:</strong> {employee.estado_cuenta === 1 ? "Activa" : "Desactivada"}
                    </p>
                  </div>
                </div>
                <div className="employee_control_buttons_container">
                  <button
                    className="employee_control_button"
                    onClick={() => handleGenerateReportPDF(employee)}
                  >
                    Generar reporte de asistencias
                  </button>
                  {/*<button
                    className="employee_control_button"
                    onClick={() => handleToggleAccount(employee)}
                  >
                    {employee.estado_cuenta === 1 ? "Desactivar cuenta" : "Activar cuenta"}
                  </button>*/}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
