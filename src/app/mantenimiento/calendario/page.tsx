"use client";

import { useEffect, useState } from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { Machine, initialMachines } from "@/app/types";
import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function CalendarioMantenimientos() {
  const [maquinas] = useState<Machine[]>(initialMachines);

  // Supongamos que cada máquina se le define una "fechaProximoMantenimiento"
  // o calculas la fecha en base a la lógica de "faltan X ciclos"...
  // En este ejemplo, supongo que no tenemos la fecha en el objeto, 
  // sino que es un placeholder.
  
  // Podrías integrarte con el Panel de Control y su lógica,
  // o con la base de datos real.

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

  return (
    <LayoutWithSidebar>
      <div style={{ padding: "20px" }}>
        <h1>Calendario de Mantenimientos</h1>

        {/* Botón para volver al módulo de Máquinas */}
        <Link href="/maquinas">
          <button>Ir a Ficha de Máquinas</button>
        </Link>

        <div style={{ marginTop: "20px" }}>
          <p>Aquí podrías renderizar un calendario gráfico con librerías como react-calendar o FullCalendar.</p>

          <h2>Próximos Mantenimientos</h2>
          {maquinas.map((m) => {
            // Ejemplo: supongamos que cada mantenimiento está programado cada 25 ciclos,
            // y estimamos la fecha en base a un "placeholder" (o la guardas en BD).
            const faltanCiclos = m.ciclosParaMantenimiento - m.ciclosActuales;
            // Podrías estimar que un ciclo equivale a un día, o hacer un "mapping" distinto.

            return (
              <div key={m.id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
                <h3>{m.nombre}</h3>
                <p>Ciclos actuales: {m.ciclosActuales} / {m.ciclosParaMantenimiento}</p>
                <p>Faltan {faltanCiclos} ciclos para el mantenimiento.</p>
                <p><em>Aquí se mostraría la fecha real de mantenimiento en el calendario.</em></p>
              </div>
            );
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}