// src/app/mantenimiento/maquinas/page.tsx
"use client";

import { useEffect, useState } from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import Link from "next/link";
import "./maquinas.css";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

// Tipos
export interface MantenimientoRealizado {
  id: number;
  fecha: string;
  tipo: string; // "Preventivo" | "Correctivo"
  descripcion: string;
}

export interface Machine {
  id: number;
  nombre: string;
  imagen: string;
  fichaTecnica: {
    modelo: string;
    marca: string;
    anio: number;
  };
  historialMantenimientos: MantenimientoRealizado[];
  checklist: string[];
}

// Datos iniciales de prueba (sin export)
const initialMachines: Machine[] = [
  {
    id: 1,
    nombre: "El Cactus Rotador",
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-cactus-rotador.png",
    fichaTecnica: {
      modelo: "Cactus-PX1",
      marca: "Rotors Corp",
      anio: 2022,
    },
    historialMantenimientos: [
      {
        id: 1,
        fecha: "2025-03-10",
        tipo: "Preventivo",
        descripcion: "Revisión general y ajuste de piezas.",
      },
    ],
    checklist: [
      "Cambio de aceite",
      "Revisión de estructura",
      "Ajuste de mecanismos",
      "Limpieza general",
    ],
  },
  {
    id: 2,
    nombre: "El Toro de Tierra Caliente",
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-toro-de-tierra-caliente.png",
    fichaTecnica: {
      modelo: "Toro-ZX9",
      marca: "FunRides",
      anio: 2021,
    },
    historialMantenimientos: [
      {
        id: 1,
        fecha: "2025-03-12",
        tipo: "Correctivo",
        descripcion: "Reparación de piezas dañadas.",
      },
    ],
    checklist: [
      "Cambio de aceite",
      "Revisión de estructura",
      "Ajuste de mecanismos",
      "Limpieza general",
    ],
  },
  {
    id: 3,
    nombre: "Montaña De La Unión",
    imagen:
      "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//montana-la-union.jpeg",
    fichaTecnica: {
      modelo: "Union-CL1",
      marca: "RollerCoaster Inc",
      anio: 2020,
    },
    historialMantenimientos: [
      {
        id: 1,
        fecha: "2025-03-20",
        tipo: "Preventivo",
        descripcion: "Revisión general y ajuste de piezas.",
      },
    ],
    checklist: [
      "Cambio de aceite",
      "Revisión de estructura",
      "Ajuste de mecanismos",
      "Limpieza general",
    ],
  },
  
    {
      id: 4,
      nombre: "Los Tuc Tuc Chocones - Unidad 1",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/los-tuc-tucs-chocones.jpeg",
      fichaTecnica: {
        modelo: "TucTuc-100",
        marca: "FunRides",
        anio: 2023,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-03-05",
          tipo: "Preventivo",
          descripcion: "Cambio de llantas y revisión de frenos.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de llantas",
        "Ajuste de frenos",
        "Limpieza general",
      ],
    },
    {
      id: 5,
      nombre: "Los Tuc Tuc Chocones - Unidad 2",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/los-tuc-tucs-chocones.jpeg",
      fichaTecnica: {
        modelo: "TucTuc-200",
        marca: "FunRides",
        anio: 2022,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-03-05",
          tipo: "Preventivo",
          descripcion: "Cambio de llantas y revisión de frenos.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de llantas",
        "Ajuste de frenos",
        "Limpieza general",
      ],
    },
    {
      id: 6,
      nombre: "Los Tuc Tuc Chocones - Unidad 3",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/los-tuc-tucs-chocones.jpeg",
      fichaTecnica: {
        modelo: "TucTuc-300",
        marca: "FunRides",
        anio: 2021,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-03-01",
          tipo: "Correctivo",
          descripcion: "Reparación de piezas dañadas.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de llantas",
        "Ajuste de frenos",
        "Limpieza general",
      ],
    },
    {
      id: 7,
      nombre: "Los Tuc Tuc Chocones - Unidad 4",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/los-tuc-tucs-chocones.jpeg",
      fichaTecnica: {
        modelo: "TucTuc-400",
        marca: "FunRides",
        anio: 2023,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-02-28",
          tipo: "Preventivo",
          descripcion: "Cambio de llantas y revisión de frenos.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de llantas",
        "Ajuste de frenos",
        "Limpieza general",
      ],
    },
    {
      id: 8,
      nombre: "Los Tuc Tuc Chocones - Unidad 5",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/los-tuc-tucs-chocones.jpeg",
      fichaTecnica: {
        modelo: "TucTuc-500",
        marca: "FunRides",
        anio: 2023,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-03-03",
          tipo: "Preventivo",
          descripcion: "Cambio de llantas y revisión de frenos.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de llantas",
        "Ajuste de frenos",
        "Limpieza general",
      ],
    },
    {
      id: 9,
      nombre: "Trencito de la Fragua",
      imagen:
        "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs/trenecito-fragua.jpeg",
      fichaTecnica: {
        modelo: "Tren-FRG",
        marca: "RailFun",
        anio: 2023,
      },
      historialMantenimientos: [
        {
          id: 1,
          fecha: "2025-03-01",
          tipo: "Preventivo",
          descripcion: "Revisión general y ajuste de piezas.",
        },
      ],
      checklist: [
        "Cambio de aceite",
        "Revisión de estructura",
        "Ajuste de mecanismos",
        "Limpieza general",
      ],
    },
  ];
  

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<Machine[]>(initialMachines);
  const [mantenimientoTipo, setMantenimientoTipo] = useState("Preventivo");
  const [mantenimientoDesc, setMantenimientoDesc] = useState("");

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

  const handleAgregarMantenimiento = (idMaquina: number) => {
    const hoy = new Date().toISOString().substring(0, 10);
    const nuevo: MantenimientoRealizado = {
      id: Date.now(),
      fecha: hoy,
      tipo: mantenimientoTipo,
      descripcion: mantenimientoDesc,
    };

    setMaquinas((prev) =>
      prev.map((m) =>
        m.id === idMaquina
          ? {
              ...m,
              historialMantenimientos: [...m.historialMantenimientos, nuevo],
            }
          : m
      )
    );

    setMantenimientoTipo("Preventivo");
    setMantenimientoDesc("");
  };

  return (
    <LayoutWithSidebar>
      <div className="maquinas_page">
        <h1>Máquinas y Fichas Técnicas</h1>

        <Link href="./hacer-mantenimiento">
          <button>Ir al Panel de Control ←</button>
        </Link>

        <div className="contenedor_maquinas">
          {maquinas.map((m) => (
            <div key={m.id} className="maquina_card">
              <h2>{m.nombre}</h2>
              <img src={m.imagen} alt={m.nombre} />

              <div className="ficha-tecnica">
                <h3>Ficha Técnica</h3>
                <ul>
                  <li><b>Modelo:</b> {m.fichaTecnica.modelo}</li>
                  <li><b>Marca:</b> {m.fichaTecnica.marca}</li>
                  <li><b>Año:</b> {m.fichaTecnica.anio}</li>
                </ul>
              </div>

              <details style={{ marginTop: "10px" }}>
                <summary>Ver Checklist por defecto</summary>
                <ul>
                  {m.checklist.map((tarea, idx) => (
                    <li key={idx}>{tarea}</li>
                  ))}
                </ul>
              </details>

              <h3>Historial de Mantenimientos</h3>
              <ul>
                {m.historialMantenimientos.map((mant) => (
                  <li key={mant.id}>
                    {mant.fecha} - {mant.tipo}: {mant.descripcion}
                  </li>
                ))}
              </ul>

              <div className="form_mantenimiento">
                <h4>Registrar nuevo Mantenimiento↓</h4>
                <select
                  value={mantenimientoTipo}
                  onChange={(e) => setMantenimientoTipo(e.target.value)}
                >
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                </select>
                <textarea
                  className="descripcion_detalles"
                  placeholder="Descripción o detalles"
                  value={mantenimientoDesc}
                  onChange={(e) => setMantenimientoDesc(e.target.value)}
                  spellCheck={false}
                  data-ms-editor={undefined}
                />
                <button onClick={() => handleAgregarMantenimiento(m.id)}>
                  Agregar Mantenimiento
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}