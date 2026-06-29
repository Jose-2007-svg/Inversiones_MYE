// backend/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuración estricta de CORS para Socket.io en producción
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  } 
});

// Importar rutas
const zapatillasRoutes = require('./routes/zapatillas');
const authRoutes = require('./routes/auth');
const historialRoutes = require('./routes/historial');
const separacionesRoutes = require('./routes/separaciones');

app.set('socketio', io);

// Configuración estricta de CORS para Express (API)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Enchufamos nuestro endpoint
app.use('/api/zapatillas', zapatillasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/separaciones', separacionesRoutes);

app.get('/', (req, res) => {
  res.send('¡Motor del backend de zapatillas encendido y funcionando!');
});

io.on('connection', (socket) => {
  console.log('Un cliente se ha conectado desde su celular:', socket.id);
  socket.on('disconnect', () => { console.log('Cliente desconectado:', socket.id); });
});

const PUERTO = process.env.PORT || 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor rodando a toda máquina en el puerto ${PUERTO}`);
});