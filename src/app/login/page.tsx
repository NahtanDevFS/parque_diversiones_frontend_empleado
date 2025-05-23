"use client";

import React, { useEffect } from 'react'
import styles from "./page.module.css";
import Head from "next/head";
import { supabase } from './actions';
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Empleado {
    id_empleado: number;
    nombre: string;
    apellido: string;
    empleado_foto: string;
    fecha_contratacion: string;
    salario: number;
    id_puesto: number;
    id_sexo: number;
    email: string;
    contrasena: string;
    telefono: string;
    estado_cuenta: number;
}

export default function LoginPage() {

    const router = useRouter();

    useEffect(() => {
        const session = localStorage.getItem("employeeSession");
        if (session) {
          router.push("/");
        }
      }, [router]);

    const fetchEmpleados = async (): Promise<Empleado[]> => {
        try {
          const { data, error } = await supabase.from("empleado").select("*");
          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error("Error al obtener empleados:", error);
          return [];
        }
      };




    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        const empleados = await fetchEmpleados();

        const empleadoEncontrado = empleados.find(
            (empleado) => empleado.email === email && empleado.contrasena === password && empleado.estado_cuenta === 1
        );

        if (empleadoEncontrado) {
            // Acceso concedido con SweetAlert
            MySwal.fire({
              title: "Acceso concedido",
              icon: "success",
              confirmButtonText: "Ok"
          }).then(() => {
              // Se elimina la contraseña por seguridad y se guarda el empleado en localStorage
              const { contrasena, ...empleadoSinContrasena } = empleadoEncontrado;
              localStorage.setItem("employeeSession", JSON.stringify(empleadoSinContrasena));
              router.push("/");
          });

        } else {
          // Acceso denegado con SweetAlert
          MySwal.fire({
            title: "Acceso denegado",
            text: "Verifica tus credenciales o que tu cuenta se encuentre activa.",
            icon: "error",
            confirmButtonText: "Ok"
          });
        }
    }

  return (
    <div className={styles.container}>
      <Head>
        <title className={styles.head}>Inicio de sesión</title>
      </Head>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h1>Inicio de sesión</h1>

        {/* Campo Correo Electrónico */}
        <label htmlFor="email">Correo Electrónico:</label>
        <input type="email" id="email" name="email" required />

        {/* Campo Contraseña */}
        <label htmlFor="password">Contraseña:</label>
        <input type="password" id="password" name="password" required />

        {/* Botón de Registro */}
        <div className={styles.buttonContainer}>
          <button type="submit">Iniciar sesión</button>
        </div>
      </form>
    </div>
  )
}
