'use client'
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
}

export default function AtenderVisitante() {
  const [juegos, setJuegos] = useState<Atraccion[]>([]);
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
        .select('id_atraccion, nombre, juego_foto');

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

  return (
    <LayoutWithSidebar>
      <div className='Atender_visitante_page'>
        <div className="titulo_operador">
          <h1>Bienvenido al control de atracciones</h1>
          <p>Escoja el juego que está a su cargo</p>
        </div>

        <div className="atender_visitante_grid">
          {juegos.map((juego) => (
            <div key={juego.id_atraccion} className="juego-card" onClick={() => irAJuego(juego.id_atraccion)}>
              <img src={juego.juego_foto} alt={juego.nombre} className="juego-imagen" />
              <h3>{juego.nombre}</h3>
            </div>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}