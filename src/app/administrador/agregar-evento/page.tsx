// Mantén 'use client'
'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { supabase } from './actions';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import Swal from 'sweetalert2';
import './agregar_evento.css';
import { useRouter } from 'next/navigation';

export default function AgregarEventoPage() {
  const [modoFormulario, setModoFormulario] = useState<'agregar' | 'modificar'>('agregar');
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<string>('');

  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugarEvento, setLugarEvento] = useState('');
  const [costoEvento, setCostoEvento] = useState('');
  const [imagenActual, setImagenActual] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const router = useRouter();

  useEffect(() => {
    const storedSession = localStorage.getItem('employeeSession');
    if (!storedSession) return router.push('/');
    try {
      const session = JSON.parse(storedSession);
      if (session.id_puesto !== 6) {
        Swal.fire({ title: 'Acceso denegado', text: 'No tienes permiso', icon: 'error' })
          .then(() => router.push('/'));
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (modoFormulario === 'modificar') {
      supabase.from('evento').select('id_evento, nombre_evento').then(({ data }) => {
        if (data) setEventos(data);
      });
    }
  }, [modoFormulario]);

  useEffect(() => {
    if (eventoSeleccionado) {
      supabase.from('evento').select('*').eq('id_evento', eventoSeleccionado).single().then(({ data }) => {
        if (data) {
          setFecha(data.fecha_evento);
          setHoraInicio(data.hora_apertura);
          setHoraFin(data.hora_cierre);
          setNombre(data.nombre_evento);
          setDescripcion(data.descripcion_evento);
          setLugarEvento(data.lugar);
          setCostoEvento(data.costo);
          setImagenActual(data.imagen_evento || null);
        }
      });
    }
  }, [eventoSeleccionado]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (modoFormulario === 'agregar' && !file) {
      return Swal.fire({ icon: 'warning', title: 'Imagen requerida' });
    }

    const selectedDate = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return Swal.fire({ icon: 'warning', title: 'Fecha inválida' });
    }

    if (horaInicio >= horaFin) {
      return Swal.fire({ icon: 'warning', title: 'Hora inválida' });
    }

    Swal.fire({ title: modoFormulario === 'agregar' ? 'Creando evento...' : 'Actualizando evento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let publicUrl = '';
    if (file) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('events-imgs').upload(fileName, file);
      if (uploadError) return Swal.fire({ icon: 'error', title: 'Error al subir imagen' });
      const { data } = supabase.storage.from('events-imgs').getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    }

    if (modoFormulario === 'agregar') {
      const { error } = await supabase.from('evento').insert([{
        fecha_evento: fecha,
        hora_apertura: horaInicio,
        hora_cierre: horaFin,
        nombre_evento: nombre,
        descripcion_evento: descripcion,
        imagen_evento: publicUrl,
        lugar: lugarEvento,
        costo: costoEvento
      }]);
      if (error) return Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } else {
      const actualizacion: Record<string, any> = {
        fecha_evento: fecha,
        hora_apertura: horaInicio,
        hora_cierre: horaFin,
        nombre_evento: nombre,
        descripcion_evento: descripcion,
        lugar: lugarEvento,
        costo: costoEvento
      };
      
      if (publicUrl) {
        actualizacion.imagen_evento = publicUrl;
      }

      const { error } = await supabase.from('evento').update(actualizacion).eq('id_evento', eventoSeleccionado);
      if (error) return Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }

    Swal.close();
    await Swal.fire({ icon: 'success', title: '¡Listo!', text: modoFormulario === 'agregar' ? 'Evento agregado' : 'Evento modificado' });

    setFecha(''); setHoraInicio(''); setHoraFin(''); setNombre(''); setDescripcion('');
    setLugarEvento(''); setCostoEvento(''); setFile(null); setEventoSeleccionado('');
  };

  const handleDelete = async () => {
    if (!eventoSeleccionado) return;
  
    const confirm = await Swal.fire({
      title: '¿Eliminar evento?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
  
    if (confirm.isConfirmed) {
      const { error } = await supabase
        .from('evento')
        .delete()
        .eq('id_evento', eventoSeleccionado);
  
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error al eliminar',
          text: error.message
        });
        return;
      }
  
      Swal.fire({
        icon: 'success',
        title: 'Evento eliminado correctamente'
      });
  
      // Reiniciar el formulario
      setEventoSeleccionado('');
      setEventos([]);
      setFecha('');
      setHoraInicio('');
      setHoraFin('');
      setNombre('');
      setDescripcion('');
      setLugarEvento('');
      setCostoEvento('');
      setFile(null);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className='agregar-evento-page'>
        <div className="form-container">
          <h2 className='form-add-event-title'>
            {modoFormulario === 'agregar' ? 'Agregar Nuevo Evento' : 'Modificar Evento'}
          </h2>

          <label>
            <h3>Acción a realizar</h3>
            <select value={modoFormulario} onChange={e => setModoFormulario(e.target.value as any)}>
              <option value="agregar">Agregar Evento</option>
              <option value="modificar">Modificar Evento</option>
            </select>
          </label>

          {modoFormulario === 'modificar' && (
            <label>
              Selecciona evento a modificar
              <select value={eventoSeleccionado} onChange={e => setEventoSeleccionado(e.target.value)}>
                <option value="">-- Selecciona un evento --</option>
                {eventos.map(ev => (
                  <option key={ev.id_evento} value={ev.id_evento}>{ev.nombre_evento}</option>
                ))}
              </select>
            </label>
          )}

          <form onSubmit={handleSubmit}>
            <label>Fecha del Evento
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
            </label>

            <label>Hora de Inicio
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required />
            </label>

            <label>Hora de Fin
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} required />
            </label>

            <label>Nombre del Evento
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </label>

            <label>Lugar del Evento
              <input type="text" value={lugarEvento} onChange={e => setLugarEvento(e.target.value)} required />
            </label>

            <label>Precio
              <input type="number" min="0" step="0.01" value={costoEvento} onChange={e => setCostoEvento(e.target.value)} required />
            </label>

            <label>Descripción
              <textarea rows={4} value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
            </label>
            {modoFormulario === 'modificar' && imagenActual && (
              <div style={{ marginTop: '1rem', textAlign: 'center', marginBottom: '2rem' }}>
                <p>Imagen actual del evento:</p>
                <img src={imagenActual} alt="Imagen actual del evento" style={{ maxWidth: '70%', borderRadius: '8px' }} />
              </div>
            )}

            <label>Nueva imagen del Evento
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            <button type="submit">{modoFormulario === 'agregar' ? 'Crear Evento' : 'Guardar Cambios'}</button>

              {modoFormulario === 'modificar' && eventoSeleccionado && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{ marginTop: '0.5rem' }}
                >
                  Eliminar Evento
                </button>
              )}
          </form>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
