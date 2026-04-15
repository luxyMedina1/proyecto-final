const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

app.use(session({
  secret: 'secreto',
  resave: false,
  saveUninitialized: true
}));

// CONEXIÓN MYSQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'escuela'
});

db.connect(err => {
  if (err) {
    console.log('Error de conexión:', err);
  } else {
    console.log('Conectado a MySQL');
  }
});


// REGISTRO
app.post('/usuarios', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).send('Faltan datos');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre, email, hashedPassword],
      (err) => {
        if (err) return res.status(500).send(err);
        res.send('Usuario creado');
      }
    );
  } catch (error) {
    res.status(500).send(error);
  }
});


// LOGIN
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Faltan datos');
  }

  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {

    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      return res.status(401).send('Usuario no encontrado');
    }

    const usuario = results[0];

    const match = await bcrypt.compare(password, usuario.password);

    if (match) {
      req.session.usuario = {
        id: usuario.id,
        nombre: usuario.nombre
      };

      res.send('Login correcto');
    } else {
      res.status(401).send('Contraseña incorrecta');
    }
  });
});


// PERFIL
app.get('/perfil', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).send('No autorizado');
  }

  res.json(req.session.usuario);
});


// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.send('Sesión cerrada');
});


// CRUD ALUMNOS

// OBTENER
app.get('/alumnos', (req, res) => {
  db.query('SELECT * FROM alumnos', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// CREAR
app.post('/alumnos', (req, res) => {
  const { nombre, grupo } = req.body;

  if (!nombre || !grupo) {
    return res.status(400).send('Faltan datos');
  }

  db.query(
    'INSERT INTO alumnos (nombre, grupo) VALUES (?, ?)',
    [nombre, grupo],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Alumno creado');
    }
  );
});

// ACTUALIZAR
app.put('/alumnos/:id', (req, res) => {
  const { nombre, grupo } = req.body;
  const { id } = req.params;

  db.query(
    'UPDATE alumnos SET nombre = ?, grupo = ? WHERE id = ?',
    [nombre, grupo, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Alumno actualizado');
    }
  );
});

// ELIMINAR
app.delete('/alumnos/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM alumnos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.send('Alumno eliminado');
  });
});

// SERVIDOR
app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});