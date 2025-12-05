import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'info.fitnesspractica@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmailChangeNotice = async (userEmail: string, userName?: string): Promise<void> => {
  try {
    const mailOptions = {
      from: {
        name: 'Fitness Practica',
        address: process.env.EMAIL_USER || 'info.fitnesspractica@gmail.com',
      },
      to: userEmail,
      subject: 'Adresa juaj e email-it u përditësua',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Fitness Practica</h2>
          </div>
          <div class="content">
            <p>Përshëndetje${userName ? `, ${userName}` : ''},</p>
            <p>Ky është një njoftim automatik për t’ju informuar se adresa juaj e email-it është përditësuar me sukses.</p>
            <p>Nga tani e tutje, të gjitha njoftimet dhe komunikimet tona do t’i merrni në adresën tuaj të re të email-it.</p>
            <p>Nëse nuk e keni bërë ju këtë ndryshim, ju lutemi kontaktoni menjëherë ekipin e mbështetjes për të siguruar llogarinë tuaj.</p>
            <p>Faleminderit!<br/>Fitness Practica</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Fitness Practica. Të gjitha të drejtat e rezervuara.</p>
          </div>
        </body>
        </html>
      `,
      text: `Pershendetje${userName ? `, ${userName}` : ''},\n\nAdresa juaj e email-it u përditësua me sukses.\nNëse nuk e keni bërë ju këtë ndryshim, ju lutemi kontaktoni menjëherë ekipin e mbështetjes.\n\nFaleminderit,\nFitness Practica`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email change notice sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending email change notice:', error);
  }
};