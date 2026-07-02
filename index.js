// backend/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit'); // 🛡️ Importamos el escudo Anti-DDoS

const app = express();
const server = http.createServer(app);

// 🛡️ 1. Definimos los orígenes permitidos (CORS Estricto)
const origenesPermitidos = [
  'http://localhost:5173', // Permitir desarrollo web local
  'http://localhost:19006', // Permitir Expo/React Native local
  'https://inversiones-mye-web.vercel.app' // 🔥 TU URL DE VERCEL (Revisa que sea exacta)
];

// Configuración inteligente de CORS para Express (API)
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin 'origin' (como tu App Móvil nativa o postman) 
    // o si el origen está en nuestra lista blanca.
    if (!origin || origenesPermitidos.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por políticas de seguridad (CORS)'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Configuración estricta de CORS para Socket.io en producción
const io = new Server(server, { 
  cors: { 
    origin: origenesPermitidos, // Solo los orígenes autorizados pueden usar los WebSockets en tiempo real
    methods: ["GET", "POST", "PUT", "DELETE"]
  } 
});

// Importar rutas
const zapatillasRoutes = require('./routes/zapatillas');
const authRoutes = require('./routes/auth');
const historialRoutes = require('./routes/historial');
const separacionesRoutes = require('./routes/separaciones');

app.set('socketio', io);

// Aplicar CORS a Express
app.use(cors(corsOptions));
app.use(express.json());

// 🛡️ 2. Configurar el Escudo Anti-DDoS (Rate Limiter)
// Límite: 150 peticiones máximo cada 15 minutos por dirección IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
  max: 150, 
  message: { error: 'Actividad sospechosa detectada. Por seguridad, tu IP ha sido bloqueada temporalmente por 15 minutos.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Aplicar el escudo SOLO a las rutas que empiezan con /api (para proteger tu base de datos)
app.use('/api', limiter);

// Enchufamos nuestros endpoints
app.use('/api/zapatillas', zapatillasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/separaciones', separacionesRoutes);

app.get('/', (req, res) => {
  res.send('¡Motor del backend de zapatillas encendido y protegido! 🛡️');
});

io.on('connection', (socket) => {
  console.log('Un cliente verificado se ha conectado:', socket.id);
  socket.on('disconnect', () => { console.log('Cliente desconectado:', socket.id); });
});

const PUERTO = process.env.PORT || 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor rodando a toda máquina y blindado en el puerto ${PUERTO}`);
});