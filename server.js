// js/server.js
 console.log("--- SERVER SCRIPT STARTED ---"); // <-- LOG INICIAL

 // --- 1. Importar herramientas ---
 const express = require('express');
 const cors = require('cors');
 const fs = require('fs');
 const crypto = require('crypto');
 const jwt = require('jsonwebtoken');
 console.log("--- Imports done ---"); // <-- LOG

 // --- Clave secreta ---
 const JWT_SECRET = '*MJ*Ug@jQ7BU+KgzWZ&$zCEyD$Z>9@JYS]3D;%p>GG@UctzPqVYdM]MA83qF]$?R,';

 // --- 2. Cargar datos ---
 let questionBanks = {};
 let users = [];
 let testHistory = [];
 try {
     questionBanks = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
     // Simular carga de usuarios si fuera de BBDD
     users = [
         { id: 0, user: 'admin', email: 'admin@paes.cl', password: 'admin', name: 'Administrador', role: 'admin', deviceToken: null },
         { id: 1, user: 'juan.perez', email: 'juan.perez@email.com', password: '123456', name: 'Juan Pérez', role: 'student', tests: ['lectora', 'm1', 'm2'], inProgressTests: {}, deviceToken: null },
         { id: 2, user: 'kita', email: 'kita@example.com', password: '140914', name: 'Kita', role: 'student', tests: ['lectora', 'm1', 'ciencias'], inProgressTests: {}, deviceToken: null }
     ];
     console.log("--- Data loaded ---"); // <-- LOG
 } catch(e) {
     console.error("FATAL ERROR loading initial data:", e);
     // Si falla aquí, el servidor podría no iniciar bien.
     process.exit(1); // Detener si los datos iniciales fallan
 }

 // --- Datos Estáticos ---
 const testDetails = { /* ... */ };
 const scoreConversionTables = { /* ... */ };

 // --- 3. Funciones Helper ---
 function sanitizeQuestions(questionData) { /* ... */ }
 function flattenQuestions(allQuestionData) { /* ... */ }
 function calculateStandardScore(testKey, correctAnswers) { /* ... */ }

 // --- 4. Configuración ---
 const app = express();
 const PORT = process.env.PORT || 3000;
 app.use(cors());
 app.use(express.json());
 console.log("--- Express app configured ---"); // <-- LOG

 // --- 5. Middlewares JWT ---
 const authenticateToken = (req, res, next) => { /* ... (sin cambios) ... */ };
 const isAdmin = (req, res, next) => { /* ... (sin cambios) ... */ };
 const isStudent = (req, res, next) => { /* ... (sin cambios) ... */ };
 console.log("--- Middlewares defined ---"); // <-- LOG

 // --- 6. Endpoints ---
 app.get('/', (req, res) => {
     console.log("--- GET / request received ---"); // <-- LOG
     res.send('¡El servidor PAES 2026 está funcionando!');
 });

 app.post('/api/login', (req, res) => {
     // ***** LOG AL INICIO DEL ENDPOINT *****
     console.log(`--- POST /api/login request received at ${new Date().toISOString()} ---`);
     // ************************************
     try { // Envolver todo en try/catch por si acaso
         const { loginUser, loginPass, deviceToken } = req.body;
         console.log(`--- Attempting login for user: ${loginUser} ---`); // <-- LOG
         const user = users.find(u => (u.user === loginUser || u.email === loginUser) && u.password === loginPass);

         if (!user) {
              console.warn(`--- Login FAILED for ${loginUser}: Incorrect credentials ---`); // <-- LOG
             return res.status(401).json({ message: 'Credenciales incorrectas.' });
         }

         const userInDb = users.find(u => u.id === user.id);
         const payload = { id: user.id, role: user.role };
         const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
         const userResponse = { ...user };
         delete userResponse.password;

         if (user.role === 'student') {
             // ... (lógica deviceToken sin cambios) ...
             if (userInDb.deviceToken === null) { /* ... */ return res.json({ user: userResponse, token: token, deviceToken: newDeviceToken }); }
             if (userInDb.deviceToken === deviceToken) { /* ... */ return res.json({ user: userResponse, token: token }); }
             console.warn(`--- Login REJECTED for ${loginUser}: Device mismatch ---`); // <-- LOG
             return res.status(403).json({ message: 'Esta cuenta ya está registrada en otro dispositivo.' });
         } else if (user.role === 'admin') {
              console.log(`--- Login SUCCESS for ADMIN ${user.user} ---`); // <-- LOG
              return res.json({ user: userResponse, token: token });
         }

         console.warn(`--- Login FAILED for ${loginUser}: Unrecognized role ---`); // <-- LOG
         return res.status(403).json({ message: 'Rol de usuario no reconocido.' });
     } catch(e) {
         console.error("--- CRITICAL ERROR inside /api/login handler ---", e); // <-- LOG
         res.status(500).json({message: "Error interno procesando login"});
     }
 });

 // --- Otros Endpoints Protegidos ---
 app.get('/api/session', authenticateToken, (req, res) => { console.log("--- GET /api/session OK ---"); /* ... */ });
 app.get('/api/questions', authenticateToken, isStudent, (req, res) => { console.log("--- GET /api/questions OK ---"); /* ... */ });
 app.get('/api/student/history', authenticateToken, isStudent, (req, res) => { console.log("--- GET /api/student/history OK ---"); /* ... */ });
 app.post('/api/submit', authenticateToken, isStudent, (req, res) => { console.log("--- POST /api/submit received ---"); /* ... */ });
 app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => { console.log("--- GET /api/admin/stats OK ---"); /* ... */ });
 app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => { console.log("--- GET /api/admin/users OK ---"); /* ... */ });
 app.post('/api/admin/release-device/:id', authenticateToken, isAdmin, (req, res) => { console.log(`--- POST /api/admin/release-device/${req.params.id} OK ---`); /* ... */ });
 app.post('/api/admin/users', authenticateToken, isAdmin, (req, res) => { console.log("--- POST /api/admin/users OK ---"); /* ... */ });
 app.put('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { console.log(`--- PUT /api/admin/users/${req.params.id} OK ---`); /* ... */ });
 app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { console.log(`--- DELETE /api/admin/users/${req.params.id} OK ---`); /* ... */ });

 console.log("--- Routes defined ---"); // <-- LOG

 // --- 9. Encender ---
 app.listen(PORT, () => {
     console.log(`--- Server listening on port ${PORT} ---`); // <-- LOG (Final)
 });