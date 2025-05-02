import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { correo_electronico, numero } = body;

    if (!correo_electronico || !numero) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Parque Oriente Mágico" <${process.env.EMAIL_USER}>`,
      to: correo_electronico,
      subject: "🎟️ Tu número de visitante",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>¡Bienvenido a Oriente Mágico!</h2>
          <p>Tu número de visitante asignado es:</p>
          <div style="font-size: 32px; font-weight: bold; background-color: #f0f0f0; padding: 10px; border-radius: 10px; display: inline-block;">
            ${numero}
          </div>
          <p>¡Te deseamos un excelente día en el parque!</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ ok: true, message: 'Correo enviado con éxito' });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return NextResponse.json({ ok: false, error: 'Error al enviar correo' }, { status: 500 });
  }
}
