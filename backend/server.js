require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { z } = require('zod');
const crypto = require('crypto');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Configurar Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

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
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
