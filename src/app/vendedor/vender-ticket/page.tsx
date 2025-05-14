'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Head from 'next/head';
import QRCode from 'react-qr-code';
import { comprar } from './act';
import Swal from 'sweetalert2';
import { supabase } from './actions';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default function Comprar() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
      
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
              // Solo el admin (id_puesto = 6) y el vendedor (id_puesto = 4) tiene acceso a esta página
              if (session.id_puesto !== 6 && session.id_puesto !== 4) {
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

  // precios por tipo de ticket
  const precios: Record<string, number> = {
    entrada: 50,
    juegos: 80,
    completo: 120,
  };
  const [tipoTicket, setTipoTicket] = useState<string>('entrada');
  const [precioUnitario, setPrecioUnitario] = useState<number>(precios['entrada']);
  // total recalculado = cantidad * precio unitario
  const total = cantidad * precioUnitario;
  // Nuevos estados:
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'efectivo'>('tarjeta');
  const [efectivoRecibido, setEfectivoRecibido] = useState<number>(0);
  const cambio = efectivoRecibido - total;

  const [tarjeta, setTarjeta] = useState({
    numero: '',
    vencimiento: '',
    cvv: '',
    titular: ''
  });
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const formatearNumeroTarjeta = (value: string) => {
    const limpio = value.replace(/\D/g, '').slice(0, 16);
    return limpio.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleVencimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 3) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setTarjeta({ ...tarjeta, vencimiento: value });
  };

  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTarjeta({ ...tarjeta, numero: formatearNumeroTarjeta(e.target.value) });
  };

  const handleTipoTicketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value;
    setTipoTicket(tipo);
    setPrecioUnitario(precios[tipo] ?? precios['entrada']);
  };

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 1;
    setCantidad(val < 1 ? 1 : val);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validación si es efectivo y da menos del precio
    if (metodoPago === 'efectivo' && efectivoRecibido < total) {
      Swal.fire({
        title: "Advertencia",
        text: `El efectivo recibido (Q${efectivoRecibido}) es menor al precio del ticket (Q${precioUnitario}).`,
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const form = e.currentTarget;
    const email = form.email.value;

    // Confirmación con SweetAlert
    const { isConfirmed } = await Swal.fire({
      title: '¿Confirmar compra?',
      html: `
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Tipo:</strong> ${tipoTicket}</p>
        <p><strong>Cantidad:</strong> ${cantidad}</p>
        <p><strong>Total:</strong> Q${total}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, comprar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    setLoading(true);
    setEmailSent(false);

    const formData = new FormData(form);
    //formData.append("id_cliente", userId);
    formData.append("cantidad", cantidad.toString());
    formData.append("precio", precioUnitario.toString());
    formData.append("metodopago", "1");
    formData.append("numero_tarjeta", tarjeta.numero.replace(/\s/g, ''));
    formData.append("vencimiento", tarjeta.vencimiento);
    formData.append("cvv", tarjeta.cvv);
    formData.append("titular", tarjeta.titular);
    formData.append("tipo_ticket", tipoTicket);
    formData.append("total", total.toString());

    const { success, qrs: qr, message } = await comprar(formData);
    setLoading(false);
    if (success) {
      setQrCode(qr ? JSON.stringify(qr) : null);
      setEmailSent(true);
      Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: 'El correo con tu código QR se ha enviado correctamente.',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message ?? 'Ocurrió un problema al procesar tu compra.'
      });
    }
  };

  const ticketDescriptions: Record<string, string> = {
    entrada: 'Este ticket de Entrada te permite el acceso general al parque una vez.',
    juegos: 'El ticket de Juegos incluye 20 juegos seleccionados dentro del parque.',
    completo: 'El ticket Completo ofrece la entrada y el acceso ilimitado y todos los juegos disponibles.',
  };

  const getTicketInfo = (tipo: string) => ticketDescriptions[tipo] || '';

  return (
    <LayoutWithSidebar>
    <div className={styles.container}>
      <Head>
        <title>Compra de Ticket</title>
      </Head>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h1>Datos del comprador</h1>
        <label htmlFor="nombre_completo">Nombre Completo:</label>
        <input
          type="text"
          id="nombre_completo"
          name="nombre_completo"
          placeholder="Juan Pérez"
          required
        />

        <label htmlFor="dpi">DPI:</label>
        <input
          type="text"
          id="dpi"
          name="dpi"
          placeholder="1234567890101"
          required
          maxLength={13}
        />

        <label htmlFor="email">Correo Electrónico:</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="correo@example.com"
          required
        />

        <h1>Compra de Ticket</h1>

        <label htmlFor="tipo_ticket">Tipo de Ticket:</label>
        <select
          id="tipo_ticket"
          name="tipo_ticket"
          value={tipoTicket}
          onChange={handleTipoTicketChange}
          required
        >
          <option value="entrada">Entrada</option>
          <option value="juegos">Juegos</option>
          <option value="completo">Completo</option>
        </select>

        <p className={styles.ticketInfo}>{getTicketInfo(tipoTicket)}</p>

        <label htmlFor="precio">Precio Unitario (Q):</label>
        <input
          type="number"
          id="precio"
          value={precioUnitario}
          disabled
        />

        <label htmlFor="cantidad">Cantidad de Tickets:</label>
        <input
          type="number"
          id="cantidad"
          name="cantidad"
          value={cantidad}
          onChange={handleCantidadChange}
          min={1}
          required
        />

        <label htmlFor="total">Total (Q):</label>
        <input
          type="number"
          id="total"
          value={total}
          disabled
        />

          <label htmlFor="metodo_pago">Método de Pago:</label>
                  <select
                    id="metodo_pago"
                    name="metodo_pago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as 'tarjeta' | 'efectivo')}
                    required
                  >
                    <option value="tarjeta">Tarjeta</option>
                    <option value="efectivo">Efectivo</option>
                  </select>

        {metodoPago === 'tarjeta' && (
  <>
    <h1>Datos de Tarjeta</h1>

    <label htmlFor="numero_tarjeta">Número de Tarjeta:</label>
    <input
      type="text"
      id="numero_tarjeta"
      name="numero_tarjeta"
      value={tarjeta.numero}
      onChange={handleNumeroTarjetaChange}
      placeholder="1234 5678 9101 1121"
      required={metodoPago === 'tarjeta'}
      maxLength={19}
    />

    <label htmlFor="vencimiento">Fecha de Vencimiento:</label>
    <input
      type="text"
      id="vencimiento"
      name="vencimiento"
      value={tarjeta.vencimiento}
      onChange={handleVencimientoChange}
      placeholder="MM/YY"
      required={metodoPago === 'tarjeta'}
      maxLength={5}
    />

    <label htmlFor="cvv">CVV:</label>
    <input
      type="password"
      id="cvv"
      name="cvv"
      value={tarjeta.cvv}
      onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value })}
      placeholder="123"
      required={metodoPago === 'tarjeta'}
      maxLength={3}
    />

    <label htmlFor="titular">Nombre del Titular:</label>
    <input
      type="text"
      id="titular"
      name="titular"
      value={tarjeta.titular}
      onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })}
      placeholder="Nombre Apellido"
      required={metodoPago === 'tarjeta'}
    />
  </>
)}

{metodoPago === 'efectivo' && (
  
  <>
  <h1>Pago en Efectivo</h1>
    <label htmlFor="efectivo_recibido">Efectivo Recibido (Q):</label>
    <input
      type="number"
      id="efectivo_recibido"
      name="efectivo_recibido"
      value={efectivoRecibido}
      onChange={(e) => setEfectivoRecibido(parseFloat(e.target.value) || 0)}
      required={metodoPago === 'efectivo'}
      min={precioUnitario}
    />

    <label htmlFor="cambio">Cambio (Q):</label>
    <input
      type="number"
      id="cambio"
      value={cambio >= 0 ? cambio : 0}
      disabled
    />
  </>
)}


        <div className={styles.buttonContainer}>
          <button type="submit" disabled={loading}>
            {loading ? 'Comprando...' : 'Comprar'}
          </button>
        </div>
      </form>
    </div>
    </LayoutWithSidebar>
  );
}