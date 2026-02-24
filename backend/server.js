require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { z } = require('zod');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Configurar Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// Configurar Nodemailer (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.SMTP_USER;

// Função para enviar email de confirmação de pedido ao cliente
async function enviarEmailConfirmacao(pedido) {
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:32px;text-align:center;border-bottom:2px solid #c9960c;">
        <h1 style="margin:0;font-size:22px;color:#e8b824;letter-spacing:2px;text-transform:uppercase;">Dono do Trono</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#e8b824;font-size:18px;margin:0 0 16px;">Pedido Confirmado! 🎉</h2>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 24px;">
          Fala, <strong style="color:#fff;">${pedido.nome}</strong>! Seu pedido foi recebido com sucesso.
          Estamos preparando tudo para despachar o mais rápido possível.
        </p>
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.5px;">Resumo do pedido</p>
          <p style="margin:0 0 4px;font-size:16px;color:#fff;font-weight:bold;">${pedido.produto}</p>
          <p style="margin:0;font-size:20px;color:#e8b824;font-weight:bold;">${pedido.valor}</p>
        </div>
        <p style="margin:0 0 4px;font-size:12px;color:#888;">Número do pedido:</p>
        <p style="margin:0 0 24px;font-size:13px;color:#e8b824;font-family:monospace;">${pedido.orderId}</p>
        <p style="color:#666;font-size:12px;line-height:1.6;margin:0;">
          Você receberá atualizações sobre o envio neste mesmo e-mail.<br>
          Dúvidas? Responda este e-mail ou fale pelo nosso site.
        </p>
      </div>
      <div style="background:#1a1a1a;padding:16px;text-align:center;border-top:1px solid #222;">
        <p style="margin:0;font-size:11px;color:#555;">&copy; 2026 Dono do Trono — Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Dono do Trono" <${process.env.SMTP_USER}>`,
      to: pedido.email,
      subject: `✅ Pedido confirmado — ${pedido.produto}`,
      html,
    });
    console.log(`📧 Email de confirmação enviado para ${pedido.email}`);
  } catch (err) {
    console.error('Erro ao enviar email de confirmação:', err.message);
  }
}

// Função para enviar mensagem de contato para o dono
async function enviarEmailContato({ nome, email, mensagem }) {
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fafafa;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
      <div style="background:#0a0a0a;padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:18px;color:#e8b824;letter-spacing:2px;text-transform:uppercase;">Nova Mensagem — Site</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 8px;"><strong>Nome:</strong> ${nome}</p>
        <p style="margin:0 0 8px;"><strong>E-mail:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin:0 0 8px;"><strong>Mensagem:</strong></p>
        <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6;">
${mensagem}
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Site Dono do Trono" <${process.env.SMTP_USER}>`,
    to: OWNER_EMAIL,
    replyTo: email,
    subject: `📩 Mensagem de ${nome} — Site Dono do Trono`,
    html,
  });
}

// Schema de validação do checkout
const checkoutSchema = z.object({
  productId: z.string(),
  customer: z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("E-mail inválido"),
    phone: z.string().optional(),
  })
});

// Rota para listar produtos
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products WHERE active = 1', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota para criar checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const { productId, customer } = checkoutSchema.parse(req.body);

    // Buscar produto no banco
    db.get('SELECT * FROM products WHERE id = ? AND active = 1', [productId], async (err, product) => {
      if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

      const orderId = crypto.randomUUID();
      const price = product.price_cents / 100; // Converter centavos para reais

      // Criar preferência no Mercado Pago
      const preference = new Preference(client);
      
      const prefResponse = await preference.create({
        body: {
          items: [
            {
              id: product.id,
              title: product.name,
              quantity: 1,
              unit_price: price,
              currency_id: 'BRL',
            }
          ],
          payer: {
            name: customer.name,
            email: customer.email,
          },
          external_reference: orderId,
          back_urls: {
            success: `${process.env.FRONTEND_URL}/obrigado.html`,
            failure: `${process.env.FRONTEND_URL}/`,
            pending: `${process.env.FRONTEND_URL}/`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.BACKEND_URL}/api/webhook`,
        }
      });

      // Salvar pedido no banco
      db.run(
        `INSERT INTO orders (id, product_id, customer_name, customer_email, customer_phone, amount_cents, mp_preference_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, product.id, customer.name, customer.email, customer.phone, product.price_cents, prefResponse.id],
        (err) => {
          if (err) console.error('Erro ao salvar pedido:', err);
        }
      );

      // Retornar a URL de checkout do Mercado Pago
      res.json({ init_point: prefResponse.init_point });
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Dados inválidos ou erro ao criar checkout' });
  }
});

// Webhook do Mercado Pago
app.post('/api/webhook', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'payment') {
    try {
      // Buscar detalhes do pagamento na API do MP
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();

      if (payment.external_reference) {
        const status = payment.status; // 'approved', 'pending', 'rejected', etc.
        db.run(
          'UPDATE orders SET status = ?, mp_payment_id = ? WHERE id = ?',
          [status, payment.id, payment.external_reference]
        );
        console.log(`Pedido ${payment.external_reference} atualizado para ${status}`);

        // Se pagamento aprovado, enviar email de confirmação ao cliente
        if (status === 'approved') {
          db.get('SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = ?',
            [payment.external_reference],
            (err, order) => {
              if (!err && order) {
                enviarEmailConfirmacao({
                  nome: order.customer_name,
                  email: order.customer_email,
                  produto: order.product_name || 'Dono do Trono',
                  valor: `R$ ${(order.amount_cents / 100).toFixed(2).replace('.', ',')}`,
                  orderId: order.id,
                });
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
    }
  }

  res.sendStatus(200);
});

// ============================================================
// ROTA DE CONTATO — recebe mensagem do formulário do site
// ============================================================
const contactSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  mensagem: z.string().min(1, 'Mensagem é obrigatória'),
});

app.post('/api/contact', async (req, res) => {
  try {
    const dados = contactSchema.parse(req.body);
    await enviarEmailContato(dados);
    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar mensagem de contato:', error);
    if (error.issues) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
    }
    res.status(500).json({ error: 'Erro ao enviar mensagem. Tente novamente.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
