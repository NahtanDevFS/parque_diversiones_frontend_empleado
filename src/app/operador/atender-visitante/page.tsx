'use client'
import React, { useEffect, useState } from 'react';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import './atender_visitante.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/login/actions'; 

interface Atraccion {
  id_atraccion: number;
  nombre: string;
  juego_foto: string;
}

export default function AtenderVisitante() {
  const [juegos, setJuegos] = useState<Atraccion[]>([]);
  const router = useRouter();

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