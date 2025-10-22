// --- 1. Importar herramientas ---
 const express = require('express');
 const cors = require('cors');
 const fs = require('fs');
 const crypto = require('crypto');
 const jwt = require('jsonwebtoken');

 // --- Clave secreta ---
 const JWT_SECRET = '*MJ*Ug@jQ7BU+KgzWZ&$zCEyD$Z>9@JYS]3D;%p>GG@UctzPqVYdM]MA83qF]$?R,';

 // --- 2. Cargar datos ---
 const questionBanks = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
 const users = [
     { id: 0, user: 'admin', email: 'admin@paes.cl', password: 'admin', name: 'Administrador', role: 'admin', deviceToken: null },
     { id: 1, user: 'juan.perez', email: 'juan.perez@email.com', password: '123456', name: 'Juan Pérez', role: 'student', tests: ['lectora', 'm1', 'm2'], inProgressTests: {}, deviceToken: null },
     { id: 2, user: 'kita', email: 'kita@example.com', password: '140914', name: 'Kita', role: 'student', tests: ['lectora', 'm1', 'ciencias'], inProgressTests: {}, deviceToken: null }
 ];
 let testHistory = [];

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
 app.use(express.json()); // Asegúrate que esto esté ANTES de las rutas

 // --- 5. Middlewares JWT ---
 const authenticateToken = (req, res, next) => {
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1];
     if (token == null) return res.status(401).json({ message: 'Token no proporcionado.' });

     jwt.verify(token, JWT_SECRET, (err, userPayload) => {
         if (err) return res.status(403).json({ message: 'Token inválido o expirado.' });
         req.user = userPayload; // Adjunta {id, role}
         next();
     });
 };

 const isAdmin = (req, res, next) => {
     if (req.user && req.user.role === 'admin') {
         // Adjuntar usuario completo de admin si es necesario (opcional)
         req.fullUser = users.find(u => u.id === req.user.id);
         next();
     } else {
         return res.status(403).json({ message: 'Requiere permisos de administrador.' });
     }
 };

 const isStudent = (req, res, next) => {
     const deviceTokenHeader = req.headers['x-device-token'];
     const userInDb = users.find(u => u.id === req.user.id); // req.user viene de authenticateToken

     if (!userInDb) return res.status(401).json({ message: 'Usuario no encontrado.' });

     if (req.user && req.user.role === 'student' && userInDb.deviceToken === deviceTokenHeader) {
         req.fullUser = userInDb; // <<<--- Asegurarse de adjuntar el usuario completo aquí
         next();
     } else if (req.user && req.user.role === 'student' && userInDb.deviceToken !== deviceTokenHeader) {
          return res.status(401).json({ message: 'Dispositivo no reconocido.' });
     } else {
         return res.status(403).json({ message: 'Requiere rol de estudiante y dispositivo válido.' });
     }
 };

 // --- 6. Endpoints ---
 app.get('/', (req, res) => { res.send('¡El servidor PAES 2026 está funcionando!'); });

 app.post('/api/login', (req, res) => { /* ... (sin cambios) ... */ });

 // --- Endpoints PROTEGIDOS ---
 app.get('/api/session', authenticateToken, (req, res) => { /* ... (sin cambios) ... */ });

 // --- Endpoints de ESTUDIANTE ---
 app.get('/api/questions', authenticateToken, isStudent, (req, res) => { /* ... (sin cambios) ... */ });
 app.get('/api/student/history', authenticateToken, isStudent, (req, res) => { /* ... (sin cambios) ... */ });

 app.post('/api/submit', authenticateToken, isStudent, (req, res) => {
     try {
         // ***** ¡VERIFICACIÓN AÑADIDA! *****
         const { testKey, userAnswers, questionsAnswered } = req.body;
         // Log para ver qué llega
         // console.log("DEBUG: /api/submit received body:", req.body);
         // console.log("DEBUG: /api/submit req.user:", req.user); // Viene del token {id, role}
         // console.log("DEBUG: /api/submit req.fullUser:", req.fullUser); // Viene de isStudent

         if (!testKey || !userAnswers || !Array.isArray(questionsAnswered) || questionsAnswered.length === 0) {
              console.error("ERROR en /api/submit: Datos inválidos o faltantes.", {testKey, userAnswers, questionsAnswered_isArray: Array.isArray(questionsAnswered)});
              return res.status(400).json({ message: "Datos de la prueba inválidos o incompletos." });
         }
         // ***** FIN VERIFICACIÓN *****

         const allRealQuestions = questionBanks[testKey] || [];
         const flatRealQuestions = flattenQuestions(allRealQuestions);
         const answerMap = new Map();
         flatRealQuestions.forEach(q => { answerMap.set(q.question, q.correct); });

         let score = 0;
         const results = [];
         // La línea del error ahora está protegida por la verificación de arriba
         questionsAnswered.forEach((clientQ, index) => {
             // ... (resto de la lógica de calificación SIN CAMBIOS) ...
              if (!clientQ) return;
              const realCorrectIndex = answerMap.get(clientQ.question);
              if (typeof realCorrectIndex !== 'number') { console.warn(`No correct answer found for question in ${testKey}: "${clientQ.question}"`); return; }
              const userAnswerIndex = userAnswers[index] ? parseInt(userAnswers[index]) : -1;
              const isCorrect = (realCorrectIndex === userAnswerIndex);
              if (isCorrect) score++;
              const realQuestion = flatRealQuestions.find(q => q.question === clientQ.question);
              if (realQuestion) {
                   const userAnsText = (userAnswerIndex > -1 && clientQ.options && clientQ.options[userAnswerIndex]) ? clientQ.options[userAnswerIndex] : "No contestada";
                   const correctAnsText = (realQuestion.options && realQuestion.options[realCorrectIndex]) ? realQuestion.options[realCorrectIndex] : "N/A";
                  results.push({ question: clientQ, userAnswerIndex, userAnswer: userAnsText, correctAnswer: correctAnsText, isCorrect });
              }
         });

         const totalQuestions = questionsAnswered.length; // Ahora sabemos que es un array
         const standardScore = calculateStandardScore(testKey, score);

         // Usa req.fullUser adjuntado por isStudent
         const userName = req.fullUser ? req.fullUser.name : `Usuario ${req.user.id}`;

         const historyRecord = {
             id: Date.now(), userId: req.user.id, userName: userName, testKey: testKey,
             testName: testDetails[testKey]?.name || testKey, date: new Date().toISOString(),
             correctas: score, erroneas: totalQuestions - score, total: totalQuestions, puntaje: standardScore
         };
         testHistory.push(historyRecord);
         console.log(`Prueba guardada para ${userName}: ${testKey}, Puntaje: ${standardScore}`);

         res.json({ score, total: totalQuestions, standardScore, results });
     } catch (error) {
         console.error("Error al calificar la prueba:", error);
         res.status(500).json({ message: "Error interno del servidor al procesar la prueba." });
     }
 });


 // --- Endpoints de ADMIN ---
 app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });
 app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });
 app.post('/api/admin/release-device/:id', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });
 app.post('/api/admin/users', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });
 app.put('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });
 app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => { /* ... (sin cambios) ... */ });

 // --- 9. Encender ---
 app.listen(PORT, () => { console.log(`Servidor escuchando en el puerto ${PORT}`); });