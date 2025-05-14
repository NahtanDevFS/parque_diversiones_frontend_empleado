"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { supabase } from './actions';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import Swal from 'sweetalert2';
import './agregar_atraccion.css';
import { useRouter } from 'next/navigation';

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
}
interface Atraccion { id_atraccion: number; nombre: string; }
interface UnidadAtraccion { id_unidad: number; id_atraccion: number; estado: string; juego_foto: string; ciclos_proximo_mantenimiento: number; contador_ciclos_actuales: number; }

export default function GestionarAtraccionPage() {
  const [tipoFormulario, setTipoFormulario] = useState<'atraccion' | 'unidad'>('atraccion');
  const [modoFormulario, setModoFormulario] = useState<'agregar' | 'modificar'>('agregar');

  // Atracción
  const [atracMod, setAtracMod] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [nombreAtr, setNombreAtr] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [alturaMinima, setAlturaMinima] = useState('');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [ciclosPorTicket, setCiclosPorTicket] = useState('');
  const [ciclosProxManto, setCiclosProxManto] = useState('');
  const [detalleProxManto, setDetalleProxManto] = useState('');
  const [estadoAtraccion, setEstadoAtraccion] = useState<'Funcional' | 'Mantenimiento' | 'Deshabilitada'>('Funcional');

  // Unidad
  const [idAtraccion, setIdAtraccion] = useState('');
  const [unidadMod, setUnidadMod] = useState('');
  const [estadoUnidad, setEstadoUnidad] = useState<'Funcional' | 'Mantenimiento' | 'Deshabilitada'>('Funcional');
  const [ciclosActualesUnidad, setCiclosActualesUnidad] = useState('');
  const [ciclosProxUnidad, setCiclosProxUnidad] = useState('');

  // Común
  const [file, setFile] = useState<File | null>(null);
  const [imagenActual, setImagenActual] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [atracciones, setAtracciones] = useState<Atraccion[]>([]);
  const [unidades, setUnidades] = useState<UnidadAtraccion[]>([]);

  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('employeeSession');
    if (!session) return router.push('/');
    const user = JSON.parse(session);
    if (user.id_puesto !== 6) {
      Swal.fire('Acceso denegado', 'No tienes permiso', 'error');
      router.push('/');
    }
    // carga inicial
    supabase.from('empleado').select('id_empleado,nombre,apellido').eq('id_puesto', 5).then(({ data }) => data && setEmpleados(data));
    supabase.from('atraccion').select('id_atraccion,nombre').then(({ data }) => data && setAtracciones(data));
  }, [router]);

  // carga ATRACCIÓN a modificar
  useEffect(() => {
    if (modoFormulario === 'modificar' && tipoFormulario === 'atraccion' && atracMod) {
      supabase.from('atraccion').select('*').eq('id_atraccion', atracMod).single().then(({ data }) => {
        if (data) {
          setModelo(data.modelo);
          setAnio(data.anio.toString());
          setNombreAtr(data.nombre);
          setDescripcion(data.descripcion_atraccion);
          setCapacidad(data.capacidad.toString());
          setAlturaMinima(data.altura_minima.toString());
          setIdEmpleado(data.id_empleado_encargado.toString());
          setCiclosPorTicket(data.ciclos_por_ticket.toString());
          setCiclosProxManto(data.ciclos_proximo_mantenimiento.toString());
          setDetalleProxManto(data.detalle_proximo_mantenimiento);
          setEstadoAtraccion(data.estado_atraccion);
          setImagenActual(data.juego_foto);
        }
      });
    }
  }, [modoFormulario, tipoFormulario, atracMod]);

  // carga UNIDADES a modificar
  useEffect(() => {
    if (modoFormulario === 'modificar' && tipoFormulario === 'unidad' && idAtraccion) {
      supabase.from('unidad_atraccion').select('*').eq('id_atraccion', idAtraccion).then(({ data }) => data && setUnidades(data));
    }
  }, [modoFormulario, tipoFormulario, idAtraccion]);

  useEffect(() => {
    if (modoFormulario === 'modificar' && tipoFormulario === 'unidad' && unidadMod) {
      supabase.from('unidad_atraccion').select('*').eq('id_unidad', unidadMod).single().then(({ data }) => {
        if (data) {
          setEstadoUnidad(data.estado);
          setCiclosActualesUnidad(data.contador_ciclos_actuales.toString());
          setCiclosProxUnidad(data.ciclos_proximo_mantenimiento.toString());
          setImagenActual(data.juego_foto);
        }
      });
    }
  }, [modoFormulario, tipoFormulario, unidadMod]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

  // Solo exigir imagen si estamos agregando
  if (modoFormulario === 'agregar' && !file) {
    return Swal.fire('Imagen requerida', 'Selecciona una foto.', 'warning');
  }

  Swal.fire({
    title: modoFormulario === 'agregar' ? 'Guardando...' : 'Actualizando...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  let publicUrl = imagenActual || ''; // empiezo con la actual (puede ser null)

  // Si cargaste una nueva, súbela
  if (file) {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('juegos-imgs')
      .upload(fileName, file);
    if (upErr) {
      Swal.close();
      return Swal.fire('Error al subir imagen', upErr.message, 'error');
    }
    const { data } = supabase.storage
      .from('juegos-imgs')
      .getPublicUrl(fileName);
    publicUrl = data.publicUrl;
  }

    // ATRACCIÓN
    if (tipoFormulario === 'atraccion') {
      const payload = {
        modelo, anio, nombre: nombreAtr, descripcion_atraccion: descripcion,
        capacidad: +capacidad, altura_minima: +alturaMinima,
        id_empleado_encargado: +idEmpleado,
        ciclos_por_ticket: +ciclosPorTicket,
        ciclos_proximo_mantenimiento: +ciclosProxManto,
        detalle_proximo_mantenimiento: detalleProxManto,
        estado_atraccion: estadoAtraccion,
        juego_foto: publicUrl
      };
      let res;
      if (modoFormulario === 'agregar') res = await supabase.from('atraccion').insert([payload]);
      else res = await supabase.from('atraccion').update(payload).eq('id_atraccion', atracMod);
      if (res.error) return Swal.fire('Error', res.error.message, 'error');
    }

    // UNIDAD
    if (tipoFormulario === 'unidad') {
      const payload = {
        id_atraccion: +idAtraccion,
        estado: estadoUnidad,
        contador_ciclos_actuales: +ciclosActualesUnidad,
        ciclos_proximo_mantenimiento: +ciclosProxUnidad,
        juego_foto: publicUrl
      };
      let res;
      if (modoFormulario === 'agregar') res = await supabase.from('unidad_atraccion').insert([payload]);
      else res = await supabase.from('unidad_atraccion').update(payload).eq('id_unidad', unidadMod);
      if (res.error) return Swal.fire('Error', res.error.message, 'error');
    }

    Swal.close();
    Swal.fire('¡Listo!', '', 'success').then(() =>window.location.reload());
  };

  const handleDelete = async () => {
    const confirm = await Swal.fire({ title: '¿Eliminar?', text: 'No se puede deshacer', icon: 'warning', showCancelButton: true });
    if (confirm.isConfirmed) {
      let res;
      if (tipoFormulario === 'atraccion') res = await supabase.from('atraccion').delete().eq('id_atraccion', atracMod);
      else res = await supabase.from('unidad_atraccion').delete().eq('id_unidad', unidadMod);
      if (res.error) return Swal.fire('Error', res.error.message, 'error');
      Swal.fire('Eliminado', '', 'success').then(() =>window.location.reload());
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="gestionar-atraccion-page">
        <form onSubmit={handleSubmit} className="form-gestionar">
          <h2 className="form-gestionar-title">{modoFormulario === 'agregar' ? 'Agregar' : 'Modificar'} {tipoFormulario === 'atraccion' ? 'Atracción' : 'Unidad de Atracción'}</h2>
          <label><h3>La acción a realizar es para:</h3>
            <select value={tipoFormulario} onChange={e => setTipoFormulario(e.target.value as any)}>
              <option value="atraccion">Atracción</option>
              <option value="unidad">Unidad de atracción</option>
            </select>
          </label>
          <label>Tipo de operación:
            <select value={modoFormulario} onChange={e => setModoFormulario(e.target.value as any)}>
              <option value="agregar">Agregar</option>
              <option value="modificar">Modificar</option>
            </select>
          </label>

          {tipoFormulario === 'atraccion' && modoFormulario === 'modificar' && (
            <label>Selecciona atracción:
              <select value={atracMod} onChange={e => setAtracMod(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {atracciones.map(a => <option key={a.id_atraccion} value={a.id_atraccion}>{a.nombre}</option>)}
              </select>
            </label>
          )}

          {tipoFormulario === 'unidad' && (
            <label>Selecciona atracción base:
              <select value={idAtraccion} onChange={e => setIdAtraccion(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {atracciones.map(a => <option key={a.id_atraccion} value={a.id_atraccion}>{a.nombre}</option>)}
              </select>
            </label>
          )}

          {tipoFormulario === 'unidad' && modoFormulario === 'modificar' && (
            <label>Selecciona unidad:
              <select value={unidadMod} onChange={e => setUnidadMod(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>Unidad #{u.id_unidad}</option>)}
              </select>
            </label>
          )}

          {tipoFormulario === 'atraccion' && (
            <>
              <label>Modelo<input value={modelo} onChange={e => setModelo(e.target.value)} /></label>
              <label>Año<input value={anio} onChange={e => setAnio(e.target.value)} /></label>
              <label>Nombre<input value={nombreAtr} onChange={e => setNombreAtr(e.target.value)} /></label>
              <label>Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} /></label>
              <label>Capacidad<input type="number" value={capacidad} onChange={e => setCapacidad(e.target.value)} /></label>
              <label>Altura mínima<input type="number" value={alturaMinima} onChange={e => setAlturaMinima(e.target.value)} /></label>
              <label>Empleado<select value={idEmpleado} onChange={e => setIdEmpleado(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {empleados.map(emp => <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombre} {emp.apellido}</option>)}
              </select></label>
              <label>Ciclos por ticket<input type="number" value={ciclosPorTicket} onChange={e => setCiclosPorTicket(e.target.value)} /></label>
              <label>Ciclos hasta mantenimiento<input type="number" value={ciclosProxManto} onChange={e => setCiclosProxManto(e.target.value)} /></label>
              <label>Detalle próximo mantenimiento<textarea value={detalleProxManto} onChange={e => setDetalleProxManto(e.target.value)} /></label>
              <label>Estado<select value={estadoAtraccion} onChange={e => setEstadoAtraccion(e.target.value as any)}>
                <option value="Funcional">Funcional</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Deshabilitada">Deshabilitada</option>
              </select></label>
            </>
          )}

          {tipoFormulario === 'unidad' && (
            <>
              <label>Estado<select value={estadoUnidad} onChange={e => setEstadoUnidad(e.target.value as any)}>
                <option value="Funcional">Funcional</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Deshabilitada">Deshabilitada</option>
              </select></label>
              <label>Ciclos actuales<input type="number" value={ciclosActualesUnidad} onChange={e => setCiclosActualesUnidad(e.target.value)} /></label>
              <label>Ciclos hasta mantenimiento<input type="number" value={ciclosProxUnidad} onChange={e => setCiclosProxUnidad(e.target.value)} /></label>
            </>
          )}

          <label>Nueva foto de la atracción<input type="file" accept="image/*" onChange={handleFileChange} /></label>
          {modoFormulario === 'modificar' && imagenActual && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p>Vista previa de la imagen de la atracción:</p>
              <img src={imagenActual} alt="Actual" />
            </div>
          )}

          <button type="submit">{modoFormulario === 'agregar' ? 'Guardar' : 'Actualizar'}</button>
          {modoFormulario === 'modificar' && (
            <button type="button" className="eliminar" onClick={() => handleDelete()}>Eliminar</button>
          )}
        </form>
      </div>
    </LayoutWithSidebar>
  );
}