"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/login/actions";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import "./empleados.css";
import Swal from "sweetalert2";


<div className="ControlEmpleados_page">
  <div className="control-container">
    <header className="header">
      <h2>CONTROL DE EMPLEADOS</h2>
    </header>
  </div>
</div>




interface Employee {
  id: number;
  name: string;
  lastname: string;
  entrada: boolean;
  salida: boolean;
}

interface RegistroEmpleado {
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  fk_empleado: {
    nombre: string;
    apellido: string;
  };
}

export default function ControlEmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allExited, setAllExited] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [filter, setFilter] = useState("hoy");

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
            // Solo el gerente (id_puesto = 3) y el de seguridad (id_puesto = 2) tiene acceso a esta página
            if (session.id_puesto !== 3 && session.id_puesto !== 2) {
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("empleado")
      .select("id_empleado, nombre, apellido, estado_empleado");
  
    if (error) {
      showNotification("Error al obtener empleados", "error");
      console.error("Error al obtener empleados:", error);
    } else {
      setEmployees(
        data.map((emp) => ({
          id: emp.id_empleado,
          name: emp.nombre,
          lastname: emp.apellido,
          entrada: emp.estado_empleado === "Presente",
          salida: emp.estado_empleado === "Ausente",
        }))
      );
    }
  };
  

  useEffect(() => {
    const allOut = employees.every((emp) => emp.salida);
    setAllExited(allOut);
  }, [employees]);

  const showNotification = (message: string, type: "error" | "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const actualizarEstadoEmpleado = async (id: number, estado: "Presente" | "Ausente") => {
    const { error } = await supabase
      .from("empleado")
      .update({ estado_empleado: estado })
      .eq("id_empleado", id);

    if (error) {
      console.error("Error al actualizar estado_empleado:", error);
      showNotification("Error al actualizar estado del empleado", "error");
    }
  };

  const handleEntrada = async (id: number) => {
    try {
      const horaEntrada = new Date().toTimeString().split(" ")[0];
      const fechaHoy = new Date().toISOString().split("T")[0];

      setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, entrada: true } : emp)));

      const { data: records, error: fetchError } = await supabase
        .from("control_empleado")
        .select()
        .eq("id_empleado", id)
        .eq("fecha", fechaHoy)
        .limit(1);

      if (fetchError) throw fetchError;

      const existingRecord = records?.[0];

      if (existingRecord) {
        const { error } = await supabase
          .from("control_empleado")
          .update({ hora_entrada: horaEntrada, hora_salida: null })
          .eq("id_empleado", id)
          .eq("fecha", fechaHoy);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("control_empleado").insert({
          id_empleado: id,
          fecha: fechaHoy,
          hora_entrada: horaEntrada,
          hora_salida: null,
        });
        if (error) throw error;
      }

      await supabase.from("estado_empleado").update({ presente: true, ausente: false }).eq("id_empleado", id);
      await actualizarEstadoEmpleado(id, "Presente");
      fetchEmployees(); // <--- agrega esto
      


      showNotification("Entrada registrada correctamente", "success");
    } catch (error) {
      console.error("Error al registrar la entrada:", error);
      showNotification("Error al registrar entrada", "error");
      setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, entrada: false } : emp)));
    }
  };

  const handleSalida = async (id: number) => {
    try {
      const fechaHoy = new Date().toISOString().split("T")[0];
      const horaSalida = new Date().toTimeString().split(" ")[0];

      const { data: records, error: fetchError } = await supabase
        .from("control_empleado")
        .select()
        .eq("id_empleado", id)
        .eq("fecha", fechaHoy)
        .limit(1);

      if (fetchError) throw fetchError;

      const registro = records?.[0];

      if (!registro?.hora_entrada) {
        showNotification("Debe registrar la entrada primero", "error");
        return;
      }

      const entrada = new Date(`${fechaHoy}T${registro.hora_entrada}`);
      const salida = new Date(`${fechaHoy}T${horaSalida}`);
      const diffMs = salida.getTime() - entrada.getTime();
      const horasTrabajadas = +(diffMs / (1000 * 60 * 60)).toFixed(2);

      const { error } = await supabase
        .from("control_empleado")
        .update({
          hora_salida: horaSalida,
          horas_trabajadas: horasTrabajadas,
        })
        .eq("id_empleado", id)
        .eq("fecha", fechaHoy);

      if (error) throw error;

      await supabase.from("estado_empleado").update({ presente: false, ausente: true }).eq("id_empleado", id);
      await actualizarEstadoEmpleado(id, "Ausente");
      fetchEmployees(); // <--- agrega esto


      setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, salida: true } : emp)));
      showNotification("Salida registrada correctamente", "success");
    } catch (error) {
      console.error("Error al registrar la salida:", error);
      showNotification("Error al registrar salida", "error");
    }
  };

  const generarPDF = async () => {
    const hoy = new Date();
    const desde = new Date(hoy);

    switch (filter) {
      case "semana":
        desde.setDate(hoy.getDate() - 7);
        break;
      case "mes":
        desde.setMonth(hoy.getMonth() - 1);
        break;
      case "anio":
        desde.setFullYear(hoy.getFullYear() - 1);
        break;
    }

    const desdeStr = desde.toISOString().split("T")[0];
    const hastaStr = hoy.toISOString().split("T")[0];

    const { data, error } = await supabase
    .from("control_empleado")
    .select("fecha, hora_entrada, hora_salida, fk_empleado(nombre, apellido)")
    .gte("fecha", desdeStr)
    .lte("fecha", hastaStr);
  
  if (error || !data) {
    console.error("Error al generar PDF:", error);
    showNotification("Error al generar el PDF", "error");
    return;
  }
  
  // ✅ Aquí transformamos cada registro
  const registros = data.map((row) => ({
    fecha: row.fecha,
    hora_entrada: row.hora_entrada,
    hora_salida: row.hora_salida,
    fk_empleado: Array.isArray(row.fk_empleado) ? row.fk_empleado[0] : row.fk_empleado,
  })) as RegistroEmpleado[];
  
    const doc = new jsPDF();
    doc.text("Reporte de Asistencia", 14, 14);

    autoTable(doc, {
      head: [["Empleado", "Fecha", "Hora Entrada", "Hora Salida"]],
      body: registros.map((row) => [
        `${row.fk_empleado.nombre} ${row.fk_empleado.apellido}`,
        row.fecha,
        row.hora_entrada || "-",
        row.hora_salida || "-",
      ]),
    });

    doc.save(`reporte_asistencia_${filter}.pdf`);
    showNotification("PDF generado exitosamente", "success");
  };

  return (
    <LayoutWithSidebar>
      <div className={`control-container ${allExited ? "moved" : ""}`}>
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}> </h2>

        <header className="header">
          <h2>CONTROL DE EMPLEADOS</h2>
        </header>

        <main>
          {employees.map((emp) => (
            <div key={emp.id} className="employee">
              <span className="nombre-estado">
                {emp.name} {emp.lastname}
                <strong className={emp.entrada && !emp.salida ? "estado-presente" : emp.salida ? "estado-ausente" : ""}>
                  {" "}{emp.entrada && !emp.salida ? "Presente" : emp.salida ? "Ausente" : ""}
                </strong>
              </span>

              <div className="button-group">
                <button
                  onClick={() => handleEntrada(emp.id)}
                  disabled={emp.entrada}
                  className={`entrada-btn ${emp.entrada ? "disabled" : ""}`}
                >
                  REGISTRAR ENTRADA
                </button>
                <button
                  onClick={() => handleSalida(emp.id)}
                  disabled={!emp.entrada || emp.salida}
                  className={`salida-btn ${!emp.entrada || emp.salida ? "disabled" : ""}`}
                >
                  REGISTRAR SALIDA
                </button>
              </div>
            </div>
          ))}
        </main>

        <div className="pdf-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
            <option value="anio">Último año</option>
          </select>
          <button onClick={generarPDF}>Generar PDF</button>
        </div>

        {notification && (
          <div className={`notification ${notification.type}`}>{notification.message}</div>
        )}
      </div>
    </LayoutWithSidebar>
  );
}