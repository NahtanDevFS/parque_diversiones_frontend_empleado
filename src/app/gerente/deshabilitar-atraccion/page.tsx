// app/atracciones/listar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from './actions'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Swal from 'sweetalert2'
import './deshabilitar_atraccion.css'
import { useRouter } from 'next/navigation'

interface Atraccion {
  id_atraccion: number
  modelo: string
  nombre: string
  estado_atraccion: string
}

export default function ListarAtraccionADeshabilitarPage() {
  const [atracciones, setAtracciones] = useState<Atraccion[]>([])
  const [loading, setLoading] = useState(false)

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
        // Solo el gerente (id_puesto = 3) tiene acceso a esta página
        if (session.id_puesto !== 3) {
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

  const fetchAtracciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('atraccion')
      .select('id_atraccion,modelo,nombre,estado_atraccion')
    setLoading(false)
    if (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message })
    } else {
      setAtracciones(data as Atraccion[])
    }
  }

  useEffect(() => {
    fetchAtracciones()
  }, [])

  const toggleEstado = (item: Atraccion) => {
    const nuevoEstado = item.estado_atraccion === 'funcional' ? 'deshabilitada' : 'funcional'
    Swal.fire({
      title: `¿Deseas ${nuevoEstado === 'funcional' ? 'habilitar' : 'deshabilitar'} esta atracción?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevoEstado === 'funcional' ? 'Sí, habilitar' : 'Sí, deshabilitar',
      cancelButtonText: 'Cancelar'
    }).then(async (res) => {
      if (res.isConfirmed) {
        Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        const { error } = await supabase
          .from('atraccion')
          .update({ estado_atraccion: nuevoEstado })
          .eq('id_atraccion', item.id_atraccion)
        Swal.close()
        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message })
        } else {
          Swal.fire({ icon: 'success', title: 'Listo', text: `Atracción ${nuevoEstado}.` })
          fetchAtracciones()
        }
      }
    })
  }

  return (
    <LayoutWithSidebar>
        <div className='deshabilitar-atraccion-page'>
            <div className="atraccion-list-page">
                <h2>Listado de Atracciones a Deshabilitar/Habilitar</h2>
                {loading ? (
                <p>Cargando atracciones...</p>
                ) : (
                <div className="atraccion-list">
                    {atracciones.map((a) => (
                    <div key={a.id_atraccion} className="atr-card">
                        <h3>{a.nombre}</h3>
                        <p><strong>Modelo:</strong> {a.modelo}</p>
                        <button
                        className={`btn-estado ${a.estado_atraccion === 'funcional' ? 'disable' : 'enable'}`}
                        onClick={() => toggleEstado(a)}
                        >
                        {a.estado_atraccion === 'funcional' ? 'Deshabilitar' : 'Habilitar'}
                        </button>
                    </div>
                    ))}
                </div>
                )}
            </div>
        </div>
    </LayoutWithSidebar>
  )
}
