"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import "./hacer_mantenimiento.css";
import Swal from "sweetalert2";

/**
 * Interfaz que describe cada máquina.
 */
interface Machine {
  id: number;
  nombre: string;
  estado: string;
  fechaUltimoMantenimiento: string;
  fechaProximoMantenimiento: string;
  ciclosActuales: number;
  ciclosParaMantenimiento: number;
  imagen: string; // URL de la foto
}

// Tolerancia de 10 ciclos para mostrar la advertencia previa a "vencido"
const TOLERANCIA_CICLOS = 10;

export default function PanelMaquinas() {
  // Estado con la lista de máquinas
  const [maquinas, setMaquinas] = useState<Machine[]>(initialMachines);

  // Hook para navegar en Next.js
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
                // Solo el gerente (id_puesto = 3) y el de mantenimiento (id_puesto = 5) tiene acceso a esta página
                if (session.id_puesto !== 3 && session.id_puesto !== 5) {
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

  /**
   * Suma 1 ciclo de uso a la máquina con el ID dado,
   * salvo que la máquina esté en mantenimiento.
   */
  const handleSumarCiclo = (idMaquina: number) => {
    setMaquinas((prev) =>
      prev.map((machine) => {
        if (machine.id === idMaquina) {
          // Restringir si está en mantenimiento
          if (machine.estado === "Mantenimiento") {
            return machine; // no aumentamos nada
          }
          return {
            ...machine,
            ciclosActuales: machine.ciclosActuales + 1,
          };
        }
        return machine;
      })
    );
  };

  /**
   * Realiza el mantenimiento de la máquina:
   * - Fecha de hoy como "último mantenimiento"
   * - Reinicia ciclos a 0
   * - Estado = "Funcionando"
   */

  /*TABLA ATRACCION
  Guardar en la base de datos: crear el bd la fecha del ultimo mantenimiento  
  eliminiar en front la fecha de proximo mantenimiento
  obtener estado_atraccion*/
  const handleRealizarMantenimiento = (idMaquina: number) => {
    //actualizar el contador de ciclos_actuales a 0 y la fecha de mantenimiento a hoy
    // Obtener la fecha de hoy en formato "YYYY-MM-DD" cuando se pulsa el botón realizar mantenimiento
    const hoy = new Date().toISOString().substring(0, 10); // "YYYY-MM-DD"
    setMaquinas((prev) =>
      prev.map((machine) => {
        if (machine.id === idMaquina) {
          const proximaFecha = calcularFechaProximoMantenimiento(hoy, 30);
          return {
            ...machine,
            fechaUltimoMantenimiento: hoy,
            fechaProximoMantenimiento: proximaFecha,
            ciclosActuales: 0,
            estado: "Funcionando",
          };
        }
        return machine;
      })
    );
  };

  /**
   * Cambia el estado de la máquina, p.ej. a "Mantenimiento"
   */
  const handleCambiarEstado = (idMaquina: number, nuevoEstado: string) => {
    setMaquinas((prev) =>
      prev.map((machine) => {
        if (machine.id === idMaquina) {
          return { ...machine, estado: nuevoEstado };
        }
        return machine;
      })
    );
  };

  /**
   * Suma 'diasASumar' días a una fecha en formato "YYYY-MM-DD"
   */
  const calcularFechaProximoMantenimiento = (
    fechaStr: string,
    diasASumar: number
  ) => {
    const fecha = new Date(fechaStr);
    fecha.setDate(fecha.getDate() + diasASumar);
    return fecha.toISOString().substring(0, 10);
  };

  return (
    <LayoutWithSidebar>
      <div className="hacer_mantenimiento_page">
        <h1>Monitoreo de Máquinas</h1>

        {/* Botón en la esquina superior izquierda => lleva a /app/maquinas/page.tsx */}
        <button
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            backgroundColor: "#4caf50",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => router.push("../mantenimiento/maquinas")}
        >
          Ir a Mantenimiento
        </button>

        <div className="contenedor_juegos">
          {maquinas.map((m) => {
            const faltanCiclos = m.ciclosParaMantenimiento - m.ciclosActuales;
            const estaVencido = faltanCiclos <= 0;
            const estaEnTolerancia =
              !estaVencido && faltanCiclos <= TOLERANCIA_CICLOS;

            return (
              <div
                key={m.id}
                className={`juego_card
                  ${m.estado === "Mantenimiento" ? "card_mantenimiento" : ""}
                  ${estaEnTolerancia ? "card_advertencia" : ""}
                `}
              >
                <h2>{m.nombre}</h2>
                <img src={m.imagen} alt={m.nombre} />

                <p>
                  <b>Estado:</b> {m.estado}
                </p>
                <p>
                  <b>Último Mantenimiento:</b> {m.fechaUltimoMantenimiento}
                </p>
                <p>
                  <b>Próximo Mantenimiento:</b> {m.fechaProximoMantenimiento}
                </p>
                <p>
                  <b>Ciclos actuales:</b> {m.ciclosActuales} /{" "}
                  {m.ciclosParaMantenimiento}{" "}
                  {estaVencido && (
                    <span
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        marginLeft: 8,
                      }}
                    >
                      <br />
                      ¡Mantenimiento vencido!
                    </span>
                  )}
                  {estaEnTolerancia && (
                    <span
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        marginLeft: 8,
                      }}
                    >
                      <br />
                      ¡Atención!: quedan {faltanCiclos} ciclos antes del
                      mantenimiento
                    </span>
                  )}
                </p>

                <div className="botones_acciones">
                  {/* +1 Ciclo (deshabilitado si en mantenimiento) */}
                  <button
                    disabled={m.estado === "Mantenimiento"}
                    onClick={() => handleSumarCiclo(m.id)}
                  >
                    +1 Ciclo
                  </button>

                  <button onClick={() => handleCambiarEstado(m.id, "Mantenimiento")}>
                    Poner en Mantenimiento
                  </button>

                  <button onClick={() => handleRealizarMantenimiento(m.id)}>
                    Realizar Mantenimiento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

// Estado inicial con imágenes y datos de ejemplo
const initialMachines: Machine[] = [
  {
    id: 1, // jalar id de la bd
    nombre: "El Cactus Rotador",
    estado: "Funcionando", //estado_atraccion asi se llama en la bd
    fechaUltimoMantenimiento: "2025-03-10", //jalar de la bd
    fechaProximoMantenimiento: "2025-04-10", //jalar de la bd
    ciclosActuales: 5, //jalar de la bd
    ciclosParaMantenimiento: 30,//jalar de la bd  
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-cactus-rotador.png",
  },
  {
    id: 2,
    nombre: "El Toro de Tierra Caliente",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-12",
    fechaProximoMantenimiento: "2025-04-12",
    ciclosActuales: 2,
    ciclosParaMantenimiento: 25,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-toro-de-tierra-caliente.png",
  },
  {
    id: 3,
    nombre: "Montaña De La Unión",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-20",
    fechaProximoMantenimiento: "2025-04-19",
    ciclosActuales: 0,
    ciclosParaMantenimiento: 40,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//montana-la-union.jpeg",
  },
  // Ejemplo para 5 unidades de Tuc Tuc
  {
    id: 4,
    nombre: "Los Tuc Tuc Chocones - Unidad 1",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-05",
    fechaProximoMantenimiento: "2025-03-30",
    ciclosActuales: 10,
    ciclosParaMantenimiento: 35,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  },
  {
    id: 5,
    nombre: "Los Tuc Tuc Chocones - Unidad 2",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-05",
    fechaProximoMantenimiento: "2025-03-30",
    ciclosActuales: 8,
    ciclosParaMantenimiento: 35,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  },
  {
    id: 6,
    nombre: "Los Tuc Tuc Chocones - Unidad 3",
    estado: "En mantenimiento",
    fechaUltimoMantenimiento: "2025-03-01",
    fechaProximoMantenimiento: "2025-03-29",
    ciclosActuales: 0,
    ciclosParaMantenimiento: 35,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  },
  {
    id: 7,
    nombre: "Los Tuc Tuc Chocones - Unidad 4",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-02-28",
    fechaProximoMantenimiento: "2025-03-28",
    ciclosActuales: 20,
    ciclosParaMantenimiento: 35,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  },
  {
    id: 8,
    nombre: "Los Tuc Tuc Chocones - Unidad 5",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-03",
    fechaProximoMantenimiento: "2025-04-02",
    ciclosActuales: 15,
    ciclosParaMantenimiento: 35,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  },
  {
    id: 9,
    nombre: "Trencito de la Fragua",
    estado: "Funcionando",
    fechaUltimoMantenimiento: "2025-03-01",
    fechaProximoMantenimiento: "2025-03-27",
    ciclosActuales: 4,
    ciclosParaMantenimiento: 30,
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//trenecito-fragua.jpeg",
  },
];