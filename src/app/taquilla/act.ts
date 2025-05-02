'use server'

import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
import nodemailer from 'nodemailer'
import { supabase } from '../login/actions';

export async function comprar(formData: FormData) {
  try {
    // 1. Datos básicos
    const rawIdCliente = formData.get('id_cliente') as string | null
    const id_cliente = rawIdCliente?.trim() || null

    const tipo_ticket = formData.get('tipo_ticket') as string
    const usosPorTipo: Record<string, number | null> = {
      entrada: 1,
      juegos: 20,
      completo: null,
    }
    const usos = usosPorTipo[tipo_ticket] ?? null

    const dpi    = formData.get('dpi') as string
    const nombre = formData.get('nombre_completo') as string
    const email  = formData.get('email') as string
    const precio = parseFloat(formData.get('precio') as string)
    const total = parseFloat(formData.get('total') as string)
    const id_metodo_pago = parseInt(formData.get('metodopago') as string, 10)

    // 1.a. Cantidad de tickets
    const cantidad = parseInt(formData.get('cantidad') as string, 10) || 1
// Fecha de compra en hora de Guatemala (UTC-6)
const fecha_compra = new Date(Date.now() - 6 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

    // 4. Generar datos para cada ticket
    const ticketsToInsert: any[] = []
    const attachments: any[] = []
    let emailHtml = `
    <h1>Oriente Mágico 🎡</h1>
    <h2>¡Gracias por tu compra, ${nombre}!</h2>
    <p><strong>Tipo de ticket:</strong> ${tipo_ticket}</p>
    <p><strong>Precio total:</strong> Q${total}</p>
    <p><strong>DPI:</strong> ${dpi}</p>
    <p><strong>Fecha de compra:</strong> ${fecha_compra}</p>
    <p>Presenta este código QR para poder acceder a un Mundo Mágico 🎡:</p>
    <p>¡Te esperamos en Oriente Mágico! 🎢</p>
  `

    for (let i = 1; i <= cantidad; i++) {
      const id_ticket = uuidv4()
      const qrDataUrl = await QRCode.toDataURL(id_ticket)
      const qrBase64 = qrDataUrl.split('base64,')[1]

      // Preparamos el registro para la BD
      ticketsToInsert.push({
        qr: id_ticket,
        qr_imagen_base64: qrBase64,
        precio: precio,
        fecha_compra,
        tipo_ticket,
        estado: 'disponible',
        id_cliente,
        correo_electronico: email,
        id_metodo_pago,
        usos
      })

      // Adjuntos y HTML para el correo
      const cid = `qrimage${i}`
      attachments.push({
        filename: `qr_${i}.png`,
        content: qrBase64,
        encoding: 'base64',
        cid
      })
      emailHtml += `
        <h3>Ticket ${i}</h3>
        <img src="cid:${cid}" alt="QR Ticket ${i}" width="200" height="200" /><br/>
      `
    }

    // 5. Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    })

    const subject =
  cantidad === 1
    ? `🎟️ Tu ticket para Oriente Mágico`
    : `🎟️ Tus ${cantidad} tickets para Oriente Mágico`;

    // 6. Intentar envío de correo
    try {
      await transporter.sendMail({
        from: `Oriente Mágico 🎡 <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: emailHtml,
        attachments,
      })
    } catch (mailError: any) {
      console.error('❌ Error al enviar correo:', mailError)
      return { success: false, message: 'No se pudo enviar el correo. Verifica que sea válido.' }
    }

    // 7. Insertar todos los tickets en la base de datos
    const { error: dbError } = await supabase
      .from('ticket')
      .insert(ticketsToInsert)

    if (dbError) {
      console.error('❌ Error al insertar en Supabase:', dbError)
      return { success: false, message: 'Error al guardar en la base de datos.' }
    }

    // 8. Devolvemos los QRs generados
    const qrList = ticketsToInsert.map(t => t.qr)
    return { success: true, qrs: qrList }

  } catch (err: any) {
    console.error('❌ Error interno del servidor en comprar():', err)
    return { success: false, message: 'Error interno del servidor.' }
  }
}
