"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './navbar.module.css';
import { FaHome, FaUserTie, FaTools, FaLock, FaDollarSign, FaCrown, FaUsers, FaCar, FaTicketAlt, FaChartBar, FaSignOutAlt, FaCalendar, FaFortAwesome, FaUserShield   } from 'react-icons/fa';

interface SubMenuItem {
    name: string;
    path: string;
    icon?: React.ReactNode;
  }
  
  interface MenuItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    subMenuItems?: SubMenuItem[];
  }
  
  const menuItems: MenuItem[] = [
    {
      name: 'Inicio',
      path: '/',
      icon: <FaHome />,
    },
    {
      name: 'Operador',
      path: '/operador',
      icon: <FaUserTie />,
      subMenuItems: [
        {
          name: 'Atender Visitante',
          path: '/operador/atender-visitante',
          icon: <FaUsers />
        }
      ]
    },
    {
      name: 'Mantenimiento',
      path: '/mantenimiento',
      icon: <FaTools />,
      subMenuItems: [
        {
          name: 'Hacer Mantenimiento',
          path: '/mantenimiento/hacer-mantenimiento',
          icon: <FaTools />
        }
      ]
    },
    {
      name: 'Control de acceso',
      path: '/seguridad',
      icon: <FaLock />,
      subMenuItems: [
        {
          name: 'Vehículos',
          path: '/seguridad/vehiculos',
          icon: <FaCar />
        },
        {
          name: 'Empleados',
          path: '/seguridad/empleados',
          icon: <FaUserTie />
        },
        {
          name: 'Visitantes',
          path: '/seguridad/visitantes',
          icon: <FaUsers />
        },
        {
          name: 'Control de Visitantes',
          path: '/seguridad/control-visitante',
          icon: <FaUsers />
        },
      ]
    },
    {
      name: 'Vendedor',
      path: '/vendedor',
      icon: <FaDollarSign />,
      subMenuItems: [
        {
          name: 'Vender Ticket',
          path: '/vendedor/vender-ticket',
          icon: <FaTicketAlt />
        }
      ]
    },
    {
      name: 'Gerente',
      path: '/gerente',
      icon: <FaCrown />,
      subMenuItems: [
        {
          name: 'Ver Ingresos de Ventas',
          path: '/gerente/ingresos-ventas',
          icon: <FaChartBar />
        },
        {
          name: 'Control de personal',
          path: '/gerente/control-personal',
          icon: <FaUsers />
        },
        {
          name: 'Reporte de uso de atracciones',
          path: '/gerente/reporte-atraccion',
          icon: <FaFortAwesome />
        },
        {
          name: 'Reporte de ingreso de visitantes',
          path: '/gerente/reporte-visitantes',
          icon: <FaUsers />
        },
        {
          name: 'Reporte de mantenimiento de atracciones',
          path: '/gerente/reporte-mantenimiento-atracciones',
          icon: <FaFortAwesome />
        }
      ]
    },
    {
      name: 'Administrador',
      path: '/administrador',
      icon: <FaUserShield  />,
      subMenuItems: [
        {
          name: 'Ingreso/modificación de Atracciones',
          path: '/administrador/agregar-atraccion',
          icon: <FaFortAwesome />
        },
        {
          name: 'Ingreso/modificación de Eventos',
          path: '/administrador/agregar-evento',
          icon: <FaCalendar />
        },
        {
          name: 'Ingreso/modificación de Empleados',
          path: '/administrador/agregar-modificar-empleado',
          icon: <FaUsers />
        },
        {
          name: 'Deshabilitar atracciones',
          path: '/administrador/deshabilitar-atraccion',
          icon: <FaFortAwesome />
        }
      ]
    }
  ];
  
  const Sidebar: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const pathname = usePathname();
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    const [puestoId, setPuestoId] = useState<number | null>(null);

    // Cargar puesto desde localStorage
    useEffect(() => {
      const session = localStorage.getItem('employeeSession');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setPuestoId(parsed.id_puesto);
        } catch (err) {
          console.error("Error parsing employeeSession:", err);
        }
      }
    }, []);

    // Definir permisos por rol
    const accessByRole: Record<number, string[]> = {
      1: ['Operador'],
      2: ['Control de acceso'],
      3: ['Gerente'],
      4: ['Vendedor'],
      5: ['Mantenimiento'],
      6: ['Operador', 'Mantenimiento', 'Control de acceso', 'Vendedor', 'Gerente', 'Administrador'], // Admin todo
    };

    // Filtrar ítems de menú según id_puesto
    const filteredMenuItems = puestoId
      ? menuItems.filter((item) =>
          item.name === 'Inicio' || accessByRole[puestoId]?.includes(item.name)
        )
      : [];
      
    // Detectar tamaño de pantalla
    useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        if (width <= 480) {
          setScreenSize('mobile');
          setIsSidebarOpen(false);
        } else if (width <= 768) {
          setScreenSize('tablet');
          setIsSidebarOpen(false);
        } else {
          setScreenSize('desktop');
          setIsSidebarOpen(true);
        }
      };
  
      // Inicializar
      handleResize();
  
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
    };
  
    const toggleSubMenu = (name: string) => {
      if (openSubMenu === name) {
        setOpenSubMenu(null);
      } else {
        setOpenSubMenu(name);
      }
    };
  
    const isActive = (path: string) => {
      return pathname === path || pathname.startsWith(path + '/');
    };
  
    const closeSidebarIfMobile = () => {
      if (screenSize === 'mobile' || screenSize === 'tablet') {
        setIsSidebarOpen(false);
      }
    };
  
    const handleLogout = () => {
      //lógica para cerrar sesión
      localStorage.removeItem("employeeSession");
      window.location.href = "/login";
    };
  
    return (
      <>
        <button 
          className={`${styles.toggleButton} ${isSidebarOpen ? styles.active : ''}`} 
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          {isSidebarOpen ? '✖' : '☰'}
        </button>
        
        <nav className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed} ${styles[screenSize]}`}>
          <div className={styles.sidebarContent}>
            <div className={styles.logo}>
              <h2>Dashboard</h2>
            </div>
            
            <ul className={styles.menuList}>
              {filteredMenuItems.map((item) => (
                <li key={item.name} className={`${styles.menuItem} ${isActive(item.path) ? styles.active : ''}`}>
                  {item.subMenuItems ? (
                    <>
                      <button 
                        className={styles.menuButton} 
                        onClick={() => toggleSubMenu(item.name)}
                        aria-expanded={openSubMenu === item.name}
                      >
                        <span className={styles.icon}>{item.icon}</span>
                        <span className={styles.menuText}>{item.name}</span>
                        <span className={styles.arrow}>
                          {openSubMenu === item.name ? '▼' : '▶'}
                        </span>
                      </button>
                      
                      {openSubMenu === item.name && (
                        <ul className={styles.subMenu}>
                          {item.subMenuItems.map((subItem) => (
                            <li key={subItem.name} className={isActive(subItem.path) ? styles.active : ''}>
                              <Link 
                                href={subItem.path} 
                                className={styles.subMenuItem}
                                onClick={closeSidebarIfMobile}
                              >
                                {subItem.icon && <span className={styles.subIcon}>{subItem.icon}</span>}
                                <span>{subItem.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link 
                      href={item.path} 
                      className={styles.menuLink}
                      onClick={closeSidebarIfMobile}
                    >
                      <span className={styles.icon}>{item.icon}</span>
                      <span className={styles.menuText}>{item.name}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            
            {/* Botón de cerrar sesión en la parte inferior */}
            <div className={styles.logoutContainer}>
              <button 
                className={styles.logoutButton}
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                <span className={styles.icon}><FaSignOutAlt /></span>
                <span className={styles.menuText}>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </nav>
        
        {(screenSize === 'mobile' || screenSize === 'tablet') && isSidebarOpen && (
          <div className={styles.overlay} onClick={toggleSidebar}></div>
        )}
      </>
    );
  };
  
  export default Sidebar;