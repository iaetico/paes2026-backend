// --- 1. Importar herramientas ---
 const express = require('express');
 const cors = require('cors');
 const fs = require('fs');
 const crypto = require('crypto');
 const jwt = require('jsonwebtoken');
 console.log("--- SERVER SCRIPT STARTED ---");

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
 function sanitizeQuestions(allQuestionData, allowedTests = []) {
     // ***** ¡VERIFICACIÓN AÑADIDA! *****
     if (!allQuestionData || typeof allQuestionData !== 'object') {
         console.error("sanitizeQuestions: allQuestionData es inválido.");
         return {};
     }
     if (!Array.isArray(allowedTests)) {
         console.warn("sanitizeQuestions: allowedTests no es un array. Se usará array vacío.");
         allowedTests = [];
     }
     // ***** FIN VERIFICACIÓN *****

     const sanitizedBanks = {};
     // Filter to include only tests the user is allowed to take
     allowedTests.forEach(testKey => {
         if (allQuestionData[testKey]) {
             const testBank = allQuestionData[testKey];
             // Asegurarse que testBank sea un array
             if (Array.isArray(testBank)) {
                 sanitizedBanks[testKey] = testBank.map(category => ({
                     category: category.category,
                     questions: Array.isArray(category.questions) ? category.questions.map(q => ({
                         question: q.question,
                         options: q.options,
                         image: q.image || null
                         // DO NOT send q.correct
                     })) : []
                 }));
             }
         }
     });
     return sanitizedBanks;
 }
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
 app.get('/', (req, res) => { /* ... (sin cambios) ... */ });
 app.post('/api/login', (req, res) => { /* ... (sin cambios) ... */ });
 app.get('/api/session', authenticateToken, (req, res) => { /* ... (sin cambios) ... */ });

 // --- Endpoint /api/questions (AHORA MÁS ROBUSTO) ---
 app.get('/api/questions', authenticateToken, isStudent, (req, res) => {
     console.log("--- GET /api/questions request received ---");
     try {
         const user = req.fullUser; // Adjuntado por el middleware isStudent

         // ***** ¡VERIFICACIONES AÑADIDAS! *****
         if (!user) {
             console.error("--- ERROR in /api/questions: req.fullUser no está definido. Middleware isStudent falló. ---");
             return res.status(500).json({ message: "Error interno: Datos de usuario no encontrados." });
         }
         if (!user.tests) {
             console.warn(`--- WARN in /api/questions: user ${user.id} no tiene propiedad 'tests'. ---`);
             user.tests = []; // Asignar array vacío para evitar crash
         }
         // ***** FIN VERIFICACIONES *****

         console.log(`--- Sanitizing questions for user: ${user.id} with tests: ${user.tests.join(', ')} ---`);
         const allowedQuestions = sanitizeQuestions(questionBanks, user.tests);
         
         console.log("--- Successfully sanitized questions. Sending response. ---");
         res.json(allowedQuestions);

     } catch (error) {
         console.error("--- CRITICAL ERROR inside /api/questions handler ---", error);
         res.status(500).json({ message: "Error interno procesando la solicitud de preguntas." });
     }
 });
 // --- FIN Endpoint /api/questions ---

 app.get('/api/student/history', authenticateToken, isStudent, (req, res) => { /* ... (sin cambios) ... */ });
 app.post('/api/submit', authenticateToken, isStudent, (req, res) => { /* ... (sin cambios) ... */ });
 // ... (Endpoints de Admin sin cambios) ...

 console.log("--- Routes defined ---");

 // --- 9. Encender ---
 app.listen(PORT, () => {
     console.log(`--- Server listening on port ${PORT} ---`);
 });