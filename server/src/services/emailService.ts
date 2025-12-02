import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'info.fitnesspractica@gmail.com',
    pass: process.env.EMAIL_PASSWORD, // App password from Gmail
  },
});

/**
 * Send welcome email to newly registered user
 */
export const sendWelcomeEmail = async (userEmail: string, userName: string): Promise<void> => {
  try {
    const mailOptions = {
      from: {
        name: 'Fitness Practica',
        address: process.env.EMAIL_USER || 'info.fitnesspractica@gmail.com',
      },
      to: userEmail,
      subject: 'Mirë se vini në Fitness Practica! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .message {
              margin-bottom: 20px;
            }
            .features {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .features ul {
              list-style: none;
              padding: 0;
            }
            .features li {
              padding: 8px 0;
              padding-left: 25px;
              position: relative;
            }
            .features li:before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #ff6b35;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 14px;
            }
            .signature {
              margin-top: 30px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏋️ Fitness Practica</h1>
          </div>
          <div class="content">
            <div class="greeting">
              <strong>I nderuar/e nderuar ${userName},</strong>
            </div>
            
            <div class="message">
              <p><strong>Mirë se vini!</strong> Regjistrimi juaj u krye me sukses dhe ju jeni futur në llogarinë tuaj për herë të parë.</p>
              
              <p>Jemi të lumtur t'ju kemi pjesë të komunitetit tonë dhe ju urojmë një eksperiencë sa më të mirë në përdorimin e platformës.</p>
            </div>
            
            <div class="features">
              <p><strong>Tani mund të:</strong></p>
              <ul>
                <li>Shfletoni funksionet e llogarisë suaj</li>
                <li>Personalizoni profilin</li>
                <li>Filloni të përdorni shërbimet tona</li>
              </ul>
            </div>
            
            <div class="message">
              <p>Nëse keni ndonjë pyetje ose nevojë për ndihmë, ekipi ynë është gjithmonë i gatshëm t'ju asistojë: <a href="mailto:info.fitnesspractica@gmail.com">info.fitnesspractica@gmail.com</a></p>
              
              <p><strong>Faleminderit që u bashkuat me ne!</strong></p>
            </div>
            
            <div class="signature">
              <p>Me respekt,<br>
              <strong>Fitness Practica</strong></p>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Fitness Practica. Të gjitha të drejtat e rezervuara.</p>
          </div>
        </body>
        </html>
      `,
      text: `
I nderuar/e nderuar ${userName},

Mirë se vini! Regjistrimi juaj u krye me sukses dhe ju jeni futur në llogarinë tuaj për herë të parë.

Jemi të lumtur t'ju kemi pjesë të komunitetit tonë dhe ju urojmë një eksperiencë sa më të mirë në përdorimin e platformës.

Tani mund të:
• Shfletoni funksionet e llogarisë suaj
• Personalizoni profilin
• Filloni të përdorni shërbimet tona

Nëse keni ndonjë pyetje ose nevojë për ndihmë, ekipi ynë është gjithmonë i gatshëm t'ju asistojë: info.fitnesspractica@gmail.com

Faleminderit që u bashkuat me ne!

Me respekt,
Fitness Practica
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${userEmail}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error - we don't want signup to fail if email fails
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};
