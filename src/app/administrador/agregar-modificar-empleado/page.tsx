"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "./actions";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import Swal from "sweetalert2";
import './agregar_empleado.css';
import { useRouter } from "next/navigation";

export default function EmpleadoPage() {
  const [modoFormulario, setModoFormulario] = useState<"agregar" | "modificar">("agregar");
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaContratacion, setFechaContratacion] = useState("");
  const [salario, setSalario] = useState("");
  const [idPuesto, setIdPuesto] = useState("");
  const [idSexo, setIdSexo] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estadoActividad, setEstadoActividad] = useState("");
  const [estadoEmpleado, setEstadoEmpleado] = useState("Presente");
  const [estadoCuenta, setEstadoCuenta] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [fotoActual, setFotoActual] = useState<string | null>(null);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [sexos, setSexos] = useState<any[]>([]);

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
    if (modoFormulario === "modificar") {
      supabase.from("empleado").select("id_empleado, nombre").then(({ data }) => {
        if (data) setEmpleados(data);
      });
    }
    supabase.from("puesto").select("id_puesto, nombre").then(({ data }) => setPuestos(data || []));
    supabase.from("sexo").select("id_sexo, nombre").then(({ data }) => setSexos(data || []));
  }, [modoFormulario]);

  useEffect(() => {
    if (empleadoSeleccionado) {
      supabase.from("empleado").select("*").eq("id_empleado", empleadoSeleccionado).single().then(({ data }) => {
        if (data) {
          setNombre(data.nombre);
          setApellido(data.apellido);
          setFechaContratacion(data.fecha_contratacion);
          setSalario(data.salario);
          setIdPuesto(data.id_puesto);
          setIdSexo(data.id_sexo);
          setEmail(data.email);
          setContrasena(data.contrasena);
          setTelefono(data.telefono);
          setEstadoActividad(data.estado_actividad_empleado);
          setEstadoEmpleado(data.estado_empleado);
          setEstadoCuenta(String(data.estado_cuenta));
          setFotoActual(data.empleado_foto || null);
        }
      });
    }
  }, [empleadoSeleccionado]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    Swal.fire({
      title: modoFormulario === "agregar" ? "Creando empleado..." : "Actualizando...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    let publicUrl = "";
    if (file) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("empleados-imgs").upload(fileName, file);
      if (uploadError) return Swal.fire({ icon: "error", title: "Error al subir imagen" });
      const { data } = supabase.storage.from("empleados-imgs").getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    }

    const datos: Record<string, any> = {
      nombre,
      apellido,
      fecha_contratacion: fechaContratacion,
      salario,
      id_puesto: idPuesto,
      id_sexo: idSexo,
      email,
      contrasena,
      telefono,
      estado_actividad_empleado: estadoActividad,
      estado_empleado: estadoEmpleado,
      estado_cuenta: parseInt(estadoCuenta)
    };

    if (publicUrl) datos.empleado_foto = publicUrl;

    if (modoFormulario === "agregar") {
      const { error } = await supabase.from("empleado").insert([datos]);
      if (error) return Swal.fire({ icon: "error", title: "Error", text: error.message });
    } else {
      const { error } = await supabase.from("empleado").update(datos).eq("id_empleado", empleadoSeleccionado);
      if (error) return Swal.fire({ icon: "error", title: "Error", text: error.message });
    }

    Swal.close();
    await Swal.fire({ icon: "success", title: "¡Listo!", text: "Empleado guardado." });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!empleadoSeleccionado) return;
    const confirm = await Swal.fire({ title: "¿Eliminar empleado?", icon: "warning", showCancelButton: true });
    if (confirm.isConfirmed) {
      const { error } = await supabase.from("empleado").delete().eq("id_empleado", empleadoSeleccionado);
      if (error) return Swal.fire({ icon: "error", title: "Error", text: error.message });
      Swal.fire({ icon: "success", title: "Empleado eliminado" });
      router.refresh();
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="ingreso-modificacion-empleado-page">
        <div className="ingreso-modificacion-empleado-form">
          <h2 className="ingreso-modificacion-empleado-form-title">
            {modoFormulario === "agregar" ? "Agregar Empleado" : "Modificar Empleado"}
          </h2>

          <label>
            <h3>Acción a realizar</h3>
            <select value={modoFormulario} onChange={e => setModoFormulario(e.target.value as any)}>
              <option value="agregar">Agregar</option>
              <option value="modificar">Modificar</option>
            </select>
          </label>

          {modoFormulario === "modificar" && (
            <label>
              Seleccionar empleado:
              <select value={empleadoSeleccionado} onChange={e => setEmpleadoSeleccionado(e.target.value)}>
                <option value="">-- Selecciona un empleado --</option>
                {empleados.map(e => (
                  <option key={e.id_empleado} value={e.id_empleado}>{e.nombre}</option>
                ))}
              </select>
            </label>
          )}

          <form onSubmit={handleSubmit}>
            <label>Nombre<input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required /></label>
            <label>Apellido<input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required /></label>
            <label>Fecha de Contratación<input type="date" value={fechaContratacion} onChange={e => setFechaContratacion(e.target.value)} required /></label>
            <label>Salario<input type="number" value={salario} onChange={e => setSalario(e.target.value)} required /></label>
            <label>Puesto<select value={idPuesto} onChange={e => setIdPuesto(e.target.value)} required>
              <option value="">-- Selecciona un puesto --</option>
              {puestos.map(p => <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>)}
            </select></label>
            <label>Sexo<select value={idSexo} onChange={e => setIdSexo(e.target.value)} required>
              <option value="">-- Selecciona sexo --</option>
              {sexos.map(s => <option key={s.id_sexo} value={s.id_sexo}>{s.nombre}</option>)}
            </select></label>
            <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Contraseña<input type="text" value={contrasena} onChange={e => setContrasena(e.target.value)} required /></label>
            <label>Teléfono<input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} required /></label>
            <label>Estado de Actividad<input type="text" value={estadoActividad} onChange={e => setEstadoActividad(e.target.value)} required /></label>
            <label>Estado del Empleado<select value={estadoEmpleado} onChange={e => setEstadoEmpleado(e.target.value)} required>
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
            </select></label>
            <label>Estado de la Cuenta<select value={estadoCuenta} onChange={e => setEstadoCuenta(e.target.value)} required>
              <option value="1">Habilitada</option>
              <option value="0">Deshabilitada</option>
            </select></label>
            <label>Nueva Foto del Empleado<input type="file" accept="image/*" onChange={handleFileChange} /></label>

            {modoFormulario === "modificar" && fotoActual && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p>Foto actual:</p>
                <img src={fotoActual} alt="Foto del empleado" style={{ maxWidth: '100%', borderRadius: '8px' }} />
              </div>
            )}

            <button type="submit">{modoFormulario === "agregar" ? "Agregar" : "Guardar Cambios"}</button>

            {modoFormulario === "modificar" && empleadoSeleccionado && (
              <button
                className="eliminar"
                type="button"
                onClick={handleDelete}
                style={{ backgroundColor: '#c62828', marginTop: '0.5rem' }}
              >
                Eliminar Empleado
              </button>
            )}
          </form>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
