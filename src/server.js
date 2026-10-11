const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API mount
app.use('/api/v1', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    title: 'Donation Call-Center & Odoo ERP Integration API',
    author: 'Mohamed Diaa El-Din Samy',
    version: '1.0.0',
    documentation: 'See README.md for complete architectural specification and sequence flows',
    endpoints: {
      health: 'GET /api/v1/health',
      outbox_poll: 'GET /api/v1/outbox/poll?batch_size=50',
      outbox_ack: 'POST /api/v1/outbox/ack',
      inbox_process: 'POST /api/v1/inbox/process',
      deposit_allocate: 'POST /api/v1/deposits/allocate'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Integration Engine] Service active on port ${PORT}`);
  });
}

module.exports = app;
