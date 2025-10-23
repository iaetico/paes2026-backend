// --- 1. Importar herramientas ---
 const express = require('express');
 const cors = require('cors');
 const fs = require('fs');
 const crypto = require('crypto');
 const jwt = require('jsonwebtoken');
 console.log("--- SERVER SCRIPT STARTED ---"); // Log inicial

 // --- Clave secreta ---
 const JWT_SECRET = '*MJ*Ug@jQ7BU+KgzWZ&$zCEyD$Z>9@JYS]3D;%p>GG@UctzPqVYdM]MA83qF]$?R,';
 console.log("--- Imports done ---");

 // --- 2. Cargar datos ---
 let questionBanks = {};
 let users = [];
 let testHistory = [];
 try {
     questionBanks = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
     users = [
         { id: 0, user: 'admin', email: 'admin@paes.cl', password: 'admin', name: 'Administrador', role: 'admin', deviceToken: null },
         { id: 1, user: 'juan.perez', email: 'juan.perez@email.com', password: '123456', name: 'Juan Pérez', role: 'student', tests: ['lectora', 'm1', 'm2'], inProgressTests: {}, deviceToken: null },
         { id: 2, user: 'kita', email: 'kita@example.com', password: '140914', name: 'Kita', role: 'student', tests: ['lectora', 'm1', 'ciencias'], inProgressTests: {}, deviceToken: null }
     ];
     console.log("--- Data loaded ---");
 } catch(e) { console.error("FATAL ERROR loading initial data:", e); process.exit(1); }

 // --- Datos Estáticos ---
 const testDetails = { /* ... */ };
 const scoreConversionTables = { /* ... */ };

 // --- 3. Funciones Helper ---
 function sanitizeQuestions(allQuestionData, allowedTests = []) { /* ... (con verificación) ... */ }
 function flattenQuestions(allQuestionData) { /* ... (sin cambios) ... */ }
 function calculateStandardScore(testKey, correctAnswers) { /* ... (sin cambios) ... */ }

 // --- 4. Configuración ---
 const app = express();
 const PORT = process.env.PORT || 3000;
 app.use(cors());
 app.use(express.json());
 console.log("--- Express app configured ---");

 // --- 5. Middlewares JWT ---
 const authenticateToken = (req, res, next) => { /* ... (sin cambios) ... */ };
 const isAdmin = (req, res, next) => { /* ... (sin cambios) ... */ };
 const isStudent = (req, res, next) => { /* ... (sin cambios) ... */ };
 console.log("--- Middlewares defined ---");

 // --- 6. Endpoints ---
 app.get('/', (req, res) => { console.log("--- GET / request received ---"); res.send('¡El servidor PAES 2026 está funcionando!'); });
 app.post('/api/login', (req, res) => { console.log(`--- POST /api/login request received ... ---`); /* ... (con corrección ReferenceError) ... */ });
 // ... (Resto de endpoints sin cambios) ...
 app.get('/api/session', authenticateToken, (req, res) => { /* ... */ });
 app.get('/api/questions', authenticateToken, isStudent, (req, res) => { /* ... (con verificación) ... */ });
 app.get('/api/student/history', authenticateToken, isStudent, (req, res) => { /* ... */ });
 app.post('/api/submit', authenticateToken, isStudent, (req, res) => { /* ... (con verificación) ... */ });
 app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => { /* ... */ });
 app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => { /* ... */ });
 app.post('/api/admin/release-device/:id', authenticateToken, isAdmin, (req, res) => { /* ... */ });
 app.post('/api/admin/users', authenticateToken, isAdmin, (req, res) => { /* ... */ });
 app.put('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { /* ... */ });
 app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { /* ... */ });

 console.log("--- Routes defined ---");

 // --- 9. Encender ---
 app.listen(PORT, () => {
     console.log(`--- Server listening on port ${PORT} ---`); // Log Final
 });

 // ***** ¡NUEVO! LOG KEEP-ALIVE *****
 setInterval(() => {
     console.log(`--- Keep-Alive Check @ ${new Date().toISOString()} --- Server is running.`);
 }, 60000); // Imprimir cada 60 segundos (1 minuto)
 // **********************************

 // Asegurar que errores no capturados se registren antes de salir
 process.on('uncaughtException', (err) => {
   console.error('--- UNCAUGHT EXCEPTION ---', err);
   process.exit(1); // Salir si hay un error fatal no capturado
 });
 process.on('unhandledRejection', (reason, promise) => {
   console.error('--- UNHANDLED REJECTION ---', reason);
   // Podrías decidir salir o solo registrarlo
 });