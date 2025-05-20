"use client";

import React, { useEffect, useState } from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { supabase } from "@/app/login/actions";
import { Search } from "lucide-react";
import "./vehiculos.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";


interface Estacionamiento {
  id_estacionamiento: number;
  capacidad_ocupada: number;
  capacidad_maxima: number;
  espacio: string;
}

interface Vehiculo {
  id_vehiculo: number;
  placa_vehiculo: string;
  fecha_ingreso_vehiculo: string;  // <-- AGREGADO
  hora_entrada_vehiculo: string;
  hora_salida_vehiculo: string | null;
  id_estacionamiento: number;
}


export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [estaciones, setEstaciones] = useState<Estacionamiento[]>([]);
  const [filtro, setFiltro] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');


  const ocupados = estaciones.filter((e) => e.capacidad_ocupada === 1).length;
  const libres = estaciones.length - ocupados; 

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

            if (session.id_puesto !== 6) {
  (async () => {
    const { data, error } = await supabase
      .from('empleado')
      .update({ estado_actividad_empleado: 'En el módulo de parqueo' })
      .eq('id_empleado', session.id_empleado);
    if (error) console.error('Error al actualizar estado automático:', error);
    else console.log('Estado automático actualizado:', data);
  })();
}

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


  const cargarDatos = async () => {
    const { data: estacionamientos, error: errorEst } = await supabase.from("estacionamiento").select("*");
    const { data: vehiculos, error: errorVeh } = await supabase.from("vehiculo").select("*");
  
    if (errorEst) console.error("Error estaciones:", errorEst);
    else setEstaciones(estacionamientos || []);
  
    if (errorVeh) console.error("Error vehículos:", errorVeh);
    else setVehiculos(vehiculos || []);
  
  };
  
  useEffect(() => {
    cargarDatos();
  }, []);
  
  

  const liberarEspacio = async (id_estacionamiento: number) => {
    const vehiculo = vehiculos.find(
      (v) => v.id_estacionamiento === id_estacionamiento && v.hora_salida_vehiculo === null
    );
    if (!vehiculo) return;

    const salida = new Date().toTimeString().split(" ")[0];
    const { error: errorVeh } = await supabase
      .from("vehiculo")
      .update({ hora_salida_vehiculo: salida })
      .eq("id_vehiculo", vehiculo.id_vehiculo);

    const { error: errorEst } = await supabase
      .from("estacionamiento")
      .update({ capacidad_ocupada: 0 })
      .eq("id_estacionamiento", id_estacionamiento);

    if (errorVeh || errorEst) {
      console.error("Error al liberar espacio:", errorVeh || errorEst);
    } else {
      cargarDatos();
    }
  };

  const getEstado = (id: number) => {
    const est = estaciones.find((e) => e.id_estacionamiento === id);
    return est?.capacidad_ocupada ? "ocupado" : "libre";
  };

  const filtrados = estaciones
  .sort((a, b) => a.id_estacionamiento - b.id_estacionamiento)
  .filter((e) => {
    if (!filtro) return true;
    return vehiculos.some(
      (v) =>
        v.id_estacionamiento === e.id_estacionamiento &&
        v.placa_vehiculo.toLowerCase().includes(filtro.toLowerCase()) &&
        v.hora_salida_vehiculo === null
    );
  });

  const getVehiculoInfo = (id: number) => {
    return vehiculos.find(
      (v) => v.id_estacionamiento === id && v.hora_salida_vehiculo === null
    );
  };


  const generarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Parqueo", 14, 14);
  
    const body = vehiculos.map((v) => {
      const estacion = estaciones.find((e) => e.id_estacionamiento === v.id_estacionamiento);
      const espacio = estacion?.espacio || "—";
      const estado = v.hora_salida_vehiculo ? "Retirado" : "En parqueo";
  
      return [
        v.placa_vehiculo,
        v.fecha_ingreso_vehiculo,
        v.hora_entrada_vehiculo,
        v.hora_salida_vehiculo || "—",
        espacio,
        estado
      ];
    });
  
    autoTable(doc, {
      head: [["Placa", "Fecha Ingreso", "Hora Entrada", "Hora Salida", "Espacio", "Estado"]],
      body,
    });
  
    doc.save("reporte_completo_parqueo.pdf");
  };

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

  
  

  return (
    <LayoutWithSidebar>

      <div className="estado-barra-vehiculos">
  <label>
  Opciones para notificar cese de actividades:
    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
      <option value="En el almuerzo">En el almuerzo</option>
      <option value="Turno cerrado">Turno cerrado</option>
    </select>
  </label>
  <button onClick={handleStatusUpdate}>Actualizar estado</button>
</div>


      <div className="vehiculos-container">
        <h2 className="titulo">Módulo de Parqueo</h2>

        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por placa"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>


        <div className="resumen-estacionamiento">
          <span>🚗 Ocupados: <strong>{ocupados}</strong></span>
          <span>🟢 Libres: <strong>{libres}</strong></span>
        </div>

        <button onClick={generarPDF} className="btn-pdf">
          📄 Exportar a PDF
        </button>



        <div className="grid">
          {filtrados.map((e) => {
            const vehiculo = getVehiculoInfo(e.id_estacionamiento);
            return (
              <div
                key={e.id_estacionamiento}
                className={`espacio ${getEstado(e.id_estacionamiento)}`}
                onDoubleClick={() => liberarEspacio(e.id_estacionamiento)}
              >
                <div className="info-box">
                  <div className="info-id">{e.id_estacionamiento}</div>
                  {vehiculo && (
                    <>
                      <div className="info-placa">{vehiculo.placa_vehiculo}</div>
                      <div className="info-hora">{vehiculo.hora_entrada_vehiculo}</div>
                      <div className="vehiculo-icono">🚘</div>

                    </>
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