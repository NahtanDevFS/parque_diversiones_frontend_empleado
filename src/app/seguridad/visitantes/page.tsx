"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/login/actions";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { Html5Qrcode } from "html5-qrcode";
import Swal from "sweetalert2";
import "./visitantes.css";
import { useRouter } from "next/navigation";

interface QRTicket {
  id_ticket: number;
  usos: number;
  tipo_ticket: string;
  correo_electronico: string;
}

export default function VisitantesPage() {
  const [traeVehiculo, setTraeVehiculo] = useState(false);
  const [placaVehiculo, setPlacaVehiculo] = useState("");
  const [monto, setMonto] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [ticketValidado, setTicketValidado] = useState(false);
  const [qrTickets, setQrTickets] = useState<QRTicket[]>([]);
  const [personas, setPersonas] = useState(0);
  const [camarasDisponibles, setCamarasDisponibles] = useState<any[]>([]);
  const [indiceCamara, setIndiceCamara] = useState(0);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');




  const router = useRouter();

  useEffect(() => {
    const storedSession = localStorage.getItem('employeeSession');
    if (!storedSession) {
      router.push('/');
      return;
    }
    try {
      const session = JSON.parse(storedSession);
const { id_puesto, id_empleado } = session;

// Inserta justo aquí
if (id_puesto !== 6) {
  (async () => {
    const { data, error } = await supabase
      .from('empleado')
      .update({ estado_actividad_empleado: 'En el módulo de acceso de visitantes' })
      .eq('id_empleado', id_empleado);
    if (error) console.error('Error al actualizar estado automático:', error);
    else console.log('Estado automático actualizado:', data);
  })();
}
      if (session.id_puesto !== 6 && session.id_puesto !== 2) {
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

  const enviarCorreo = async (email: string, numero: number) => {
    try {
      const res = await fetch("/api/enviar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo_electronico: email, numero }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.message);
      console.log("Correo enviado con éxito:", result);
    } catch (err) {
      console.error("Error al enviar el correo:", err);
    }
  };

  const cancelarRegistro = async () => {
    const confirmacion = await Swal.fire({
      title: "¿Cancelar registro?",
      text: "Se borrarán todos los datos ingresados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No",
    });

    if (confirmacion.isConfirmed) {
      const readerElement = document.getElementById("reader");
      if (readerElement) readerElement.innerHTML = "";

      setQrTickets([]);
      setPersonas(0);
      setMensaje("");
      setTicketValidado(false);
      setTraeVehiculo(false);
      setPlacaVehiculo("");
      setMonto(null);

      await Swal.fire("✔️ Cancelado", "El registro fue cancelado correctamente.", "success");
    }
  };

  const iniciarEscaneo = async () => {
    const html5QrCode = new Html5Qrcode("reader");
  
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        Swal.fire("Error", "No se detectó ninguna cámara", "error");
        return;
      }
  
      setCamarasDisponibles(devices);
  
      const camaraTrasera = devices.find((d) =>
        /back|rear|environment/i.test(d.label)
      );
  
      const configCamara = camaraTrasera
        ? camaraTrasera.id
        : { facingMode: "environment" }; // más flexible que `exact: environment`
  
      setIndiceCamara(camaraTrasera ? devices.indexOf(camaraTrasera) : 0);
      setScanner(html5QrCode);
  
      await html5QrCode.start(
        configCamara,
        { fps: 10, qrbox: { width: 300, height: 300 } },
        async (qrCode) => {
          await html5QrCode.stop();
          setScanner(null);
          await validarQR(qrCode);
        },
        (error) => {}
      );
    } catch (err) {
      console.error("Error iniciando cámara:", err);
      Swal.fire("⚠️ Cámara no compatible", "Se intentará iniciar sin restricciones", "info");
  
      try {
        // Intento sin restricciones (modo seguro)
        await html5QrCode.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 300, height: 300 } },
          async (qrCode) => {
            await html5QrCode.stop();
            setScanner(null);
            await validarQR(qrCode);
          },
          (error) => {}
        );
      } catch (finalErr) {
        console.error("Error final al iniciar cámara:", finalErr);
        Swal.fire("❌ Error", "No se pudo acceder a ninguna cámara", "error");
      }
    }
  };
  
  

  const validarQR = async (qr: string): Promise<boolean> => {
    try {
      const { data: ticket, error } = await supabase
        .from("ticket")
        .select("id_ticket, estado, usos, tipo_ticket, correo_electronico")
        .eq("qr", qr)
        .maybeSingle();

      if (error || !ticket) {
        Swal.fire("❌ Ticket inválido", "No se encontró o es incorrecto", "error");
        return false;
      }

      if (!["entrada", "completo"].includes(ticket.tipo_ticket)) {
        Swal.fire("🚫 No permitido", "Este ticket no es válido para visitantes", "warning");
        return false;
      }

      if (ticket.estado !== "disponible") {
        Swal.fire("❌ Ticket no disponible", "Este ticket ya fue usado o está bloqueado", "error");
        return false;
      }

      const yaEscaneado = qrTickets.some((t) => t.id_ticket === ticket.id_ticket);
      if (yaEscaneado) {
        Swal.fire("ℹ️ Ya escaneado", "Este ticket ya fue escaneado", "info");
        return false;
      }

      setQrTickets((prev) => [...prev, ticket]);
      setPersonas((prev) => Math.min(prev + 1, 10));
      setTicketValidado(true);

      Swal.fire("✅ Ticket válido", "Ticket validado correctamente", "success");
      return true;
    } catch (err) {
      console.error("Error inesperado en validarQR:", err);
      Swal.fire("⚠️ Error inesperado", "Intente nuevamente", "error");
      return false;
    }
  };

  const registrarVisita = async () => {
    setMensaje("");
  
    if (!ticketValidado || qrTickets.length === 0) {
      setMensaje("❌ Debe validar al menos un ticket antes de registrar la visita");
      return;
    }
  
    const tieneCompleto = qrTickets.some((t) => t.tipo_ticket === "completo");
    const usosDisponibles = qrTickets.reduce((acc, t) => acc + t.usos, 0);
  
    if (!tieneCompleto && usosDisponibles < personas) {
      setMensaje("❌ Los tickets escaneados no cubren a todas las personas");
      return;
    }
  
    const fechaHora = new Date().toISOString();
    let registroExitoso = true;
  
    // Insertar un registro por cada persona
    const registros = Array.from({ length: personas }, () => ({
      fecha_hora_visita: fechaHora,
      numero_de_cliente: null,
    }));
  
    const { error: errorVisita, data: nuevosRegistros } = await supabase
      .from("control_acceso_visitante")
      .insert(registros)
      .select("id_acceso");
  
    if (errorVisita) {
      setMensaje("❌ Error al registrar la visita");
      registroExitoso = false;
    }
  
    // Actualizar tickets
    let usosPorDescontar = personas;
  
    for (const ticket of qrTickets) {
      if (usosPorDescontar <= 0) break;
  
      if (ticket.tipo_ticket === "completo") {
        // Establecer fecha de vencimiento para hoy a las 23:59:59
        const hoy = new Date();
        const vencimiento = new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate(),
          23, 59, 59
        ).toISOString();
  
        const { error: errorCompleto } = await supabase
          .from("ticket")
          .update({ fecha_vencimiento: vencimiento })
          .eq("id_ticket", ticket.id_ticket);
  
        if (errorCompleto) {
          console.error("❌ Error al establecer vencimiento:", errorCompleto);
        }
      } else {
        const usosConsumidos = Math.min(usosPorDescontar, ticket.usos);
        const nuevosUsos = ticket.usos - usosConsumidos;
        const nuevoEstado = nuevosUsos === 0 ? "usado" : "disponible";
        const hoyStr = new Date().toISOString().split("T")[0];
  
        const { error: errorUso } = await supabase
          .from("ticket")
          .update({
            usos: nuevosUsos,
            estado: nuevoEstado,
            fecha_vencimiento: nuevoEstado === "usado" ? hoyStr : null,
          })
          .eq("id_ticket", ticket.id_ticket);
  
        if (errorUso) {
          console.error("Error al descontar usos:", errorUso);
          registroExitoso = false;
        }
  
        usosPorDescontar -= usosConsumidos;
      }
    }
  
    // Registrar vehículo
    if (traeVehiculo && placaVehiculo.trim() !== "") {
      const { data: espaciosLibres, error: errorEsp } = await supabase
        .from("estacionamiento")
        .select("*")
        .eq("capacidad_ocupada", 0)
        .order("id_estacionamiento", { ascending: true })
        .limit(1);
  
      if (errorEsp || !espaciosLibres?.length) {
        Swal.fire("❌ Error", "No hay espacio de parqueo disponible para el vehículo", "error");
        return;
      }
  
      const espacio = espaciosLibres[0];
      const fecha = new Date().toISOString().split("T")[0];
      const hora = new Date().toTimeString().split(" ")[0];
  
      const { error: errorVehiculo } = await supabase.from("vehiculo").insert({
        placa_vehiculo: placaVehiculo.toUpperCase(),
        fecha_ingreso_vehiculo: fecha,
        hora_entrada_vehiculo: hora,
        hora_salida_vehiculo: null,
        id_estacionamiento: espacio.id_estacionamiento,
      });
  
      if (errorVehiculo) {
        console.error("❌ Error al registrar el vehículo:", errorVehiculo);
        setMensaje("⚠️ Visita registrada, pero hubo un error con el vehículo");
        return;
      }
  
      await supabase
        .from("estacionamiento")
        .update({ capacidad_ocupada: 1 })
        .eq("id_estacionamiento", espacio.id_estacionamiento);
    }
  
    // Actualizar número de cliente en todos los registros
    if (registroExitoso) {
      const { count } = await supabase
        .from("control_acceso_visitante")
        .select("*", { count: "exact", head: true });
  
      const numeroVisitante = count || 0;
  
      const ids = nuevosRegistros?.map((r) => r.id_acceso) || [];
  
      await supabase
        .from("control_acceso_visitante")
        .update({ numero_de_cliente: numeroVisitante })
        .in("id_acceso", ids);
  
      const primerTicket = qrTickets[0];
      const correo_electronico = primerTicket?.correo_electronico || null;
  
      let mensajeCorreo = "";
  
      if (correo_electronico) {
        await enviarCorreo(correo_electronico, numeroVisitante);
        mensajeCorreo = `✅ Número enviado a: ${correo_electronico}`;
      } else {
        mensajeCorreo = "⚠️ Sin correo disponible para enviar número.";
      }
  
      await Swal.fire("✅ Registro exitoso", mensajeCorreo, "success");
    }
  
    // Reset
    const readerElement = document.getElementById("reader");
    if (readerElement) readerElement.innerHTML = "";
  
    setTicketValidado(false);
    setQrTickets([]);
    setPlacaVehiculo("");
    setTraeVehiculo(false);
    setPersonas(0);
    setMonto(null);
  };


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

<div className="estado-barra-visitantes">
  <label>
    Opciones para notificar cese de actividades:
    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
      <option value="En el almuerzo">En el almuerzo</option>
      <option value="Turno cerrado">Turno cerrado</option>
    </select>
  </label>
  <button onClick={handleStatusUpdate}>Actualizar estado</button>
</div>

   

      <div className="visitante-page">
        <h2>Registro de Visitante</h2>


       <div className="flex flex-col items-center gap-2 my-4">
  <h3 className="text-xl font-bold text-center text-gray-800">Iniciar Registro</h3>

  <button className="boton-escanear" onClick={iniciarEscaneo}>
    Escanear QR
  </button>

        


  {/*     {camarasDisponibles.length > 1 && (
  <button
    className="boton-cambiar-camara"
    onClick={async () => {
      if (scanner) {
        await scanner.stop();
      }

      const nuevoIndice = (indiceCamara + 1) % camarasDisponibles.length;
      const nuevaCamara = camarasDisponibles[nuevoIndice];
      setIndiceCamara(nuevoIndice);

      const nuevoScanner = new Html5Qrcode("reader");
      setScanner(nuevoScanner);

      await nuevoScanner.start(
        nuevaCamara.id,
        { fps: 10, qrbox: { width: 300, height: 300 } },
        async (qrCode) => {
          await nuevoScanner.stop();
          setScanner(null);
          await validarQR(qrCode);
        },
        (error) => {}
      );
    }}
  >
    Cambiar Cámara
  </button>
)}
  */} 


          <div className="text-gray-800 font-semibold text-lg">
            Cantidad: {personas} {personas === 1 ? "persona" : "personas"}
          </div>
        </div>

        {qrTickets.length > 0 && (
          <div className="qr-tickets-list">
            <h4>Tickets escaneados:</h4>
            <ul>
              {qrTickets.map((ticket, index) => (
                <li key={index}>
                  🎫 <strong>Tipo:</strong> {ticket.tipo_ticket} | <strong>Usos:</strong> {ticket.usos}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label>
          <input
            type="checkbox"
            checked={traeVehiculo}
            onChange={(e) => setTraeVehiculo(e.target.checked)}
          />
          Trae Vehículo
        </label>

        {traeVehiculo && (
          <input
            type="text"
            placeholder="PLACA DEL VEHÍCULO"
            value={placaVehiculo}
            onChange={(e) => setPlacaVehiculo(e.target.value)}
          />
        )}

        <div className="verificacion">
          <label>
            <input type="checkbox" checked={ticketValidado} disabled /> Ticket Validado
          </label>
        </div>

        <button className="boton-registrar" onClick={registrarVisita}>
          Registrar Visita
        </button>

        <button className="boton-cancelar" onClick={cancelarRegistro}>
          Cancelar Registro
        </button>

        {mensaje && <p className="mensaje">{mensaje}</p>}

        <div id="reader" style={{ width: "300px", margin: "2rem auto" }}></div>
      </div>
    </LayoutWithSidebar>
  );
}