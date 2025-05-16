'use client';
import React, { useEffect, useState } from 'react';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import './atender_visitante.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/login/actions';
import Swal from 'sweetalert2';

interface Atraccion {
  id_atraccion: number;
  nombre: string;
  juego_foto: string;
  estado_atraccion: string;
}

export default function AtenderVisitante() {
  const [juegos, setJuegos] = useState<Atraccion[]>([]);
  const router = useRouter();

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
            .update({ estado_actividad_empleado: 'En el módulo de operador' })
            .eq('id_empleado', id_empleado);
          if (error) console.error('Error al actualizar estado automático:', error);
          else console.log('Estado automático actualizado:', data);
          }})();
            // Solo el admin (id_puesto = 6) y el operador (id_puesto = 1) tiene acceso a esta página
            if (session.id_puesto !== 6 && session.id_puesto !== 1) {
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
    async function fetchJuegos() {
      const { data, error } = await supabase
        .from('atraccion')
        .select('id_atraccion, nombre, juego_foto, estado_atraccion');

      if (error) {
        console.error('Error al obtener atracciones:', error);
      } else {
        setJuegos(data);
      }
    }

    fetchJuegos();
  }, []);

  const irAJuego = (id: number) => {
    router.push(`/operador/juego/${id}`);
  };

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

  return (
    <LayoutWithSidebar>
      <div className='atender_visitante_contenedor'>
        <div className="estado-barra">
          <h3>Opciones para notificar cese de actividades:</h3>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="En el almuerzo">En el almuerzo</option>
            <option value="Turno cerrado">Turno cerrado</option>
            <option value="Ausencia temporal">Ausencia temporal</option>
          </select>
          <button onClick={handleStatusUpdate}>Actualizar estado</button>
      </div>
        <div className="titulo_operador">
          <h1>Bienvenido al control de atracciones</h1>
          <p>Escoja el juego que está a su cargo</p>
        </div>

      <div className="atender_visitante_grid">
        {juegos.map((juego) => {
          const esFuncional = juego.estado_atraccion.toLowerCase() === 'funcional';
          return (
            <div
              key={juego.id_atraccion}
              className={`juego-card ${!esFuncional ? 'juego-rojo' : ''}`}
              onClick={() => irAJuego(juego.id_atraccion)}
            >
              <img src={juego.juego_foto} alt={juego.nombre} className="juego-imagen" />
              <h3>{juego.nombre}</h3>
              {!esFuncional && (
                <p className="estado-alerta"> Estado: {juego.estado_atraccion}</p>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </LayoutWithSidebar>
  );
}