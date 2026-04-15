const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: 'secreto',
  resave: false,
  saveUninitialized: true
}));

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

// LOGIN SIMPLE
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === "test@test.com" && password === "1234") {
    return res.send("Login correcto");
  } else {
    return res.status(401).send("Datos incorrectos");
  }
});

// CRUD ALUMNOS
app.get('/alumnos', (req, res) => {
  db.query('SELECT * FROM alumnos', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.post('/alumnos', (req, res) => {
  const { nombre, grupo } = req.body;

  db.query(
    'INSERT INTO alumnos (nombre, grupo) VALUES (?, ?)',
    [nombre, grupo],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Alumno creado');
    }
  );
});

app.delete('/alumnos/:id', (req, res) => {
  db.query('DELETE FROM alumnos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.send('Alumno eliminado');
  });
});

app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});