// --- 1. Importar herramientas ---
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // ¡NUEVO! Para JSON Web Tokens

// --- ¡IMPORTANTE! Clave secreta para firmar los JWT ---
// Clave proporcionada por el usuario
const JWT_SECRET = '*MJ*Ug@jQ7BU+KgzWZ&$zCEyD$Z>9@JYS]3D;%p>GG@UctzPqVYdM]MA83qF]$?R,';

// --- 2. Cargar datos seguros a la memoria del servidor ---
const questionBanks = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
const users = [
    // --- activeSessionId ELIMINADO ---
    { id: 0, user: 'admin', email: 'admin@paes.cl', password: 'admin', name: 'Administrador', role: 'admin', deviceToken: null },
    { id: 1, user: 'juan.perez', email: 'juan.perez@email.com', password: '123456', name: 'Juan Pérez', role: 'student', tests: ['lectora', 'm1', 'm2'], inProgressTests: {}, deviceToken: null },
    { id: 2, user: 'kita', email: 'kita@example.com', password: '140914', name: 'Kita', role: 'student', tests: ['lectora', 'm1', 'ciencias'], inProgressTests: {}, deviceToken: null }
];

let testHistory = [];

// --- DATOS ESTÁTICOS... (Sin cambios) ---
const testDetails = { /* ... */ };
const scoreConversionTables = { /* ... */ };

// --- 3. Funciones "Helper" del Servidor ---
function sanitizeQuestions(questionData) { /* ... */ }
function flattenQuestions(allQuestionData) { /* ... */ }
function calculateStandardScore(testKey, correctAnswers) { /* ... */ }


// --- 4. Configuración del servidor ---
const app = express();
const PORT = process.env.PORT || 3000; // Usar variable de entorno PORT si existe (Render la usa)
app.use(cors());
app.use(express.json());

// --- 5. ¡NUEVO MIDDLEWARE DE AUTENTICACIÓN JWT! ---
const authenticateToken = (req, res, next) => {
    // Busca el token en el encabezado 'Authorization'
    const authHeader = req.headers['authorization'];
    // El formato es "Bearer TOKEN"
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // No hay token
        return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
    }

    // Verifica el token usando la clave secreta
    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            // Token inválido (expirado, firma incorrecta, etc.)
            console.error("Error verificando token:", err.message);
            return res.status(403).json({ message: 'Token inválido o expirado.' });
        }
        // ¡Token válido! Adjunta el payload (que contiene id y role) al objeto request
        req.user = userPayload;
        next(); // Pasa al siguiente middleware o a la ruta final
    });
};

// --- Middleware específico para verificar rol de Admin (después de authenticateToken) ---
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado: Requiere permisos de administrador.' });
    }
};

// --- Middleware específico para verificar rol de Student (después de authenticateToken) ---
const isStudent = (req, res, next) => {
    // También verifica el deviceToken para estudiantes
    const deviceTokenHeader = req.headers['x-device-token'];
    const userInDb = users.find(u => u.id === req.user.id);

    if (!userInDb) { // Por si acaso el usuario fue borrado después de generar el token
         return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    if (req.user && req.user.role === 'student' && userInDb.deviceToken === deviceTokenHeader) {
        // Adjuntamos el usuario completo de la "BBDD" para tener sus datos (como 'name')
        // Importante: No sobreescribir el payload del token original (id, role)
        req.fullUser = userInDb; // Guardar usuario completo en otra propiedad
        next();
    } else if (req.user && req.user.role === 'student' && userInDb.deviceToken !== deviceTokenHeader) {
         return res.status(401).json({ message: 'Dispositivo no reconocido.' });
    }
     else {
        return res.status(403).json({ message: 'Acceso denegado: Requiere rol de estudiante y dispositivo válido.' });
    }
};


// --- 6. Definir los "Endpoints" (las URLs) ---

app.get('/', (req, res) => {
    res.send('¡El servidor PAES 2026 está funcionando!');
});

// --- Endpoint para el LOGIN (¡AHORA GENERA JWT!) ---
app.post('/api/login', (req, res) => {
    const { loginUser, loginPass, deviceToken } = req.body;
    const user = users.find(u => (u.user === loginUser || u.email === loginUser) && u.password === loginPass);

    if (!user) {
        return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const userInDb = users.find(u => u.id === user.id); // Necesario para la lógica de deviceToken

    // Prepara el payload del token (información que queremos guardar dentro)
    const payload = { id: user.id, role: user.role };

    // Crea el token firmado con la clave secreta
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Expira en 1 hora

    const userResponse = { ...user };
    delete userResponse.password;
    // delete userResponse.activeSessionId; // Ya no existe

    // Lógica de Device Token (solo para estudiantes)
    if (user.role === 'student') {
        // Escenario 1: Primer login
        if (userInDb.deviceToken === null) {
            const newDeviceToken = crypto.randomBytes(16).toString('hex');
            userInDb.deviceToken = newDeviceToken;
            console.log(`Primer login para ${user.user}. Dispositivo registrado.`);
            // Enviamos el token Y el nuevo deviceToken
            return res.json({ user: userResponse, token: token, deviceToken: newDeviceToken });
        }
        // Escenario 2: Login subsecuente, dispositivo correcto
        if (userInDb.deviceToken === deviceToken) {
            console.log(`Login exitoso para ${user.user} en dispositivo conocido.`);
            // Enviamos el token (el cliente ya tiene el deviceToken)
            return res.json({ user: userResponse, token: token });
        }
        // Escenario 3: Dispositivo incorrecto
        console.warn(`Login RECHAZADO para ${user.user}. Dispositivo no coincide.`);
        return res.status(403).json({ message: 'Esta cuenta ya está registrada en otro dispositivo.' });

    } else if (user.role === 'admin') {
         // Los Admins no usan deviceToken
         console.log(`Login de ADMIN exitoso para ${user.user}`);
         return res.json({ user: userResponse, token: token });
    }

    return res.status(403).json({ message: 'Rol de usuario no reconocido.' });
});

// --- 7. Endpoints PROTEGIDOS por authenticateToken ---

// Endpoint para verificar sesión (devuelve info del usuario si el token es válido)
app.get('/api/session', authenticateToken, (req, res) => {
    // Si llegamos aquí, el token es válido. Buscamos al usuario para enviar info actualizada.
    const userInDb = users.find(u => u.id === req.user.id); // req.user tiene {id, role} del token
    if (!userInDb) {
        return res.status(401).json({ message: 'Usuario no encontrado (token válido pero usuario eliminado).' });
    }
    const userResponse = { ...userInDb };
    delete userResponse.password;
    // delete userResponse.activeSessionId; // Ya no existe
    res.json({ user: userResponse });
});

// --- Endpoints de ESTUDIANTE (Protegidos por authenticateToken + isStudent) ---
app.get('/api/questions', authenticateToken, isStudent, (req, res) => {
    const sanitizedBanks = {};
    for (const testKey in questionBanks) {
        const originalQuestions = questionBanks[testKey] || [];
        sanitizedBanks[testKey] = originalQuestions.filter(Boolean).map(sanitizeQuestions);
    }
    res.json(sanitizedBanks);
});

app.get('/api/student/history', authenticateToken, isStudent, (req, res) => {
    const userHistory = testHistory
        .filter(record => record.userId === req.user.id) // usa ID del token
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    res.json(userHistory);
});

app.post('/api/submit', authenticateToken, isStudent, (req, res) => {
    try {
        const { testKey, userAnswers, questionsAnswered } = req.body;
        const allRealQuestions = questionBanks[testKey] || [];
        const flatRealQuestions = flattenQuestions(allRealQuestions);
        const answerMap = new Map();
        flatRealQuestions.forEach(q => { answerMap.set(q.question, q.correct); });

        let score = 0;
        const results = [];
        questionsAnswered.forEach((clientQ, index) => {
             if (!clientQ) return; // Salta si la pregunta es null
             const realCorrectIndex = answerMap.get(clientQ.question);
             // Verifica que realCorrectIndex sea un número antes de comparar
             if (typeof realCorrectIndex !== 'number') {
                 console.warn(`No se encontró respuesta correcta para la pregunta: "${clientQ.question}" en el test ${testKey}`);
                 return; // Salta esta pregunta si no hay respuesta correcta definida
             }

            const userAnswerIndex = userAnswers[index] ? parseInt(userAnswers[index]) : -1;
            const isCorrect = (realCorrectIndex === userAnswerIndex);
            if (isCorrect) score++;
            const realQuestion = flatRealQuestions.find(q => q.question === clientQ.question);
            if (realQuestion) {
                 const userAnsText = (userAnswerIndex > -1 && clientQ.options && clientQ.options[userAnswerIndex]) ? clientQ.options[userAnswerIndex] : "No contestada";
                 const correctAnsText = (realQuestion.options && realQuestion.options[realCorrectIndex]) ? realQuestion.options[realCorrectIndex] : "N/A";

                results.push({
                    question: clientQ, userAnswerIndex: userAnswerIndex,
                    userAnswer: userAnsText, correctAnswer: correctAnsText,
                    isCorrect: isCorrect
                });
            }
        });

        const totalQuestions = questionsAnswered.length;
        const standardScore = calculateStandardScore(testKey, score);

        // Usa req.fullUser adjuntado por isStudent para obtener el nombre
        const userName = req.fullUser ? req.fullUser.name : `Usuario ${req.user.id}`;

        const historyRecord = {
            id: Date.now(), userId: req.user.id, userName: userName,
            testKey: testKey, testName: testDetails[testKey]?.name || testKey,
            date: new Date().toISOString(), correctas: score, erroneas: totalQuestions - score,
            total: totalQuestions, puntaje: standardScore
        };
        testHistory.push(historyRecord);
        console.log(`Prueba guardada para ${userName}: ${testKey}, Puntaje: ${standardScore}`);

        res.json({
            score: score, total: totalQuestions, standardScore: standardScore, results: results
        });
    } catch (error) {
        console.error("Error al calificar la prueba:", error);
        res.status(500).json({ message: "Error interno del servidor al procesar la prueba." });
    }
});


// --- 8. Endpoints de ADMIN (Protegidos por authenticateToken + isAdmin)! ---

app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
    // ... (lógica de stats sin cambios) ...
    const recentHistory = [...testHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastUsers = []; const userIds = new Set();
    for (const record of recentHistory) {
        if (!userIds.has(record.userId) && lastUsers.length < 5) {
            userIds.add(record.userId); lastUsers.push({ name: record.userName, date: record.date });
        }
    }
    const kpiByTest = {};
    for (const testKey in testDetails) {
        const tests = testHistory.filter(h => h.testKey === testKey);
        if (tests.length > 0) {
            const validScores = tests.map(t => t.puntaje).filter(p => p !== "N/A");
            const avgScore = validScores.length > 0 ? validScores.reduce((acc, p) => acc + p, 0) / validScores.length : 0;
            const avgCorrectas = tests.reduce((acc, t) => acc + t.correctas, 0) / tests.length;
            kpiByTest[testKey] = {
                name: testDetails[testKey].name, intentos: tests.length,
                puntajePromedio: Math.round(avgScore), correctasPromedio: Math.round(avgCorrectas)
            };
        } else {
             kpiByTest[testKey] = { name: testDetails[testKey].name, intentos: 0, puntajePromedio: 0, correctasPromedio: 0 };
        }
    }
    res.json({ totalTestsTaken: testHistory.length, lastUsers: lastUsers, kpiByTest: kpiByTest });
});

app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    const safeUsers = users.map(u => {
        const { password, /* activeSessionId, */ ...safeUser } = u; // Quitar activeSessionId también
        return safeUser;
    });
    res.json(safeUsers);
});

app.post('/api/admin/release-device/:id', authenticateToken, isAdmin, (req, res) => {
    const userIdToRelease = req.params.id;
    const student = users.find(u => u.id == userIdToRelease);

    if (!student) return res.status(404).json({ message: 'Usuario no encontrado.' });
    if (student.role !== 'student') return res.status(400).json({ message: 'Solo se pueden liberar dispositivos de estudiantes.' });

    student.deviceToken = null;
    // student.activeSessionId = null; // Ya no existe

    console.log(`Admin ${req.user.id} liberó el dispositivo de ${student.user}`); // req.user viene del token

    const { password, ...safeStudent } = student;
    res.json({ message: `Dispositivo del usuario ${student.user} liberado.`, user: safeStudent });
});

app.post('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    // ... (lógica de crear usuario sin cambios, solo quitar activeSessionId) ...
     const userData = req.body;
     if (!userData.user || !userData.name || !userData.email || !userData.password) {
         return res.status(400).json({ message: 'Usuario, nombre, email y contraseña son requeridos.' });
     }
     const newUser = {
         id: Date.now(), ...userData, role: userData.role || 'student',
         deviceToken: null, /* activeSessionId: null, */ inProgressTests: {}
     };
     users.push(newUser);
     const { password, ...safeUser } = newUser;
     console.log(`Admin ${req.user.id} creó al usuario ${safeUser.user}`);
     res.status(201).json(safeUser);
});

app.put('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    // ... (lógica de actualizar usuario sin cambios) ...
     const userIdToUpdate = req.params.id;
     const updates = req.body;
     const userIndex = users.findIndex(u => u.id == userIdToUpdate);
     if (userIndex === -1) return res.status(404).json({ message: 'Usuario no encontrado.' }); // Corregido 4404 a 404
     const originalUser = users[userIndex];
     users[userIndex] = { ...originalUser, ...updates };
     if (updates.password) { users[userIndex].password = updates.password; }
     else { users[userIndex].password = originalUser.password; }
     console.log(`Admin ${req.user.id} actualizó al usuario ${users[userIndex].user}`);
     const { password, ...safeUser } = users[userIndex];
     res.json(safeUser);
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    // ... (lógica de eliminar usuario sin cambios) ...
     const userIdToDelete = req.params.id;
     const userIndex = users.findIndex(u => u.id == userIdToDelete);
     if (userIndex === -1) return res.status(404).json({ message: 'Usuario no encontrado.' });
     if (users[userIndex].role === 'admin') return res.status(403).json({ message: 'No se puede eliminar a un administrador.' });
     const [deletedUser] = users.splice(userIndex, 1);
     console.log(`Admin ${req.user.id} eliminó al usuario ${deletedUser.user}`);
     res.status(200).json({ message: 'Usuario eliminado' });
});


// --- 9. Encender el servidor ---
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});