'use client'

import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import { supabase } from './actions'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Swal from 'sweetalert2'
import './agregar_evento.css'
import { useRouter } from 'next/navigation'

export default function AgregarEventoPage() {
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState<File | null>(null)

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // 1. Validación de imagen
    if (!file) {
      await Swal.fire({
        icon: 'warning',
        title: 'Imagen requerida',
        text: 'Por favor selecciona una imagen del evento.'
      })
      return
    }

    // 2. Validación de fecha no menor a hoy
    const selectedDate = new Date(fecha)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      await Swal.fire({
        icon: 'warning',
        title: 'Fecha inválida',
        text: 'La fecha del evento no puede ser anterior o igual a hoy.'
      })
      return
    }

    // 3. Validación de hora de apertura antes de hora de cierre
    if (horaInicio >= horaFin) {
      await Swal.fire({
        icon: 'warning',
        title: 'Hora inválida',
        text: 'La hora de inicio debe ser anterior a la hora de finalización.'
      })
      return
    }

    // 4. Mostrar modal de carga
    Swal.fire({
      title: 'Creando evento...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    })

    // 5. Subir la imagen al bucket
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase
      .storage
      .from('events-imgs')
      .upload(filePath, file)

    if (uploadError) {
      Swal.fire({
        icon: 'error',
        title: 'Error al subir imagen',
        text: uploadError.message
      })
      return
    }

    // 6. Obtener URL pública
    const { data } = supabase
      .storage
      .from('events-imgs')
      .getPublicUrl(filePath)

    const publicUrl = data.publicUrl

    // 7. Insertar registro en la tabla correcta
    const { error: insertError } = await supabase
      .from('eventos')  // ajusta al nombre real de tu tabla
      .insert([{
        fecha_evento: fecha,
        hora_apertura: horaInicio,
        hora_cierre: horaFin,
        nombre_evento: nombre,
        descripcion_evento: descripcion,
        imagen_evento: publicUrl
      }])

    if (insertError) {
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar evento',
        text: insertError.message
      })
      return
    }

    // 8. Cerrar modal y mostrar éxito
    Swal.close()
    await Swal.fire({
      icon: 'success',
      title: '¡Listo!',
      text: 'Evento agregado correctamente.'
    })

    // 9. Resetear formulario
    setFecha('')
    setHoraInicio('')
    setHoraFin('')
    setNombre('')
    setDescripcion('')
    setFile(null)
  }

  return (
    <LayoutWithSidebar>
      <div className='agregar-evento-page'>
        <div className="form-container">
          <h2 className='form-add-event-title'>Agregar Nuevo Evento</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Fecha del Evento
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
              />
            </label>

            <label>
              Hora de Inicio del Evento
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                required
              />
            </label>

            <label>
              Hora de Finalización del Evento
              <input
                type="time"
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                required
              />
            </label>

            <label>
              Nombre del Evento
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Desfile hípico"
                required
              />
            </label>

            <label>
              Descripción
              <textarea
                rows={4}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalles del evento..."
                required
              />
            </label>

            <label>
              Imagen del Evento
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </label>

            <button type="submit">Crear Evento</button>
          </form>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}
