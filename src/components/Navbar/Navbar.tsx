"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './navbar.module.css';

interface SubMenuItem {
    name: string;
    path: string;
    icon?: string;
  }
  
  interface MenuItem {
    name: string;
    path: string;
    icon: string;
    subMenuItems?: SubMenuItem[];
  }
  
  const menuItems: MenuItem[] = [
    {
      name: 'Inicio',
      path: '/',
      icon: '🏠',
    },
    {
      name: 'Operador',
      path: '/operador',
      icon: '👨‍💼',
      subMenuItems: [
        {
          name: 'Atender Visitante',
          path: '/operador/atender-visitante',
          icon: '👥'
        }
      ]
    },
    {
      name: 'Mantenimiento',
      path: '/mantenimiento',
      icon: '🔧',
      subMenuItems: [
        {
          name: 'Hacer Mantenimiento',
          path: '/mantenimiento/hacer-mantenimiento',
          icon: '🛠️'
        }
      ]
    },
    {
      name: 'Seguridad',
      path: '/seguridad',
      icon: '🔒',
      subMenuItems: [
        {
          name: 'Vehículos',
          path: '/seguridad/vehiculos',
          icon: '🚗'
        },
        {
          name: 'Empleados',
          path: '/seguridad/empleados',
          icon: '👨‍💼'
        },
        {
          name: 'Visitantes',
          path: '/seguridad/visitantes',
          icon: '🧑‍🦰'
        }
      ]
    },
    {
      name: 'Vendedor',
      path: '/vendedor',
      icon: '💰',
      subMenuItems: [
        {
          name: 'Vender Ticket',
          path: '/vendedor/vender-ticket',
          icon: '🎫'
        }
      ]
    },
    {
      name: 'Gerente',
      path: '/gerente',
      icon: '👑',
      subMenuItems: [
        {
          name: 'Ver Ingresos de Ventas',
          path: '/gerente/ingresos-ventas',
          icon: '📊'
        }
      ]
    }
  ];
  
  const Sidebar: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const pathname = usePathname();
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
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
      // Aquí puedes implementar la lógica para cerrar sesión
      // Por ejemplo: redirección a la página de login, limpiar tokens, etc.
      console.log("Cerrando sesión...");
      // Por ahora, solo redirigimos a la página de login
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
              {menuItems.map((item) => (
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
                <span className={styles.icon}>⏻</span>
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