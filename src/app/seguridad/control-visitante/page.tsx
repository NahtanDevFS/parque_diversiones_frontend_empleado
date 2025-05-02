"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/login/actions";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import Swal from "sweetalert2";
import "./salidas.css";

interface Visitante {
  id_acceso: number;
  numero_de_cliente: number;
  fecha_hora_visita: string;
}

export default function SalidasVisitantes() {
  const [todosVisitantes, setTodosVisitantes] = useState<Visitante[]>([]);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetchVisitantes();
  }, []);

  const fetchVisitantes = async () => {
    const { data, error } = await supabase
      .from("control_acceso_visitante")
      .select("id_acceso, numero_de_cliente, fecha_hora_visita")
      .is("fecha_hora_salida", null);

    if (error) {
      console.error("Error al cargar visitantes:", error);
    } else {
      setTodosVisitantes(data || []);
      setVisitantes(data || []);
    }
  };

  const marcarSalida = async (id_acceso: number) => {
    const fechaHoraSalida = new Date().toISOString();

    const { error } = await supabase
      .from("control_acceso_visitante")
      .update({ fecha_hora_salida: fechaHoraSalida })
      .eq("id_acceso", id_acceso);

    if (error) {
      Swal.fire("❌ Error", "No se pudo marcar la salida", "error");
    } else {
      Swal.fire("✅ Salida registrada", "Visitante marcado como salido", "success");
      setTodosVisitantes(prev => prev.filter(v => v.id_acceso !== id_acceso));
      setVisitantes(prev => prev.filter(v => v.id_acceso !== id_acceso));
    }
  };

  const handleBuscar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value;
    setBusqueda(texto);

    if (texto.trim() === "") {
      setVisitantes(todosVisitantes);
    } else {
      const filtrados = todosVisitantes.filter(v =>
        v.numero_de_cliente.toString().includes(texto.trim())
      );
      setVisitantes(filtrados);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="salidas-page">
        <div className="salidas-container">
  
          
          <center><h2>Control de Salidas</h2></center>
  
          <div className="buscador">
            <input
              type="text"
              placeholder="Buscar número de visitante..."
              value={busqueda}
              onChange={handleBuscar}
            />
          </div>
  
          <div className="contador-visitantes">
            Visitantes activos: {visitantes.length}
          </div>
  
          {visitantes.length === 0 ? (
            <p>No hay visitantes activos.</p>
          ) : (
            <div className="tabla-container">
              <table className="tabla-visitantes">
                <thead>
                  <tr>
                    <th>Número de Visitante</th>
                    <th>Hora de Entrada</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visitantes.map((visitante) => (
                    <tr key={visitante.id_acceso}>
                      <td>{visitante.numero_de_cliente}</td>
                      <td>{new Date(visitante.fecha_hora_visita).toLocaleString()}</td>
                      <td>
                        <button
                          className="boton-salida"
                          onClick={() => marcarSalida(visitante.id_acceso)}
                        >
                          Marcar Salida
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
  
        </div> {/* cierra .salidas-container */}
      </div> {/* cierra .salidas-page */}
    </LayoutWithSidebar>
  );
}
  
