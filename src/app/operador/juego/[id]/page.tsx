'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import { supabase } from '@/app/login/actions';
import './juego.css';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

interface Atraccion {
  id_atraccion: number;
  nombre: string;
  capacidad: number;
  contador_ciclos_actuales: number;
  asientos_ocupados?: number;
  estado_atraccion:string;
  tiempo_reparacion: string;
}

interface Asiento {
  id_unidad: number; 
  fila: string;
  numero: number;
  estado: 'libre' | 'ocupado';
   ciclosActuales: number;      // ← nuevo
}

export default function JuegoDetalle() {
  const { id } = useParams();
  const [atraccion, setAtraccion] = useState<Atraccion | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [cicloEnCurso, setCicloEnCurso] = useState(false);
  const [ultimoQR, setUltimoQR] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [seleccionarAsiento, setSeleccionarAsiento] = useState(false);
  const router = useRouter();

  // Estado para el selector de actividad manual
    const [selectedStatus, setSelectedStatus] = useState<string>('En el almuerzo');
  
  
   // Validación del token para proteger la ruta
          useEffect(() => {
  // 1) Validación de sesión y permisos
  const stored = localStorage.getItem('employeeSession');
  if (!stored) {
    router.push('/');
    return;
  }

  let session: { id_empleado: number; id_puesto: number };
  try {
    session = JSON.parse(stored);
  } catch {
    router.push('/');
    return;
  }
  const { id_empleado, id_puesto } = session;

  // Solo admin (6) u operador (1) pueden entrar
  if (id_puesto !== 6 && id_puesto !== 1) {
    Swal.fire({
      title: 'Acceso denegado',
      text: 'No tienes permiso para acceder a este módulo',
      icon: 'error',
      confirmButtonText: 'Ok'
    }).then(() => router.push('/'));
    return;
  }

  // 2) Si aún no cargó la atracción, esperamos
  if (!atraccion) return;

  // 3) Disparamos el update del estado del empleado
  const nuevoEstado = `En la atracción ${atraccion.nombre}`;
  supabase
    .from('empleado')
    .update({ estado_actividad_empleado: nuevoEstado })
    .eq('id_empleado', id_empleado)
    .then(({ data, error }) => {
      if (error) {
        console.error('Error al actualizar estado automático:', error);
      } else {
        console.log('Estado automático actualizado:', data);
      }
    });
}, [router, atraccion]);
  
  useEffect(() => {
    async function fetchAtraccion() {
      const { data, error } = await supabase
        .from('atraccion')
        .select('*')
        .eq('id_atraccion', id)
        .single();

      if (!error && data) {
        setAtraccion(data);

         // → Lógica especial para Tuc Tuc Chocones (id = 3)
     if (data.id_atraccion === 3) {
  const { data: unidades } = await supabase
    .from('unidad_atraccion')
    .select('id_unidad, estado, contador_ciclos_actuales')
    .eq('id_atraccion', id);

  if (unidades) {
    const letras = 'ABCDE'; // sólo A–E
    const gen: Asiento[] = [];

    unidades.forEach((u, idx) => {
      const fila = letras[idx];      
      for (let num = 1; num <=  data.capacidad; num++) {
        gen.push({
          id_unidad:          u.id_unidad,
          fila,
          numero:             num,
          estado:             u.estado !== 'Funcional' ? 'ocupado' : 'libre',
          ciclosActuales:     u.contador_ciclos_actuales
        });
      }
    });

    setAsientos(gen);
    return;
  }
}

        const total = data.capacidad;
        const columnas = 4;
        const filasCount = Math.ceil(total / columnas);
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const generados: Asiento[] = [];

        let contador = 1;
for (let f = 0; f < filasCount; f++) {
  const letra = letras[f];
  for (let c = 0; c < columnas; c++) {
    if (contador > total) break;
    generados.push({
      id_unidad:      0,         // placeholder para las atracciones genéricas
      fila:            letra,
      numero:         contador,
      estado:         'libre',
      ciclosActuales: 0          // placeholder inicial
    });
    contador++;
  }
}

setAsientos(generados);
      }
    }

    fetchAtraccion();
  }, [id]);

  useEffect(() => {
    if (tiempoRestante === 0 && cicloEnCurso) {
      finalizarCiclo();
    }

    if (tiempoRestante > 0) {
      const intervalo = setInterval(() => {
        setTiempoRestante(prev => prev - 1);
      }, 1000);
      return () => clearInterval(intervalo);
    }
  }, [tiempoRestante, cicloEnCurso]);

//NUEVO CÓDIGO

  const [tiempoRestanteReparacion, setTiempoRestanteReparacion] = useState<string | null>(null);

  useEffect(() => {
    if (atraccion?.estado_atraccion === 'Mantenimiento' && atraccion.tiempo_reparacion) {
      const objetivo = new Date(atraccion.tiempo_reparacion).getTime();
  
      const intervalo = setInterval(() => {
        const ahora = new Date().getTime();
        const diferencia = objetivo - ahora;
  
        if (diferencia <= 0) {
          clearInterval(intervalo);
          setTiempoRestanteReparacion("Disponible pronto");
          return;
        }
  
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
  
        const tiempoFormateado = `${dias > 0 ? `${dias}d ` : ''}${horas
          .toString()
          .padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  
        setTiempoRestanteReparacion(tiempoFormateado);
      }, 1000);
  
      return () => clearInterval(intervalo);
    }
  }, [atraccion]);



  const iniciarCiclo = () => {
  if (atraccion?.estado_atraccion !== "Funcional") {
    Swal.fire(
      'Máquina no operativa',
      `La máquina no puede operar, porque se encuentra en: ${atraccion?.estado_atraccion}`,
      'error'
    );
    return;
  }

  const hayOcupados = asientos.some(a => a.estado === 'ocupado');

  if (!hayOcupados) {
    Swal.fire(
      'No se puede iniciar',
      'Debes escanear al menos un ticket antes de iniciar el recorrido.',
      'warning'
    );
    return;
  }

  if (!cicloEnCurso) {
    Swal.fire({
      title: '¿Desea iniciar el recorrido?',
      text: 'Esto dará inicio al ciclo actual de la atracción.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setCicloEnCurso(true);
        setTiempoRestante(6); // duración del ciclo en segundos (ajusta según necesidad)

        // ✅ Insertar en uso_atraccion
        const ahora = new Date();
        const fecha = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
        const hora = ahora.toTimeString().split(' ')[0]; // HH:MM:SS

        await supabase.from('uso_atraccion').insert([
          {
            id_atraccion: atraccion.id_atraccion,
            fecha_ciclo_atraccion: fecha,
            hora_ciclo_atraccion: hora
          }
        ]);

        // ✅ Actualizar historial mostrado
        obtenerHistorialUso();

        Swal.fire('✅ Ciclo iniciado', 'El recorrido ha comenzado.', 'success');
      }
    });
  }
};


const [historialUso, setHistorialUso] = useState<any[]>([]);

const obtenerHistorialUso = async () => {
  if (!atraccion) return;
  const { data, error } = await supabase
    .from('uso_atraccion')
    .select('*')
    .eq('id_atraccion', atraccion.id_atraccion)
    .order('id_uso_atraccion', { ascending: false });

  if (!error && data) {
    setHistorialUso(data);
  }
};

useEffect(() => {
  if (atraccion) {
    obtenerHistorialUso();
  }
}, [atraccion]);


  const ocuparAsientos = () => {
    const nuevos = [...asientos];
    let ocupados = 0;
  
    for (let i = 0; i < nuevos.length && ocupados < Math.ceil(nuevos.length / 2); i++) {
      if (nuevos[i].estado === 'libre') {
        nuevos[i].estado = 'ocupado';
        ocupados++;
      }
    }
  
    setAsientos(nuevos);
  };

  const finalizarCiclo = async () => {
    setCicloEnCurso(false);
    setAsientos(asientos.map(a => ({ ...a, estado: 'libre' })));
  
    if (atraccion) {
      await supabase
        .from('atraccion')
        .update({
          contador_ciclos_actuales: atraccion.contador_ciclos_actuales + 1,
          asientos_ocupados: 0
        })
        .eq('id_atraccion', atraccion.id_atraccion);
  
      setAtraccion(prev => prev && {
        ...prev,
        contador_ciclos_actuales: prev.contador_ciclos_actuales + 1,
        asientos_ocupados: 0,
      });
    }
  
    Swal.fire({
      title: ' Ciclo finalizado',
      text: 'Los asientos han sido liberados. El sistema está listo para el siguiente recorrido.',
      icon: 'info',
      confirmButtonText: 'Aceptar'
    }).then(() => {
      window.location.reload();
    });
  };

  const handleScanQR = async (qrCode: string) => {
  console.log("QR escaneado:", qrCode);

  if (bloqueado || qrCode === ultimoQR) return;

  setUltimoQR(qrCode);
  setBloqueado(true);
  setTimeout(() => setBloqueado(false), 2000);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(qrCode)) {
    Swal.fire('⚠️ Formato inválido', 'El QR no contiene un UUID válido.', 'warning');
    return;
  }

  const { data: ticket, error } = await supabase
    .from('ticket')
    .select('id_ticket, estado, usos, tipo_ticket, fecha_vencimiento')
    .eq('qr', qrCode)
    .maybeSingle();

  console.log("Resultado de Supabase:", { ticket, error });

   if (atraccion?.id_atraccion === 3) {
    setSeleccionarAsiento(true);
    return Swal.fire({
      icon: 'success',
      title: '✅ Ticket válido',
      html: 'Ticket válido. Por favor selecciona tu asiento haciendo clic en él.',
      confirmButtonText: 'OK'
    });
  }

  if (error) {
    Swal.fire('❌ Error en Supabase', `Error: ${error.message}`, 'error');
    return;
  }

  if (!ticket) {
    Swal.fire('❌ QR no válido', 'Este código no pertenece a ningún ticket.', 'error');
    return;
  }

  console.log("Tipo de ticket recibido:", ticket.tipo_ticket);

  if (ticket.tipo_ticket !== 'juegos' && ticket.tipo_ticket !== 'completo') {
    Swal.fire('🚫 Acceso denegado', 'Este ticket no permite acceso a juegos.', 'warning');
    return;
  }

  // ✅ Verificar y actualizar fecha de vencimiento si es NULL
  let mensajeExtra = "";
  if (!ticket.fecha_vencimiento) {
    const hoy = new Date();
    const mañana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const fechaFormateada = mañana.toISOString().split('T')[0];

    const { error: errorFecha } = await supabase
      .from('ticket')
      .update({ fecha_vencimiento: fechaFormateada })
      .eq('id_ticket', ticket.id_ticket);

    if (!errorFecha) {
      mensajeExtra = `<br>📅 Fecha de vencimiento asignada: <strong>${fechaFormateada}</strong>`;
    }
  }

  if (ticket.estado !== 'disponible') {
    Swal.fire('❌ Ticket inválido', 'Este ticket no está disponible.', 'error');
    return;
  }

  if (ticket.tipo_ticket !== 'completo' && ticket.usos <= 0) {
    Swal.fire('🔁 Usos agotados', 'Este ticket ya no tiene usos disponibles.', 'info');
    return;
  }

  if (atraccion && atraccion.asientos_ocupados! >= atraccion.capacidad) {
    Swal.fire('🪑 Atracción llena', 'Debe esperar al siguiente ciclo.', 'info');
    return;
  }

  if (ticket.tipo_ticket !== 'completo') {
    await supabase.from('ticket')
      .update({
        usos: ticket.usos - 1,
        estado: ticket.usos - 1 === 0 ? 'agotado' : 'disponible'
      })
      .eq('id_ticket', ticket.id_ticket);
  }

  if (atraccion) {
    await supabase.from('atraccion')
      .update({ asientos_ocupados: atraccion.asientos_ocupados! + 1 })
      .eq('id_atraccion', atraccion.id_atraccion);

    setAtraccion(prev => prev && {
      ...prev,
      asientos_ocupados: prev.asientos_ocupados! + 1
    });

    const nuevos = [...asientos];
    const libre = nuevos.find(a => a.estado === 'libre');
    if (libre) {
      libre.estado = 'ocupado';
      setAsientos([...nuevos]);
    }
  }

  Swal.fire({
    icon: 'success',
    title: '✅ Acceso concedido',
    html: `Ticket válido. Puede ingresar.${mensajeExtra}`,
    confirmButtonText: 'OK'
  });
};


const handleSeleccionarAsiento = async (fila: string, numero: number) => {
  if (!seleccionarAsiento || !atraccion) return;

  // 1) Actualizas front
  const nuevosAsientos = asientos.map(a =>
    a.fila === fila && a.numero === numero && a.estado === 'libre'
      ? { ...a, estado: 'ocupado' }
      : a
  );
  setAsientos(nuevosAsientos as Asiento[]);

  // 2) Actualizas la tabla atraccion (igual que antes)…
  await supabase
    .from('atraccion')
    .update({ asientos_ocupados: (atraccion.asientos_ocupados||0) + 1 })
    .eq('id_atraccion', atraccion.id_atraccion);

  setAtraccion(prev => prev && ({
    ...prev,
    asientos_ocupados: (prev.asientos_ocupados||0) + 1
  }));

  // 3) **NUEVO**: Actualizas la unidad concreta
  const asientoSelec = nuevosAsientos.find(a => a.fila === fila && a.numero === numero)!;
  await supabase
    .from('unidad_atraccion')
    .update({ 
      contador_ciclos_actuales: asientoSelec.ciclosActuales + 1 
    })
    .eq('id_unidad', asientoSelec.id_unidad);

  // Si quieres, también actualizas tu estado local:
  setAsientos(curr =>
    curr.map(a =>
      a.id_unidad === asientoSelec.id_unidad
        ? { ...a, ciclosActuales: asientoSelec.ciclosActuales + 1 }
        : a
    )
  );

  // 4) Sales del modo selección
  setSeleccionarAsiento(false);
};

//NUEVO CÓDIGO MODIFICADO

const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
const [scannerActivo, setScannerActivo] = useState(false);
//let html5QrCode: Html5Qrcode | null = null;

const iniciarEscaneo = async () => {
  const html5QrCode = new Html5Qrcode("reader");

  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices.length === 0) {
      Swal.fire('❌ Sin cámara', 'No se detectó ninguna cámara disponible.', 'error');
      return;
    }

    // 🔁 Buscar cámara trasera automáticamente
    const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];

    setScanner(html5QrCode); // ✅ Guardar escáner para poder detenerlo

    await html5QrCode.start(
      { deviceId: { exact: backCamera.id } },
      { fps: 10, qrbox: 250 },
      async (qrCode) => {
        try {
          await html5QrCode.stop();
          setScanner(null); // 👈 Limpiar escáner
          await handleScanQR(qrCode);
        } catch (err) {
          console.error('Error en handleScanQR:', err);
        }
      },
      (error) => {
        console.warn("Error al escanear QR:", error);
      }
    );
  } catch (err) {
    console.error("Error al obtener cámaras:", err);
    Swal.fire('❌ Error', 'No se pudieron cargar las cámaras.', 'error');
  }
};

const cerrarCamara = async () => {
  if (scanner) {
    await scanner.stop();
    setScanner(null);
    Swal.fire('Cámara cerrada', 'El escáner se ha detenido correctamente.', 'info');
  }
};

  const filasUnicas = Array.from(new Set(asientos.map(a => a.fila)));

// Dentro de tu componente, antes del return:
const filasDisponiblesCount = filasUnicas.filter(fila =>
  asientos.some(a => a.fila === fila && a.estado === 'libre')
).length;

// Si es Tuc Tuc (id=3) comprobamos que haya al menos 2 filas libres.
// Para cualquier otra atracción siempre dejamos los botones habilitados.
const botonesHabilitados = atraccion?.id_atraccion === 3
  ? filasDisponiblesCount >= 2
  : true;

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
    <div className="estado-barra">
  <label>
    Opciones para notificar cese de actividades:
    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
      <option value="En el almuerzo">En el almuerzo</option>
      <option value="Turno cerrado">Turno cerrado</option>
    </select>
  </label>
  <button onClick={handleStatusUpdate}>Actualizar estado</button>
</div>

    <div className="juego-contenedor">
      <h1>{atraccion?.nombre}</h1>
      <p>
        <strong>Capacidad:</strong> {atraccion?.capacidad} asientos
      </p>
      <p>
        <strong>Ciclos realizados:</strong> {atraccion?.contador_ciclos_actuales}
      </p>
      <p style={{ fontWeight: 'bold', marginTop: '10px' }}>
        Asientos disponibles:{' '}
        {atraccion ? atraccion.capacidad - (atraccion.asientos_ocupados || 0) : 0}
      </p>
      <p>
        <strong>Estado:</strong> {atraccion?.estado_atraccion}
      </p>
      {atraccion?.estado_atraccion === 'Mantenimiento' && atraccion.tiempo_reparacion && (
        <>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            Máquina disponible:{' '}
            {new Date(atraccion.tiempo_reparacion).toLocaleString('es-ES', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            Tiempo estimado: {tiempoRestanteReparacion}
          </p>
        </>
      )}

      <button
  onClick={iniciarCiclo}
  disabled={!botonesHabilitados || cicloEnCurso}
  className="boton-ciclo"
>
  {cicloEnCurso ? 'Ciclo en curso...' : 'Iniciar recorrido'}
</button>
      <button
  onClick={() => {
    if (atraccion?.estado_atraccion !== 'Funcional') {
      Swal.fire(
        'Máquina no operativa',
        `La máquina no puede operar, porque se encuentra en: "${atraccion?.estado_atraccion}".`,
        'error'
      );
      return;
    }
    iniciarEscaneo();
  }}
  disabled={!botonesHabilitados}
  className="boton-ciclo"
>
  Escanear QR
</button>

      {cicloEnCurso && (
        <div className="temporizador">
          Tiempo restante:{' '}
          {`${Math.floor(tiempoRestante / 60)
            .toString()
            .padStart(2, '0')}:${(tiempoRestante % 60).toString().padStart(2, '0')}`}
        </div>
      )}

      <div className="leyenda">
        <div>
          <span className="cuadro libre" /> Libre
        </div>
        <div>
          <span className="cuadro ocupado" /> Ocupado
        </div>
      </div>

      <div className="cabina-marco">
        <div className="pantalla-centrada">Frente / Entrada</div>
        <div className="cine-asientos">
          {filasUnicas.map((fila) => (
            <div key={fila} className="fila">
              <span className="etiqueta-fila">{fila}</span>
              {asientos
                .filter((a) => a.fila === fila)
                .map((a) => {
                  const esTucTuc = atraccion?.id_atraccion === 3;
                  const puedeSeleccionar =
                    esTucTuc && seleccionarAsiento && a.estado === 'libre';
                  return (
                    <div
                      key={`${fila}-${a.numero}`}
                      className={`asiento ${a.estado}`}
                      style={{ cursor: puedeSeleccionar ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (puedeSeleccionar) {
                          handleSeleccionarAsiento(a.fila, a.numero);
                        }
                      }}
                    >
                      {a.numero}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {scanner && (
        <button
          onClick={cerrarCamara}
          style={{
            backgroundColor: '#e53935',
            color: '#fff',
            padding: '10px 20px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            margin: '0 auto',
            display: 'block',
          }}
        >
          Cerrar cámara
        </button>
      )}

      <div id="reader" style={{ width: '300px', margin: '2rem auto' }} />

      {historialUso.length > 0 && (
        <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <h3>Historial de uso</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc' }}>#</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Fecha</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Hora</th>
              </tr>
            </thead>
            <tbody>
              {historialUso.map((registro, index) => (
                <tr key={registro.id_uso_atraccion}>
                  <td>{index + 1}</td>
                  <td>{registro.fecha_ciclo_atraccion}</td>
                  <td>{registro.hora_ciclo_atraccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </LayoutWithSidebar>
);
}