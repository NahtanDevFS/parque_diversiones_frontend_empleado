'use client'

import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import { supabase } from './actions'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Swal from 'sweetalert2'
import './agregar_atraccion.css'
import { useRouter } from 'next/navigation'

interface Empleado {
  id_empleado: number
  nombre: string
  apellido: string
}

export default function AgregarAtraccionPage() {
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcionAtraccion, setDescripcionAtraccion] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [alturaMinima, setAlturaMinima] = useState('')
  const [idEmpleado, setIdEmpleado] = useState('')
  const [ciclosPorTicket, setCiclosPorTicket] = useState('')
  const [ciclosProxManto, setCiclosProxManto] = useState('')
  const [detalleProxManto, setDetalleProxManto] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])

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

  // Carga de empleados con id_puesto = 5
  useEffect(() => {
    const fetchEmpleados = async () => {
      const { data, error } = await supabase
        .from('empleado')
        .select('id_empleado, nombre, apellido')
        .eq('id_puesto', 5)
      if (!error && data) setEmpleados(data as Empleado[])
    }
    fetchEmpleados()
  }, [])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // ---- VALIDACIONES ----
    if (!file) {
      await Swal.fire({ icon: 'warning', title: 'Imagen requerida', text: 'Selecciona una foto de la atracción.' })
      return
    }
    // Tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      await Swal.fire({ icon: 'warning', title: 'Formato no válido', text: 'Solo se aceptan JPG, PNG o WEBP.' })
      return
    }
    if (!modelo || !anio || !nombre) {
      await Swal.fire({ icon: 'warning', title: 'Campos vacíos', text: 'Modelo, año y nombre son obligatorios.' })
      return
    }
    if (+capacidad <= 0) {
      await Swal.fire({ icon: 'warning', title: 'Capacidad inválida', text: 'Debe ser mayor a 0.' })
      return
    }
    if (+alturaMinima <= 0) {
      await Swal.fire({ icon: 'warning', title: 'Altura inválida', text: 'Debe ser mayor a 0.' })
      return
    }
    if (!idEmpleado) {
      await Swal.fire({ icon: 'warning', title: 'Empleado requerido', text: 'Selecciona el encargado.' })
      return
    }
    if (+ciclosPorTicket <= 0 || +ciclosProxManto <= 0) {
      await Swal.fire({ icon: 'warning', title: 'Ciclos inválidos', text: 'Deben ser mayores a 0.' })
      return
    }

    // ---- SUBIDA ----
    Swal.fire({ title: 'Creando atracción...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    // Log de prueba para depurar
    console.log('Subiendo a bucket juegos-imgs con nombre:', fileName, 'tipo:', file.type, 'tamaño:', file.size)

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('juegos-imgs')
    .upload(fileName, file)

  if (uploadError) {
    // manejar el error
    await Swal.fire({
      icon: 'error',
      title: 'Error al subir foto',
      text: uploadError.message
    })
    return
  }

    const { data: urlData } = supabase.storage.from('juegos-imgs').getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // ---- INSERCIÓN ----
    const { error: insertError } = await supabase
      .from('atraccion')
      .insert([{
        modelo,
        anio,
        nombre,
        descripcion_atraccion: descripcionAtraccion,
        capacidad: +capacidad,
        altura_minima: +alturaMinima,
        id_empleado_encargado: +idEmpleado,
        ciclos_por_ticket: +ciclosPorTicket,
        ciclos_proximo_mantenimiento: +ciclosProxManto,
        estado_atraccion: 'funcional',
        detalle_proximo_mantenimiento: detalleProxManto,
        juego_foto: publicUrl,
        asientos_ocupados: 0
      }])

    if (insertError) {
      Swal.fire({ icon: 'error', title: 'Error al guardar', text: insertError.message })
      return
    }

    Swal.close()
    await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Atracción agregada correctamente.' })

    // ---- RESET ----
    setModelo('')
    setAnio('')
    setNombre('')
    setDescripcionAtraccion('')
    setCapacidad('')
    setAlturaMinima('')
    setIdEmpleado('')
    setCiclosPorTicket('')
    setCiclosProxManto('')
    setDetalleProxManto('')
    setFile(null)
  }

  return (
    <LayoutWithSidebar>
      <div className="agregar-atraccion-page">
        <div className="form-container">
          <h2 className="form-add-event-title">Agregar Nueva Atracción</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Modelo
              <input type="text" value={modelo} onChange={e => setModelo(e.target.value)} required />
            </label>

            <label>
              Año
              <input type="text" value={anio} onChange={e => setAnio(e.target.value)} required />
            </label>

            <label>
              Nombre
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </label>

            <label>
              Descripción de la Atracción
              <textarea
                rows={3}
                value={descripcionAtraccion}
                onChange={e => setDescripcionAtraccion(e.target.value)}
                required
              />
            </label>

            <label>
              Capacidad
              <input
                type="number"
                value={capacidad}
                onChange={e => setCapacidad(e.target.value)}
                min="1"
                required
              />
            </label>

            <label>
              Altura Mínima (m)
              <input
                type="number"
                step="0.1"
                value={alturaMinima}
                onChange={e => setAlturaMinima(e.target.value)}
                min="0.1"
                required
              />
            </label>

            <label>
              Empleado Encargado
              <select value={idEmpleado} onChange={e => setIdEmpleado(e.target.value)} required>
                <option value="">Selecciona...</option>
                {empleados.map(emp => (
                  <option key={emp.id_empleado} value={emp.id_empleado}>
                    {emp.nombre} {emp.apellido}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ciclos por Ticket
              <input
                type="number"
                value={ciclosPorTicket}
                onChange={e => setCiclosPorTicket(e.target.value)}
                min="1"
                required
              />
            </label>

            <label>
              Ciclos hasta Próx. Mantenimiento
              <input
                type="number"
                value={ciclosProxManto}
                onChange={e => setCiclosProxManto(e.target.value)}
                min="1"
                required
              />
            </label>

            <label>
              Detalle Próx. Mantenimiento
              <textarea
                rows={3}
                value={detalleProxManto}
                onChange={e => setDetalleProxManto(e.target.value)}
                required
              />
            </label>

            <label>
              Foto de la Atracción
              <input type="file" accept="image/*" onChange={handleFileChange} required />
            </label>

            <button type="submit">Crear Atracción</button>
          </form>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}