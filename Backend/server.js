require('dotenv').config();
const express = require('express');
const { DataTypes } = require('sequelize');
const Report = require('./models/Reports');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const sequelize = require('./db');
const Organization = require('./models/Organization');
const User = require('./models/User');
const Ledger = require('./models/Ledger');
const Transaction = require('./models/Transaction');
const authenticate = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in environment. The server will not start.');
  process.exit(1);
}

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 1000 * 60,
  max: 120,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

const ensureLegacySchemaCompatibility = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const ledgerColumns = await queryInterface.describeTable('Ledgers');

    if (!ledgerColumns.isFinalized) {
      await queryInterface.addColumn('Ledgers', 'isFinalized', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('Added missing Ledgers.isFinalized column for legacy database compatibility');
    }
  } catch (err) {
    console.error('Failed to verify legacy schema compatibility:', err);
    throw err;
  }
};

const findLedgerForOrganization = (ledgerId, organizationId, options = {}) =>
  Ledger.findOne({ where: { id: ledgerId, organizationId }, ...options });

const parseTransactionAmount = (amount) => {
  const parsedAmount = Number(amount);
  return Number.isFinite(parsedAmount) ? parsedAmount : null;
};

// base
app.get('/', (req, res) => res.json({ message: 'Ledgerbook backend is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth
app.post('/auth/register', async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password?.trim();
    const organisation = req.body?.organisation?.replace(/\s+/g, ' ').trim();

    if (!email || !password || !organisation) {
      return res.status(400).json({ error: 'email, password and organisation are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);

    const { organization, user } = await sequelize.transaction(async (transaction) => {
      const [tenantOrganization] = await Organization.findOrCreate({
        where: { name: organisation },
        defaults: { name: organisation },
        transaction,
      });

      const createdUser = await User.create(
        { email, passwordHash, organizationId: tenantOrganization.id },
        { transaction }
      );

      return { organization: tenantOrganization, user: createdUser };
    });

    const token = jwt.sign({ userId: user.id, organizationId: organization.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          organizationId: organization.id,
          organizationName: organization.name,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.findAll({
        attributes: ['id', 'email', 'createdAt', 'organizationId'],
        include: [{ model: Organization, attributes: ['id', 'name'] }],
    });
    res.json({ data: users });
  } catch (err) {
    console.error('Admin users error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password?.trim();
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const organization = user.organizationId ? await Organization.findByPk(user.organizationId) : null;
    const token = jwt.sign({ userId: user.id, organizationId: user.organizationId }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          organizationName: organization?.name || null,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/me', authenticate, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  res.json({
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        organizationId: req.organizationId,
        organizationName: req.organization?.name || null,
      },
    },
  });
});

// ====================== REPORT ROUTES ======================
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.findAll({ order: [["createdAt", "DESC"]] });
    res.json({ data: reports });
  } catch (err) {
    console.error("GET /api/reports error", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const { name, date, file } = req.body;
    if (!name || !date || !file) return res.status(400).json({ error: "name, date, and file are required" });

    const report = await Report.create({ name, date, file });
    res.status(201).json({ data: report });
  } catch (err) {
    console.error("POST /api/reports error", err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

app.delete("/api/reports/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    await report.destroy();
    res.json({ data: { message: "Report deleted", id } });
  } catch (err) {
    console.error("DELETE /api/reports/:id error", err);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// ====================== LEDGER ROUTES ======================
app.use('/api/ledgers', authenticate);

app.get('/api/ledgers', async (req, res) => {
  try {
    const ledgers = await Ledger.findAll({ where: { organizationId: req.organizationId }, include: [Transaction] });
    res.json({ data: ledgers });
  } catch (e) {
    console.error('GET /api/ledgers error', e);
    res.status(500).json({ error: 'Could not fetch ledgers' });
  }
});

app.post('/api/ledgers', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const orgId = req.organizationId || req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: 'OrganizationId missing for ledger creation' });

    const ledger = await Ledger.create({ name, description, UserId: req.user.id, organizationId: orgId });
    res.status(201).json({ data: ledger });
  } catch (e) {
    console.error('POST /api/ledgers error', e);
    res.status(500).json({ error: 'Could not create ledger' });
  }
});

app.get('/api/ledgers/:ledgerId', async (req, res) => {
  try {
    const id = Number(req.params.ledgerId);
    const ledger = await findLedgerForOrganization(id, req.organizationId, { include: [Transaction] });
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    res.json({ data: ledger });
  } catch (e) {
    console.error('GET /api/ledgers/:ledgerId error', e);
    res.status(500).json({ error: 'Could not fetch ledger' });
  }
});

app.put('/api/ledgers/:ledgerId', async (req, res) => {
  try {
    const id = Number(req.params.ledgerId);
    const ledger = await findLedgerForOrganization(id, req.organizationId);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const { name, description, isFinalized } = req.body;
    const isTryingToUnlock = isFinalized !== undefined && Boolean(isFinalized) !== ledger.isFinalized;
    const isTryingToEditMetadata = name !== undefined || description !== undefined;

    if (ledger.isFinalized && (isTryingToUnlock || isTryingToEditMetadata)) {
      return res.status(403).json({ error: 'Finalized ledgers are read-only' });
    }

    if (name !== undefined) ledger.name = name;
    if (description !== undefined) ledger.description = description;
    if (isFinalized !== undefined) ledger.isFinalized = Boolean(isFinalized);
    await ledger.save();

    res.json({ data: ledger });
  } catch (e) {
    console.error('PUT /api/ledgers/:ledgerId error', e);
    res.status(500).json({ error: 'Could not update ledger' });
  }
});

app.delete('/api/ledgers/:ledgerId', async (req, res) => {
  try {
    const id = Number(req.params.ledgerId);
    const ledger = await findLedgerForOrganization(id, req.organizationId);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    if (ledger.isFinalized) return res.status(403).json({ error: 'Finalized ledgers are read-only' });

    await ledger.destroy();
    res.json({ data: { message: 'Ledger deleted', id } });
  } catch (e) {
    console.error('DELETE /api/ledgers/:ledgerId error', e);
    res.status(500).json({ error: 'Could not delete ledger' });
  }
});

// ====================== TRANSACTION ROUTES ======================
app.get('/api/ledgers/:ledgerId/transactions', async (req, res) => {
  try {
    const id = Number(req.params.ledgerId);
    const ledger = await findLedgerForOrganization(id, req.organizationId, { include: [Transaction] });
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    res.json({ data: ledger.Transactions });
  } catch (e) {
    console.error('GET /api/ledgers/:ledgerId/transactions error', e);
    res.status(500).json({ error: 'Could not fetch transactions' });
  }
});

app.post('/api/ledgers/:ledgerId/transactions', async (req, res) => {
  try {
    const ledgerId = Number(req.params.ledgerId);
    const ledger = await findLedgerForOrganization(ledgerId, req.organizationId);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    if (ledger.isFinalized) return res.status(403).json({ error: 'Finalized ledgers are read-only' });

    const { description, amount, date, payment_method, category, transaction_type } = req.body;
    if (!description || amount === undefined || !date) {
      return res.status(400).json({ error: 'description, amount, and date are required' });
    }

    const parsedAmount = parseTransactionAmount(amount);
    if (parsedAmount === null || parsedAmount < 0) {
      return res.status(400).json({ error: 'amount must be a valid non-negative number' });
    }

    const transaction = await Transaction.create({
      description,
      amount: parsedAmount,
      date,
      LedgerId: ledger.id,
      payment_method: payment_method || "cash",
      category: category || "",
      transaction_type: transaction_type || "",
    });
    res.status(201).json({ data: transaction });
  } catch (e) {
    console.error('POST /api/ledgers/:ledgerId/transactions error', e);
    res.status(500).json({ error: 'Could not create transaction' });
  }
});

app.put('/api/ledgers/:ledgerId/transactions/:transactionId', async (req, res) => {
  try {
    const ledgerId = Number(req.params.ledgerId);
    const txId = Number(req.params.transactionId);

    const ledger = await findLedgerForOrganization(ledgerId, req.organizationId);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    if (ledger.isFinalized) return res.status(403).json({ error: 'Finalized ledgers are read-only' });

    const transaction = await Transaction.findOne({ where: { id: txId, LedgerId: ledger.id } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const { description, amount, date, payment_method, category, transaction_type } = req.body;
    if (description !== undefined) transaction.description = description;
    if (amount !== undefined) {
      const parsedAmount = parseTransactionAmount(amount);
      if (parsedAmount === null || parsedAmount < 0) {
        return res.status(400).json({ error: 'amount must be a valid non-negative number' });
      }
      transaction.amount = parsedAmount;
    }
    if (date !== undefined) transaction.date = date;
    if (payment_method !== undefined) transaction.payment_method = payment_method;
    if (category !== undefined) transaction.category = category;
    if (transaction_type !== undefined) transaction.transaction_type = transaction_type;
    await transaction.save();

    res.json({ data: transaction });
  } catch (e) {
    console.error('PUT /api/ledgers/:ledgerId/transactions/:transactionId error', e);
    res.status(500).json({ error: 'Could not update transaction' });
  }
});

app.delete('/api/ledgers/:ledgerId/transactions/:transactionId', async (req, res) => {
  try {
    const ledgerId = Number(req.params.ledgerId);
    const txId = Number(req.params.transactionId);

    const ledger = await findLedgerForOrganization(ledgerId, req.organizationId);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });
    if (ledger.isFinalized) return res.status(403).json({ error: 'Finalized ledgers are read-only' });

    const transaction = await Transaction.findOne({ where: { id: txId, LedgerId: ledger.id } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    await transaction.destroy();
    res.json({ data: { message: 'Transaction deleted', id: txId } });
  } catch (e) {
    console.error('DELETE /api/ledgers/:ledgerId/transactions/:transactionId error', e);
    res.status(500).json({ error: 'Could not delete transaction' });
  }
});

// ====================== DB SYNC & START ======================
const ensureOrganizationIds = async () => {
  const usersWithoutOrg = await User.findAll({ where: { organizationId: null } });
  for (const user of usersWithoutOrg) {
    const orgName = `${user.email.split('@')[0]}-org`;
    const [organization] = await Organization.findOrCreate({
      where: { name: orgName },
      defaults: { name: orgName },
    });
    user.organizationId = organization.id;
    await user.save();
  }
};

(async () => {
  try {
    await sequelize.sync();
    await ensureLegacySchemaCompatibility();
    await ensureOrganizationIds();
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Start failed:', err);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Attempting a schema sync fallback for local development');
      try {
        await sequelize.sync({ alter: true });
        await ensureLegacySchemaCompatibility();
        await ensureOrganizationIds();
        app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
        return;
      } catch (fallbackErr) {
        console.error('Schema sync fallback also failed:', fallbackErr);
      }
    }
    process.exit(1);
  }
})();
