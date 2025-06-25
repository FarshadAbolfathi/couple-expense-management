const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = 4000;


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const SECRET_KEY = 'your_secret_key';

// Serve frontend files
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Helper function to convert Arabic/Western numerals to Persian numerals
function toPersianNumerals(str) {
  if (typeof str !== 'string') str = String(str);
  const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianNumerals[+w]);
}

// Helper function to get current date in YYYY-MM-DD Persian numerals
function getCurrentJalaliDate() {
  const today = new Date();
  const year = today.toLocaleDateString('fa-IR-u-nu-latn', { year: 'numeric' }).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const month = today.toLocaleDateString('fa-IR-u-nu-latn', { month: '2-digit' }).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const day = today.toLocaleDateString('fa-IR-u-nu-latn', { day: '2-digit' }).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  // Ensure correct Persian numerals are used by converting back from Latin if necessary
  // The toLocaleDateString with fa-IR might give Latin numerals depending on system, so we ensure conversion.
  return `${toPersianNumerals(year)}-${toPersianNumerals(month)}-${toPersianNumerals(day)}`;
}


// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    monthlyBudget INTEGER NOT NULL,
    currentSpending INTEGER DEFAULT 0,
    spouseId INTEGER,
    currentBudgetPeriodStartDate TEXT,
    avatarUrl TEXT,
    FOREIGN KEY(spouseId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    userType TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Register user
app.post('/api/register', (req, res) => {
  const { name, email, password, monthlyBudget } = req.body;
  if (!name || !email || !password || !monthlyBudget) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const budgetStartDate = getCurrentJalaliDate();
  const sql = `INSERT INTO users (name, email, password, monthlyBudget, currentBudgetPeriodStartDate) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [name, email, hashedPassword, monthlyBudget, budgetStartDate], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'ایمیل قبلا ثبت شده است' });
      }
      console.error("Error registering user:", err);
      return res.status(500).json({ error: 'Database error' });
    }
    const user = {
      id: this.lastID,
      name,
      email,
      monthlyBudget,
      currentSpending: 0,
      spouseId: null,
      currentBudgetPeriodStartDate: budgetStartDate
    };
    const token = jwt.sign(user, SECRET_KEY, { expiresIn: '7d' });
    res.json({ user, token });
  });
});
// Login user
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt with email:', email);
  const sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      console.log('Login failed: user not found for email', email);
      return res.status(400).json({ error: 'ایمیل یا پسورد اشتباه است.' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      console.log('Login failed: password mismatch for email', email);
      return res.status(400).json({ error: 'ایمیل یا پسورد اشتباه است.' });
    }
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      monthlyBudget: user.monthlyBudget,
      currentSpending: user.currentSpending,
      spouseId: user.spouseId,
      currentBudgetPeriodStartDate: user.currentBudgetPeriodStartDate
    };
    const token = jwt.sign(userData, SECRET_KEY, { expiresIn: '7d' });
    res.json({ user: userData, token });
  });
});

// Create spouse account
app.post('/api/spouse', authenticateToken, (req, res) => {
  const { name, email, monthlyBudget, password } = req.body;
  if (!name || !email || !monthlyBudget || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!req.user || !req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // Check if user already has a spouse
  const checkSpouseSql = `SELECT spouseId FROM users WHERE id = ?`;
  db.get(checkSpouseSql, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row && row.spouseId) {
      return res.status(403).json({ error: 'Spouse account already exists' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const budgetStartDate = getCurrentJalaliDate();
    const sqlInsert = `INSERT INTO users (name, email, password, monthlyBudget, spouseId, currentBudgetPeriodStartDate) VALUES (?, ?, ?, ?, ?, ?)`;
    const sqlUpdateSpouse = `UPDATE users SET spouseId = ? WHERE id = ?`;

    db.serialize(() => {
      db.run(sqlInsert, [name, email, hashedPassword, monthlyBudget, req.user.id, budgetStartDate], function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'ایمیل قبلا ثبت شده است' });
          }
          console.error("Error creating spouse:", err);
          return res.status(500).json({ error: 'Database error' });
        }
        const newSpouseId = this.lastID; // Renamed for clarity
        db.run(sqlUpdateSpouse, [newSpouseId, req.user.id], (err2) => {
          if (err2) return res.status(500).json({ error: 'Database error' });
          res.json({
            id: newSpouseId,
            name,
            email,
            monthlyBudget,
            currentSpending: 0,
            spouseId: req.user.id,
            currentBudgetPeriodStartDate: budgetStartDate
          });
        });
      });
    });
  });
});



// Get current user and spouse info
app.get('/api/user', authenticateToken, (req, res) => {
  const sql = `SELECT * FROM users WHERE id = ?`;
  db.get(sql, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sqlSpouse = `SELECT * FROM users WHERE id = ?`;
    if (!user.spouseId) {
      return res.json({ user, spouse: null });
    }
    db.get(sqlSpouse, [user.spouseId], (err2, spouse) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({ user, spouse });
    });
  });
});

// Add expense
app.post('/api/expenses', authenticateToken, (req, res) => {
  console.log('Received /api/expenses POST request body:', req.body);
  const { title, amount, category, date, user: userType } = req.body;
  if (!title || !amount || !category || !date || !userType) {
    console.log('Missing required fields in /api/expenses:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Determine userId based on userType
  const getUserId = () => {
    if (userType === 'خود') return req.user.id;
    if (userType === 'همسر') return req.user.spouseId;
    if (userType === 'مشترک') return req.user.id; // Shared expenses assigned to current user
    return null;
  };
  const userId = getUserId();
  if (!userId) {
    console.log('Invalid user type or spouse not set in /api/expenses:', userType, req.user);
    return res.status(403).json({ error: 'Invalid user type or spouse not set' });
  }

  const sql = `INSERT INTO expenses (userId, title, amount, category, date, userType) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [userId, title, amount, category, date, userType], function (err) {
    if (err) {
      console.error('Database error inserting expense:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Update currentSpending for the user
    const updateSpendingSql = `UPDATE users SET currentSpending = currentSpending + ? WHERE id = ?`;
    db.run(updateSpendingSql, [amount, userId], (err2) => {
      if (err2) {
        console.error('Database error updating currentSpending:', err2);
        return res.status(500).json({ error: 'Database error' });
      }

      const newExpense = {
        id: this.lastID,
        userId,
        title,
        amount,
        category,
        date,
        userType,
      };
      console.log('Expense added successfully:', newExpense);
      res.json(newExpense);
    });
  });
});

// Get expenses for current user and spouse
app.get('/api/expenses', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const spouseId = req.user.spouseId;

  const { year, month } = req.query;

  let sql = `
    SELECT * FROM expenses WHERE userId = ? 
    UNION ALL 
    SELECT * FROM expenses WHERE userId = ?
  `;

  let params;

  if (year && month) {
    sql = `
      SELECT * FROM expenses WHERE userId = ? AND SUBSTR(date, 1, 4) = ? AND SUBSTR(date, 6, 2) = ?
      UNION ALL
      SELECT * FROM expenses WHERE userId = ? AND SUBSTR(date, 1, 4) = ? AND SUBSTR(date, 6, 2) = ?
    `;
    const paddedMonth = month.padStart ? month.padStart(2, '0') : month;
    const persianYear = toPersianNumerals(year);
    const persianMonth = toPersianNumerals(paddedMonth);
    params = [userId, persianYear, persianMonth, spouseId || 0, persianYear, persianMonth];
  } else {
    // This is the original query and params when no year/month filter is applied
    sql = `
    SELECT * FROM expenses WHERE userId = ?
    UNION ALL
    SELECT * FROM expenses WHERE userId = ?
  `;
    params = [userId, spouseId || 0];
  }

  sql += ' ORDER BY id DESC';

  console.log('DEBUG: SQL Query for GET /api/expenses:', sql);
  console.log('DEBUG: Parameters for GET /api/expenses:', params);
  console.log('DEBUG: Parameter count:', params.length);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('DEBUG: Database error in GET /api/expenses:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(rows);
  });
});

// Delete expense
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const expenseId = req.params.id;
  const userId = req.user.id;
  const spouseId = req.user.spouseId;

  // Check if expense belongs to user or spouse
  const checkSql = `SELECT * FROM expenses WHERE id = ? AND (userId = ? OR userId = ?)`;
  db.get(checkSql, [expenseId, userId, spouseId || 0], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Expense not found or unauthorized' });

    const deleteSql = `DELETE FROM expenses WHERE id = ?`;
    db.run(deleteSql, [expenseId], function (err2) {
      if (err2) return res.status(500).json({ error: 'Database error' });

      // Update currentSpending for the user by subtracting the deleted amount, ensuring it doesn't go below 0
      const updateSpendingSql = `UPDATE users SET currentSpending = MAX(0, currentSpending - ?) WHERE id = ?`;
      db.run(updateSpendingSql, [row.amount, row.userId], (err3) => {
        if (err3) {
          console.error('Database error updating currentSpending:', err3);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Expense deleted successfully' });
      });
    });
  });
});

// Update expense
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const expenseId = req.params.id;
  const loggedInUserId = req.user.id;
  const loggedInSpouseId = req.user.spouseId;
  const { title, amount: newAmountStr, category, date, user: userType } = req.body;

  if (!title || typeof newAmountStr === 'undefined' || !category || !date || !userType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newAmount = parseInt(newAmountStr, 10);
  if (isNaN(newAmount) || newAmount < 0) { // Allow 0 amount if needed, but typically expenses are > 0
    return res.status(400).json({ error: 'Invalid amount format or value' });
  }

  const getNewActualUserId = () => {
    if (userType === 'خود') return loggedInUserId;
    if (userType === 'همسر') return loggedInSpouseId;
    // if (userType === 'مشترک') return loggedInUserId; // Define behavior for 'مشترک' if it's a valid distinct case
    return null;
  };
  const newActualUserId = getNewActualUserId();

  if (!newActualUserId) {
    return res.status(400).json({ error: 'Invalid user type or spouse not set for assignment' });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;", (errBegin) => {
      if (errBegin) return res.status(500).json({ error: "Failed to begin transaction" });

      db.get("SELECT * FROM expenses WHERE id = ?", [expenseId], (errGet, originalExpense) => {
        if (errGet) {
          db.run("ROLLBACK;");
          return res.status(500).json({ error: "Database error fetching original expense" });
        }
        if (!originalExpense) {
          db.run("ROLLBACK;");
          return res.status(404).json({ error: "Expense not found" });
        }

        // Authorization check
        if (originalExpense.userId !== loggedInUserId && originalExpense.userId !== loggedInSpouseId) {
          db.run("ROLLBACK;");
          return res.status(403).json({ error: "Unauthorized to update this expense" });
        }

        const oldAmount = originalExpense.amount;
        const oldUserId = originalExpense.userId;

        // 1. Decrement old amount from old user's spending
        db.run("UPDATE users SET currentSpending = MAX(0, currentSpending - ?) WHERE id = ?", [oldAmount, oldUserId], (errDec) => {
          if (errDec) {
            db.run("ROLLBACK;");
            return res.status(500).json({ error: "Database error decrementing old spending" });
          }

          // 2. Increment new amount to new user's spending
          db.run("UPDATE users SET currentSpending = currentSpending + ? WHERE id = ?", [newAmount, newActualUserId], (errInc) => {
            if (errInc) {
              db.run("ROLLBACK;");
              return res.status(500).json({ error: "Database error incrementing new spending" });
            }

            // 3. Update the expense itself
            const updateExpenseSql = "UPDATE expenses SET userId = ?, title = ?, amount = ?, category = ?, date = ?, userType = ? WHERE id = ?";
            db.run(updateExpenseSql, [newActualUserId, title, newAmount, category, date, userType, expenseId], function (errUpdate) {
              if (errUpdate) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: "Database error updating expense details" });
              }

              db.run("COMMIT;", (errCommit) => {
                if (errCommit) {
                  // Attempt rollback on commit failure, though data might be inconsistent
                  db.run("ROLLBACK;");
                  return res.status(500).json({ error: "Failed to commit transaction" });
                }
                res.json({
                  id: parseInt(expenseId),
                  userId: newActualUserId,
                  title,
                  amount: newAmount,
                  category,
                  date,
                  userType,
                });
              });
            });
          });
        });
      });
    });
  });
});

// Close month and set new budget
app.post('/api/budget/close-month', authenticateToken, (req, res) => {
  const { newMonthlyBudget } = req.body;
  const userId = req.user.id;
  const spouseId = req.user.spouseId; // Get spouseId from the authenticated user's token data

  if (typeof newMonthlyBudget === 'undefined' || newMonthlyBudget === null || isNaN(newMonthlyBudget) || newMonthlyBudget < 0) {
    return res.status(400).json({ error: 'Valid new monthly budget is required and must be a non-negative number.' });
  }

  const budgetStartDate = getCurrentJalaliDate();
  db.serialize(() => {
    // Update current user's budget, reset spending, and set new budget period start date
    const updateUserSql = `UPDATE users SET monthlyBudget = ?, currentSpending = 0, currentBudgetPeriodStartDate = ? WHERE id = ?`;
    db.run(updateUserSql, [newMonthlyBudget, budgetStartDate, userId], function (err) {
      if (err) {
        console.error('Error updating user budget:', err);
        return res.status(500).json({ error: 'Database error updating user budget' });
      }
      console.log(`User ${userId} budget updated to ${newMonthlyBudget}, spending reset, budget start date ${budgetStartDate}.`);

      // If spouse exists, update their budget, reset spending, and set new budget period start date
      if (spouseId) {
        const updateSpouseSql = `UPDATE users SET monthlyBudget = ?, currentSpending = 0, currentBudgetPeriodStartDate = ? WHERE id = ?`;
        db.run(updateSpouseSql, [newMonthlyBudget, budgetStartDate, spouseId], function (errSpouse) {
          if (errSpouse) {
            console.error('Error updating spouse budget:', errSpouse);
            return res.status(500).json({ error: 'Database error updating spouse budget' });
          }
          console.log(`Spouse ${spouseId} budget updated to ${newMonthlyBudget}, spending reset, budget start date ${budgetStartDate}.`);
          res.json({ message: 'Month closed successfully. Budget updated, spending reset, and new period start date set for user and spouse.' });
        });
      } else {
        res.json({ message: 'Month closed successfully. Budget updated, spending reset, and new period start date set for user.' });
      }
    });
  });
});

// Forgot password (simulate)
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  // Simulate sending email
  console.log(`Password reset requested for email: ${email}`);
  res.json({ message: 'Password reset email sent (simulated)' });
});

// Update user's monthly budget
app.put('/api/user/budget', authenticateToken, (req, res) => {
  const { monthlyBudget } = req.body;
  const userId = req.user.id;

  if (typeof monthlyBudget === 'undefined' || monthlyBudget === null || monthlyBudget < 0) {
    return res.status(400).json({ error: 'Valid monthly budget is required' });
  }

  const sql = `UPDATE users SET monthlyBudget = ? WHERE id = ?`;
  db.run(sql, [monthlyBudget, userId], function (err) {
    if (err) {
      console.error('Error updating user budget:', err);
      return res.status(500).json({ error: 'Database error updating budget' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found or budget not changed' });
    }
    res.json({ message: 'Budget updated successfully' });
  });
});

// Update user's password
app.put('/api/user/password', authenticateToken, (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const sql = `UPDATE users SET password = ? WHERE id = ?`;

  db.run(sql, [hashedPassword, userId], function (err) {
    if (err) {
      console.error('Error updating user password:', err);
      return res.status(500).json({ error: 'Database error updating password' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  });
});

// Update user's profile name
app.put('/api/user/profile', authenticateToken, (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Valid name is required' });
  }

  const sql = `UPDATE users SET name = ? WHERE id = ?`;
  db.run(sql, [name.trim(), userId], function (err) {
    if (err) {
      console.error('Error updating user name:', err);
      return res.status(500).json({ error: 'Database error updating name' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found or name not changed' });
    }
    res.json({ message: 'Name updated successfully' });
  });
});


app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  const sql = `UPDATE users SET avatarUrl = ? WHERE id = ?`;
  db.run(sql, [avatarUrl, req.user.id], function (err) {
    if (err) {
      console.error('Error updating avatar URL:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Avatar uploaded successfully', avatarUrl });
  });
});


app.get('/api/admin/user-password/:id', authenticateToken, (req, res) => {
  if (req.user.email !== 'farshad.code@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userId = req.params.id;
  const sql = `SELECT password FROM users WHERE id = ?`;
  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error('Error fetching user password:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ password: row.password });
  });
});

// Change Password Users
app.put('/api/admin/user-password/:id', authenticateToken, (req, res) => {
  if (req.user.email !== 'farshad.code@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userId = req.params.id;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const sql = `UPDATE users SET password = ? WHERE id = ?`;
  db.run(sql, [hashedPassword, userId], function (err) {
    if (err) {
      console.error('Error updating user password:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  });
});

// Get Users List
app.get('/api/admin/users', authenticateToken, (req, res) => {
  // فقط کاربر با ایمیل مشخص شده اجازه دسترسی دارد
  if (req.user.email !== 'farshad.code@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const sql = `SELECT id, name, email, spouseId FROM users`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Delete Users
app.delete('/api/admin/user/:id', authenticateToken, (req, res) => {
  if (req.user.email !== 'farshad.code@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userId = req.params.id;
  const sql = `DELETE FROM users WHERE id = ?`;
  db.run(sql, [userId], function (err) {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// Get Users Hash Password
app.get('/api/admin/user-password/:id', authenticateToken, (req, res) => {
  if (req.user.email !== 'farshad.code@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userId = req.params.id;
  const sql = `SELECT password FROM users WHERE id = ?`;
  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error('Error fetching user password:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    // فرض کنید رمز عبور به صورت غیر هش شده ذخیره شده است
    res.json({ password: row.password });
  });
});

// For any other request, serve the frontend's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
