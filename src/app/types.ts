export interface MantenimientoRealizado {
    id: number;
    fecha: string;
    tipo: string; // "preventivo", "correctivo", etc.
    descripcion: string; 
  }
  
  export interface Machine {
    id: number;
    nombre: string;
    imagen: string;
    estado: string;  // "Funcionando" | "Mantenimiento"
    fichaTecnica: string; 
    ciclosActuales: number;
    ciclosParaMantenimiento: number;
    historialMantenimientos: MantenimientoRealizado[];
    checklist: string[]; // Posibles tareas por defecto
  }
  export const initialMachines: Machine[] = [
    {
      id: 1,
      nombre: "El Cactus Rotador",
      imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-cactus-rotador.png",
      estado: "Funcionando",
      fichaTecnica: "Ficha técnica del Cactus Rotador",
      ciclosActuales: 5,
      ciclosParaMantenimiento: 30,
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
      imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//el-toro-de-tierra-caliente.png",
      estado: "Funcionando",
      fichaTecnica: "Ficha técnica del Toro de Tierra Caliente",
      ciclosActuales: 2,
      ciclosParaMantenimiento: 25,
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
      imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//montana-la-union.jpeg",
      estado: "Funcionando",
      fichaTecnica: "Ficha técnica de la Montaña De La Unión",
      ciclosActuales: 0,
      ciclosParaMantenimiento: 40,
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
      imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
      estado: "Funcionando",
      fichaTecnica: "Ficha técnica del Tuc Tuc",
      ciclosActuales: 10,
      ciclosParaMantenimiento: 35,
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
      imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
      estado: "Funcionando",
      fichaTecnica: "Ficha técnica del Tuc Tuc",
      ciclosActuales: 8,
      ciclosParaMantenimiento: 35,
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
    {id: 6,
  nombre: "Los Tuc Tuc Chocones - Unidad 3",
  imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  estado: "En mantenimiento",
  fichaTecnica: "Ficha técnica del Tuc Tuc",
  ciclosActuales: 0,
  ciclosParaMantenimiento: 35,
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
  imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  estado: "Funcionando",
  fichaTecnica: "Ficha técnica del Tuc Tuc",
  ciclosActuales: 20,
  ciclosParaMantenimiento: 35,
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
  imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//los-tuc-tucs-chocones.jpeg",
  estado: "Funcionando",
  fichaTecnica: "Ficha técnica del Tuc Tuc",
  ciclosActuales: 15,
  ciclosParaMantenimiento: 35,
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
  imagen: "https://bsehwzfkdimsspvbqrim.supabase.co/storage/v1/object/public/juegos-imgs//trenecito-fragua.jpeg",
  estado: "Funcionando",
  fichaTecnica: "Ficha técnica del Trencito",
  ciclosActuales: 4,
  ciclosParaMantenimiento: 30,
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