"use client";

import React, { useEffect, useState } from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { supabase } from "@/app/login/actions";
import { Search } from "lucide-react";
import "./vehiculos.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


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

  const ocupados = estaciones.filter((e) => e.capacidad_ocupada === 1).length;
  const libres = estaciones.length - ocupados; 


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
  
  

  return (
    <LayoutWithSidebar>
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
