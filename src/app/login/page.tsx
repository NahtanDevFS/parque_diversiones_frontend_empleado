"use client";

import React, {  } from 'react'
import styles from "./page.module.css";
import Head from "next/head";
import { supabase } from './actions';
import { useRouter } from "next/navigation";

interface Empleado {
    id_empleado: number;
    nombre: string;
    apellido: string;
    fecha_contratacion: string;
    salario: number;
    id_puesto: number;
    id_sexo: number;
    email: string;
    contrasena: string;
    telefono: string;
}

export default function LoginPage() {

    const router = useRouter();

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
        (empleado) => empleado.email === email && empleado.contrasena === password
        );

        if (empleadoEncontrado) {
            alert("Acceso concedido");
            
            // Guardar el empleado en localStorage sin la contraseña por seguridad
            const { contrasena, ...empleadoSinContrasena } = empleadoEncontrado;
            localStorage.setItem("employeeSession", JSON.stringify(empleadoSinContrasena));

            // Redirigir a la ruta "/"
            router.push("/");

        } else {
        alert("Acceso denegado");
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

        {/* Enlace para recuperar contraseña */}
        <p>
          ¿Olvidaste tu contraseña?{" "}
          <a href="/forgot-password" className={styles.loginLink}>
            Haz clic aquí
          </a>
        </p>
      </form>
    </div>
  )
}
