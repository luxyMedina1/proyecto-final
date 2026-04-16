const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── SESIONES ──────────────────────────────────────────────
app.use(session({
  secret: 'secreto_escuela_2025',
  resave: false,
  saveUninitialized: false
}));

// ── BASE DE DATOS ─────────────────────────────────────────
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'escuela2'
});

db.connect(err => {
  if (err) {
    console.error('Error de conexión:', err);
  } else {
    console.log(' Conectado a MySQL');
  }
});

// ── MIDDLEWARE: PROTECCIÓN DE RUTAS ───────────────────────
function verificarSesion(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }
  next();
}

// ══════════════════════════════════════════════════════════
// RUTAS DE USUARIOS
// ══════════════════════════════════════════════════════════

// Registrar usuario (con bcrypt)
app.post('/usuarios', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)';
    db.query(sql, [nombre, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ mensaje: 'Usuario registrado correctamente' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN — valida contra BD con bcrypt
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const sql = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = results[0];
    const match = await bcrypt.compare(password, usuario.password);

    if (match) {
      req.session.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      };
      res.json({ mensaje: 'Login correcto', usuario: { nombre: usuario.nombre, email: usuario.email } });
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });
});

// Ver perfil (ruta protegida)
app.get('/perfil', verificarSesion, (req, res) => {
  res.json(req.session.usuario);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  });
});

// ══════════════════════════════════════════════════════════
// CRUD ALUMNOS (todas las rutas protegidas)
// ══════════════════════════════════════════════════════════

// READ — obtener todos los alumnos
app.get('/alumnos', verificarSesion, (req, res) => {
  db.query('SELECT * FROM alumnos ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// CREATE — agregar alumno
app.post('/alumnos', verificarSesion, (req, res) => {
  const { nombre, grupo } = req.body;
  if (!nombre || !grupo) {
    return res.status(400).json({ error: 'Nombre y grupo son requeridos' });
  }
  db.query(
    'INSERT INTO alumnos (nombre, grupo) VALUES (?, ?)',
    [nombre, grupo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: 'Alumno creado', id: result.insertId });
    }
  );
});

// UPDATE — editar alumno
app.put('/alumnos/:id', verificarSesion, (req, res) => {
  const { nombre, grupo } = req.body;
  const { id } = req.params;
  if (!nombre || !grupo) {
    return res.status(400).json({ error: 'Nombre y grupo son requeridos' });
  }
  db.query(
    'UPDATE alumnos SET nombre = ?, grupo = ? WHERE id = ?',
    [nombre, grupo, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: 'Alumno actualizado' });
    }
  );
});

// DELETE — eliminar alumno
app.delete('/alumnos/:id', verificarSesion, (req, res) => {
  db.query('DELETE FROM alumnos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Alumno eliminado' });
  });
});

// ── SERVIDOR ──────────────────────────────────────────────
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});