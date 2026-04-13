interface ResetPasswordEmailParams {
  userName: string;
  resetUrl: string;
  locale?: string;
}

export function resetPasswordEmailTemplate({ userName, resetUrl, locale = 'es' }: ResetPasswordEmailParams): { html: string; text: string } {
  const isEnglish = locale === 'en';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 3px solid #2563eb;">
          <h1 style="color: #1e40af; margin: 0; font-size: 24px;">
            ${isEnglish ? 'Family Wealth Tracker' : 'Family Wealth Tracker'}
          </h1>
        </div>

        <!-- Content -->
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">
            ${isEnglish ? 'Password Reset Request' : 'Solicitud de Restablecimiento de Contraseña'}
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isEnglish 
              ? `Hello <strong>${userName}</strong>,` 
              : `Hola <strong>${userName}</strong>,`}
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${isEnglish 
              ? 'We received a request to reset your password. Click the button below to create a new password:' 
              : 'Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña:'}
          </p>

          <!-- Reset Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
              ${isEnglish ? 'Reset Password' : 'Restablecer Contraseña'}
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            ${isEnglish 
              ? 'If the button doesn\'t work, copy and paste the following link into your browser:' 
              : 'Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:'}
          </p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all;">
            ${resetUrl}
          </p>

          <!-- Warning Box -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⏰ ${isEnglish 
                ? '<strong>Important:</strong> This link will expire in 1 hour for security reasons.' 
                : '<strong>Importante:</strong> Este enlace expirará en 1 hora por motivos de seguridad.'}
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            ${isEnglish 
              ? 'If you didn\'t request a password reset, you can safely ignore this email. Your password will remain unchanged.' 
              : 'Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo de forma segura. Tu contraseña permanecerá sin cambios.'}
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">
            ${isEnglish 
              ? 'This email was sent by Family Wealth Tracker.' 
              : 'Este correo fue enviado por Family Wealth Tracker.'}
          </p>
          <p style="margin: 5px 0 0;">
            ${isEnglish 
              ? 'For security reasons, please do not reply to this email.' 
              : 'Por motivos de seguridad, por favor no respondas a este correo.'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    ${isEnglish ? 'Family Wealth Tracker - Password Reset' : 'Family Wealth Tracker - Restablecimiento de Contraseña'}

    ${isEnglish ? `Hello ${userName},` : `Hola ${userName},`}

    ${isEnglish 
      ? 'We received a request to reset your password. Use the link below to create a new password:' 
      : 'Hemos recibido una solicitud para restablecer tu contraseña. Usa el enlace de abajo para crear una nueva contraseña:'}

    ${resetUrl}

    ${isEnglish 
      ? 'Important: This link will expire in 1 hour for security reasons.' 
      : 'Importante: Este enlace expirará en 1 hora por motivos de seguridad.'}

    ${isEnglish 
      ? 'If you didn\'t request a password reset, you can safely ignore this email. Your password will remain unchanged.' 
      : 'Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo de forma segura. Tu contraseña permanecerá sin cambios.'}

    ${isEnglish 
      ? 'This email was sent by Family Wealth Tracker.' 
      : 'Este correo fue enviado por Family Wealth Tracker.'}
  `;

  return { html, text };
}