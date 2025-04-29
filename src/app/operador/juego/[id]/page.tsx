'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import { supabase } from '@/app/login/actions';
import './juego.css';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';

interface Atraccion {
  id_atraccion: number;
  nombre: string;
  capacidad: number;
  contador_ciclos_actuales: number;
  asientos_ocupados?: number;
}

interface Asiento {
  fila: string;
  numero: number;
  estado: 'libre' | 'ocupado';
}

export default function JuegoDetalle() {
  const { id } = useParams();
  const [atraccion, setAtraccion] = useState<Atraccion | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [cicloEnCurso, setCicloEnCurso] = useState(false);
  const [ultimoQR, setUltimoQR] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    async function fetchAtraccion() {
      const { data, error } = await supabase
        .from('atraccion')
        .select('*')
        .eq('id_atraccion', id)
        .single();

      if (!error && data) {
        setAtraccion(data);
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
            generados.push({ fila: letra, numero: contador, estado: 'libre' });
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

  const iniciarCiclo = () => {
    const hayOcupados = asientos.some(a => a.estado === 'ocupado');
  
    if (!hayOcupados) {
      Swal.fire(
        '⛔ No se puede iniciar',
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
      }).then((result) => {
        if (result.isConfirmed) {
          setCicloEnCurso(true);
          setTiempoRestante(0.1 * 60); // 6 segundos como prueba
          Swal.fire('✅ Ciclo iniciado', 'El recorrido ha comenzado.', 'success');
        }
      });
    }
  };

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
      title: '🎢 Ciclo finalizado',
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

  const iniciarEscaneo = async () => {
  const html5QrCode = new Html5Qrcode("reader");

  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices.length === 0) {
      Swal.fire('❌ Sin cámara', 'No se detectó ninguna cámara disponible.', 'error');
      return;
    }

    if (devices.length > 1) {
      // Si hay más de una cámara, preguntar
      const opciones = devices.map((device, index) => ({
        id: device.id,
        label: device.label || `Cámara ${index + 1}`
      }));

      const { value: seleccion } = await Swal.fire({
        title: 'Selecciona una cámara',
        input: 'select',
        inputOptions: opciones.reduce((acc, opt) => {
          acc[opt.id] = opt.label;
          return acc;
        }, {} as Record<string, string>),
        inputPlaceholder: 'Selecciona una cámara',
        showCancelButton: true,
      });

      if (!seleccion) return; // Canceló

      await html5QrCode.start(
        seleccion,
        { fps: 10, qrbox: 250 },
        async qrCode => {
          try {
            await html5QrCode.stop();
            await handleScanQR(qrCode);
          } catch (err) {
            console.error('Error en handleScanQR:', err);
          }
        },
        error => {
          console.warn("Error al escanear QR:", error);
        }
      );
    } else {
      // Solo una cámara
      await html5QrCode.start(
        devices[0].id,
        { fps: 10, qrbox: 250 },
        async qrCode => {
          try {
            await html5QrCode.stop();
            await handleScanQR(qrCode);
          } catch (err) {
            console.error('Error en handleScanQR:', err);
          }
        },
        error => {
          console.warn("Error al escanear QR:", error);
        }
      );
    }
  } catch (err) {
    console.error("Error al obtener cámaras:", err);
    Swal.fire('❌ Error', 'No se pudieron cargar las cámaras.', 'error');
  }
};

  const filasUnicas = Array.from(new Set(asientos.map(a => a.fila)));

  return (
    <LayoutWithSidebar>
      <div className="juego-contenedor">
        <h1>{atraccion?.nombre}</h1>
        <p><strong>Capacidad:</strong> {atraccion?.capacidad} asientos</p>
        <p><strong>Ciclos realizados:</strong> {atraccion?.contador_ciclos_actuales}</p>

        <p style={{ fontWeight: 'bold', marginTop: '10px' }}>
          🪑 Asientos disponibles:{' '}
          {atraccion ? atraccion.capacidad - (atraccion.asientos_ocupados || 0) : 0}
        </p>


        <button 
          onClick={iniciarCiclo} 
          disabled={cicloEnCurso}
          className="boton-ciclo"
        >
          {cicloEnCurso ? 'Ciclo en curso...' : 'Iniciar recorrido'}
        </button>

        <button onClick={iniciarEscaneo} className="boton-ciclo">
          Escanear QR
        </button>

        {cicloEnCurso && (
          <div className="temporizador">
            Tiempo restante: {Math.floor(tiempoRestante / 60).toString().padStart(2, '0')}:
            {(tiempoRestante % 60).toString().padStart(2, '0')}
          </div>
        )}

        <div className="leyenda">
          <div><span className="cuadro libre"></span> Libre</div>
          <div><span className="cuadro ocupado"></span> Ocupado</div>
        </div>

        <div className="cabina-marco">
          <div className="pantalla-centrada">Frente / Entrada</div>
          <div className="cine-asientos">
            {filasUnicas.map((fila) => (
              <div key={fila} className="fila">
                <span className="etiqueta-fila">{fila}</span>
                {asientos
                  .filter(a => a.fila === fila)
                  .map(a => (
                    <div 
                      key={`${fila}-${a.numero}`} 
                      className={`asiento ${a.estado}`}
                    >
                      {a.numero}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        <div id="reader" style={{ width: '300px', margin: '2rem auto' }}></div>
      </div>
    </LayoutWithSidebar>
  );
}