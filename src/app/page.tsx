"use client"

import React, { useEffect, useState } from 'react';
import './home.css';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import { useRouter } from "next/navigation";
import { supabase } from './actions';
import Swal from 'sweetalert2';

export default function Home() {
  const router = useRouter();
  const [fecha, setFecha] = useState(new Date());

  useEffect(() => {
    const session = localStorage.getItem("employeeSession");
    if (!session) {
      router.push("/login");
    }
  }, [router]);

  // Validación sesión
    useEffect(()=>{
      const stored=localStorage.getItem('employeeSession');
      if(!stored) return void router.push('/');
      try{
        const session=JSON.parse(stored);
        const { id_puesto, id_empleado } = session;
  
        // Función async para update
        (async () => {
          if (id_puesto !== 6) {
            const { data, error } = await supabase
              .from('empleado')
              .update({ estado_actividad_empleado: 'En el módulo de inicio' })
              .eq('id_empleado', id_empleado);
            if (error) console.error('Error al actualizar estado automático:', error);
            else console.log('Estado automático actualizado:', data);
          }
        })();
      }catch{router.push('/');}
    },[router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFecha(new Date());
    }, 60000);
    setFecha(new Date());
    return () => clearInterval(timer);
  }, []);

  const opcionesFecha = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;
  const fechaFormateada = fecha.toLocaleDateString('es-ES', opcionesFecha);

  const opcionesHora = { hour: '2-digit', minute: '2-digit' } as const;
  const horaFormateada = fecha.toLocaleTimeString('es-ES', opcionesHora);

  const fechaMostrada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

  return (
    <LayoutWithSidebar>
      <div className='home_page'>
        <div className='home_container'>
          <div className='home_date_container'>
            <h2>{fechaMostrada}</h2>
            <h2>{horaFormateada}</h2>
          </div>
          <h1 className='home_welcome_message'>¡Bienvenido, comencemos esas actividades!</h1>
          <h2 className='home_subwelcome_message'>Abre tu menú de opciones para comenzar a trabajar en tus actividades.</h2>
          <div className='home_horarios_operacion'>
            <div className='home_horario_operacion'></div>
            <div className='home_dias_operacion'></div>
          </div>
          <div className='home_vision_empresa_container'>
            <h1 className='home_vision_empresa_title'>Visión</h1>
            <p className='home_vision_empresa_text'>Ser el parque de diversiones líder en Guatemala, reconocido por su innovación y compromiso con la sostenibilidad ambiental, transformando la experiencia de entretenimiento en Zacapa a través de la tecnología. Buscamos ofrecer a nuestros visitantes un espacio mágico y seguro, donde cada interacción y servicio se realice de forma digital, eliminando el uso de papel y reduciendo nuestra huella ecológica.<br></br>
              Nuestro enfoque cero papel no solo moderniza los procesos de compra de tickets y acceso al parque, sino que también promueve una cultura de responsabilidad ambiental y eficiencia. Inspiramos a la comunidad local y a visitantes de todas las edades a vivir aventuras inolvidables que celebren la riqueza cultural de Zacapa, impulsando el desarrollo económico y social de la región mediante prácticas innovadoras y sostenibles.</p>
          </div>

          <div className='home_mision_empresa_container'>
            <h1 className='home_mision_empresa_title'>Misión</h1>
            <p className='home_mision_empresa_text'>Ofrecer a nuestros visitantes experiencias inolvidables y seguras, fusionando innovación tecnológica y sostenibilidad ambiental en cada rincón de nuestro parque temático en Zacapa. Nos comprometemos a eliminar el uso de papel en todos nuestros procesos, facilitando la compra de entradas y el acceso digital para crear un ambiente eficiente y ecológico. Al integrar la riqueza cultural y natural de la región con tecnología de punta, buscamos impulsar el desarrollo económico y social local, garantizando una aventura mágica y responsable para todas las edades.</p>
          </div>
          <div className='home_protocolos_seguridad_parque_container'>
            <h1 className='home_protocolos_seguridad_parque_title'>Protocolos de Seguridad del sistema del parque de diversiones</h1>
            <ul className='home_protocolos_seguridad_parque_list'>
              <li>
                <strong>No compartir credenciales:</strong> Nunca compartir el correo electrónico y la contraseña asignada por la empresa. Cada empleado es responsable de mantener la confidencialidad de sus datos de acceso.
              </li>
              <li>
                <strong>Acceso exclusivo y controlado:</strong> Utilizar la plataforma únicamente desde dispositivos y redes autorizadas por la empresa. Evitar el uso de redes públicas.
              </li>
              <li>
                <strong>Actualización constante:</strong> Mantener los navegadores, sistemas operativos y cualquier software de seguridad actualizados para prevenir vulnerabilidades conocidas.
              </li>
              <li>
                <strong>No almacenar contraseñas en dispositivos compartidos:</strong> Evitar guardar las contraseñas en navegadores o dispositivos que puedan ser utilizados por otras personas.
              </li>
              <li>
                <strong>Reportar incidentes:</strong> Informar inmediatamente a los responsables de seguridad o al área de TI sobre cualquier actividad sospechosa o incidente relacionado con el acceso a la plataforma.
              </li>
              <li>
                <strong>Cierre de sesión:</strong> Finalizar la sesión cuando se deje de utilizar la plataforma, especialmente en dispositivos compartidos o públicos.
              </li>
              <li>
                <strong>Uso responsable de la información:</strong> No divulgar ni compartir información confidencial de la empresa o de la plataforma fuera de los canales autorizados.
              </li>
              <li>
                <strong>Capacitación continua:</strong> Participar en los programas de formación y actualización en temas de seguridad informática que la empresa ofrezca.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
