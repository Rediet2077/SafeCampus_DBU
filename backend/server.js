const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Correct Gmail + App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'redietsharew231@gmail.com',
    pass: 'tnprfcmckdnhbsfu'
  }
});

// Verify on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Failed:', error.message);
  } else {
    console.log('✅ SMTP Ready! Emails will send from redietsharew231@gmail.com');
  }
});

app.post('/send-otp', async (req, res) => {
  const { toEmail, otpCode, userName } = req.body;
  console.log(`📧 Sending OTP ${otpCode} to ${toEmail}...`);

  const mailOptions = {
    from: '"SafeCampus DBU" <redietsharew231@gmail.com>',
    to: toEmail,
    subject: '🛡️ SafeCampus Verification Code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#111;border-radius:20px;color:white;">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="color:#dc2626;margin:0;">SafeCampus</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:3px;">Debre Berhan University</p>
        </div>
        <p style="color:#ccc;">Hello <strong>${userName || 'Student'}</strong>,</p>
        <p style="color:#ccc;">Your security verification code is:</p>
        <div style="background:#1a1a1a;padding:20px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:10px;border-radius:12px;margin:20px 0;border:1px solid #333;color:#dc2626;">
          ${otpCode}
        </div>
        <p style="color:#888;font-size:12px;text-align:center;">This code expires in 10 minutes. Do not share it.</p>
        <hr style="border:none;border-top:1px solid #333;margin:20px 0;" />
        <p style="color:#555;font-size:10px;text-align:center;">SafeCampus Security System &bull; DBU &copy; 2024</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${toEmail} — ID: ${info.messageId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/send-individual-alert', async (req, res) => {
  const { toEmail, message, userName } = req.body;
  console.log(`📧 Sending individual alert to ${toEmail}...`);

  const mailOptions = {
    from: '"SafeCampus Security" <redietsharew231@gmail.com>',
    to: toEmail,
    subject: '🛡️ SECURITY ALERT: Direct Notification',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#111;border-radius:20px;color:white;border:1px solid #333;">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="color:#dc2626;margin:0;">SafeCampus</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:3px;">Individual Security Dispatch</p>
        </div>
        <p style="color:#ccc;">Hello <strong>${userName || 'Student'}</strong>,</p>
        <p style="color:#ccc;">The Campus Security Admin has sent you a direct message:</p>
        <div style="background:#1a1a1a;padding:20px;border-radius:12px;margin:20px 0;border-left:4px solid #dc2626;color:#fff;font-size:16px;">
          ${message}
        </div>
        <p style="color:#888;font-size:12px;text-align:center;">Please follow all security protocols immediately.</p>
        <hr style="border:none;border-top:1px solid #333;margin:20px 0;" />
        <p style="color:#555;font-size:10px;text-align:center;">SafeCampus Security System &bull; DBU &copy; 2024</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Individual alert sent to ${toEmail} — ID: ${info.messageId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Individual alert error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/broadcast-alert', async (req, res) => {
  const { emails, message } = req.body;
  if (!emails || emails.length === 0) return res.status(400).json({ error: "No recipients" });
  
  console.log(`📢 Broadcasting alert to ${emails.length} users...`);

  const mailOptions = {
    from: '"SafeCampus Security" <redietsharew231@gmail.com>',
    bcc: emails, // Use BCC for bulk mail to hide other emails
    subject: '🚨 CRITICAL CAMPUS SAFETY ALERT',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#000;border:2px solid #dc2626;border-radius:24px;color:white;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="display:inline-block;padding:15px;background:#dc2626;border-radius:15px;font-size:30px;margin-bottom:15px;">🚨</div>
          <h1 style="color:#dc2626;margin:0;font-size:28px;text-transform:uppercase;letter-spacing:2px;">Emergency Broadcast</h1>
          <p style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:4px;margin-top:5px;">Debre Berhan University</p>
        </div>
        
        <div style="background:#111;padding:30px;border-radius:15px;border:1px solid #333;margin-bottom:30px;">
          <p style="color:#eee;font-size:16px;line-height:1.6;margin:0;">
            ${message}
          </p>
        </div>

        <div style="text-align:center;">
          <p style="color:#888;font-size:11px;margin-bottom:10px;">Sent by Authorized Security Personnel</p>
          <div style="display:inline-block;height:1px;width:100px;background:#333;"></div>
          <p style="color:#555;font-size:10px;margin-top:10px;">This is a system-generated emergency notification. Please do not reply.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Broadcast sent! — ID: ${info.messageId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Broadcast error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 SafeCampus Email Server on http://localhost:${PORT}`);
});
