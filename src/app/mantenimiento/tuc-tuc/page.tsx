"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { supabase } from "@/app/login/actions";
import "./lista_unidades.css";

interface Unidad {
  id_unidad: number;
  estado: string;
  tiempo_reparacion: string | null;
  juego_foto: string | null;
  atraccion: { nombre: string };
}

export default function ListaUnidades() {
  
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const router = useRouter();
  
  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase
        .from("unidad_atraccion")
        .select(
          `
          id_unidad,
          estado,
          tiempo_reparacion,
          juego_foto,
          atraccion!inner(nombre)
        `
        )
        .order("id_unidad", { ascending: true });

      if (error) {
        console.error("Error al cargar unidades:", error);
        return;
      }
      setUnidades(
        (data as any[]).map((u) => ({
          ...u,
          atraccion: Array.isArray(u.atraccion) ? u.atraccion[0] : u.atraccion,
        }))
      );
    }

    fetchUnidades();
    
  }, []);

  const handleProximo = (id: number) => {
    // Aquí defines qué debe ocurrir cuando se pulse “Próximo Mantenimiento”.
    // Por ejemplo, llevar a una pantalla de programación:
    router.push(`/mantenimiento/tuc-tuc/${id}`);
  };

  return (
    <LayoutWithSidebar>
      <div className="lista-unidades-page">
        <h1>Listado de Unidades</h1>
        <p>Selecciona una unidad para programar su mantenimiento.</p>
        {/* Tabla de Unidades */}
        <table className="tabla-unidades">
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Estado</th>
              <th>Última Reparación</th>
              <th>Imagen</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id_unidad}>
                <td>
                  {u.atraccion.nombre} – #{u.id_unidad}
                </td>
                <td>{u.estado}</td>
                <td>
                  {u.tiempo_reparacion
                    ? new Date(u.tiempo_reparacion).toLocaleDateString()
                    : "–"}
                </td>
                <td>
                  {u.juego_foto && (
                    <img
                      src={u.juego_foto}
                      alt={`${u.atraccion.nombre} unidad ${u.id_unidad}`}
                      className="thumb-unidad"
                    />
                  )}
                </td>
                <td>
                  <button
                    className="btn-proximo"
                    onClick={() => handleProximo(u.id_unidad)}>Hacer Mantenimiento</button>
                </td>
                </tr>
              
            ))}
          </tbody>
        </table>
      </div>
      {/* Botón Volver */}
      <div className="volver-container">
          <Link href="/mantenimiento/hacer-mantenimiento">
            <button className="btn-volver">← Volver al Panel Monitoreo</button>
          </Link>
        </div>
    </LayoutWithSidebar>
  );
}