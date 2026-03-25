import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Notify Shops API
  app.post('/api/notify-shops', async (req, res) => {
    try {
      const { phoneNumbers, partName, carMake, carModel, requestUrl } = req.body;

      if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({ error: 'phoneNumbers array is required' });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;

      if (!accountSid || !authToken) {
        // If Twilio is not configured, just log it and return success (for development)
        console.log('Twilio is not configured. Would have sent notifications to:', phoneNumbers);
        console.log('Message details:', { partName, carMake, carModel });
        return res.json({ status: 'simulated', message: 'Twilio credentials not found, simulated sending.' });
      }

      const client = twilio(accountSid, authToken);
      const results = [];

      for (const phone of phoneNumbers) {
        // Format phone number (assuming Saudi numbers, adding +966 if not present)
        let formattedPhone = phone;
        if (formattedPhone.startsWith('05')) {
          formattedPhone = '+966' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+' + formattedPhone;
        }

        const messageBody = `🔔 طلب جديد في سبيرهب!\nالعميل يبحث عن: ${partName}\nالسيارة: ${carMake} ${carModel}\n\nاضغط هنا لتقديم عرضك: ${requestUrl || 'https://sparehub.com'}`;

        try {
          // Send WhatsApp if configured
          if (twilioWhatsApp) {
            await client.messages.create({
              body: messageBody,
              from: `whatsapp:${twilioWhatsApp}`,
              to: `whatsapp:${formattedPhone}`
            });
            results.push({ phone: formattedPhone, type: 'whatsapp', status: 'success' });
          } 
          // Fallback to SMS if no WhatsApp number but SMS number exists
          else if (twilioPhone) {
            await client.messages.create({
              body: messageBody,
              from: twilioPhone,
              to: formattedPhone
            });
            results.push({ phone: formattedPhone, type: 'sms', status: 'success' });
          }
        } catch (err: any) {
          console.error(`Failed to send to ${formattedPhone}:`, err.message);
          results.push({ phone: formattedPhone, status: 'error', error: err.message });
        }
      }

      res.json({ status: 'success', results });
    } catch (error: any) {
      console.error('Error in /api/notify-shops:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Notify Offer Accepted API
  app.post('/api/notify-offer-accepted', async (req, res) => {
    try {
      const { phoneNumber, partName, requestUrl } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber is required' });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;

      if (!accountSid || !authToken) {
        console.log('Twilio is not configured. Would have sent acceptance notification to:', phoneNumber);
        return res.json({ status: 'simulated', message: 'Twilio credentials not found, simulated sending.' });
      }

      const client = twilio(accountSid, authToken);
      
      let formattedPhone = phoneNumber;
      if (formattedPhone.startsWith('05')) {
        formattedPhone = '+966' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      const messageBody = `🎉 مبروك! وافق العميل على عرضك في سبيرهب.\nالقطعة: ${partName}\n\nاضغط هنا للتواصل مع العميل وإتمام البيع: ${requestUrl || 'https://sparehub.com'}`;

      let result = { phone: formattedPhone, type: '', status: '' };

      try {
        if (twilioWhatsApp) {
          await client.messages.create({
            body: messageBody,
            from: `whatsapp:${twilioWhatsApp}`,
            to: `whatsapp:${formattedPhone}`
          });
          result = { phone: formattedPhone, type: 'whatsapp', status: 'success' };
        } else if (twilioPhone) {
          await client.messages.create({
            body: messageBody,
            from: twilioPhone,
            to: formattedPhone
          });
          result = { phone: formattedPhone, type: 'sms', status: 'success' };
        }
      } catch (err: any) {
        console.error(`Failed to send to ${formattedPhone}:`, err.message);
        result = { phone: formattedPhone, type: 'error', status: err.message };
      }

      res.json({ status: 'success', result });
    } catch (error: any) {
      console.error('Error in /api/notify-offer-accepted:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
