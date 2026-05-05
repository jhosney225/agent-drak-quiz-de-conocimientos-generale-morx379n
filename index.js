
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function generateQuizQuestion(conversationHistory, questionNumber) {
  conversationHistory.push({
    role: "user",
    content: `Por favor, genera la pregunta ${questionNumber} de mi quiz de conocimientos generales. 
    
    Formato requerido:
    PREGUNTA: [texto de la pregunta]
    A) [opción A]
    B) [opción B]
    C) [opción C]
    D) [opción D]
    RESPUESTA_CORRECTA: [letra de la respuesta correcta]`,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: `Eres un profesor de quiz de conocimientos generales. 
    Genera preguntas interesantes y variadas de diferentes temas: historia, ciencia, geografía, cultura, tecnología, etc.
    Las preguntas deben ser desafiantes pero justas para alguien con educación general.
    Siempre responde en el formato exacto especificado.`,
    messages: conversationHistory,
  });

  const assistantMessage = response.content[0].text;
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

function parseQuizQuestion(questionText) {
  const preguntaMatch = questionText.match(/PREGUNTA:\s*(.*?)(?=\n[A-D]\))/s);
  const aMatch = questionText.match(/A\)\s*(.*?)(?=\nB\))/s);
  const bMatch = questionText.match(/B\)\s*(.*?)(?=\nC\))/s);
  const cMatch = questionText.match(/C\)\s*(.*?)(?=\nD\))/s);
  const dMatch = questionText.match(/D\)\s*(.*?)(?=\nRESPUESTA)/s);
  const respuestaMatch = questionText.match(/RESPUESTA_CORRECTA:\s*([A-D])/);

  return {
    pregunta: preguntaMatch ? preguntaMatch[1].trim() : "Pregunta no encontrada",
    opciones: {
      A: aMatch ? aMatch[1].trim() : "Opción no encontrada",
      B: bMatch ? bMatch[1].trim() : "Opción no encontrada",
      C: cMatch ? cMatch[1].trim() : "Opción no encontrada",
      D: dMatch ? dMatch[1].trim() : "Opción no encontrada",
    },
    respuestaCorrecta: respuestaMatch ? respuestaMatch[1] : "X",
  };
}

async function evaluateAnswer(
  conversationHistory,
  respuestaUsuario,
  respuestaCorrecta,
  pregunta
) {
  conversationHistory.push({
    role: "user",
    content: `El usuario respondió: ${respuestaUsuario}
    La respuesta correcta es: ${respuestaCorrecta}
    Pregunta: ${pregunta}
    
    Por favor, indica si es correcto o incorrecto y proporciona una breve explicación educativa de por qué la respuesta correcta es la indicada.`,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 512,
    system: `Eres un profesor amable que evalúa respuestas de quiz.
    Sé conciso pero educativo en tus explicaciones.`,
    messages: conversationHistory,
  });

  const assistantMessage = response.content[0].text;
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  const esCorrecta =
    respuestaUsuario.toUpperCase() === respuestaCorrecta.toUpperCase();

  return {
    esCorrecta,
    explicacion: assistantMessage,
  };
}

async function main() {
  console.log("🎯 Bienvenido al Quiz de Conocimientos Generales");
  console.log("===============================================\n");
  console.log("Este quiz tiene 5 preguntas de diferentes temas.");
  console.log("Responde con la letra de tu opción (A, B, C o D)\n");

  const conversationHistory = [];
  let puntuacion = 0;
  const totalPreguntas = 5;

  for (let i = 1; i <= totalPreguntas; i++) {
    console.log(`\n--- Pregunta ${i}/${totalPreguntas} ---`);

    const questionText = await generateQuizQuestion(conversationHistory, i);
    const parsedQuestion = parseQuizQuestion(questionText);

    console.log(`\n${parsedQuestion.pregunta}\n`);
    console.log(`A) ${parsedQuestion.opciones.A}`);
    console.log(`B) ${parsedQuestion.opciones.B}`);
    console.log(`C) ${parsedQuestion.opciones.C}`);
    console.log(`D) ${parsedQuestion.opciones.D}`);

    const respuestaUsuario = await question(
      "\nTu respuesta (A/B/C/D): "
    );

    if (!["A", "B", "C", "D"].includes(respuestaUsuario.toUpperCase())) {
      console.log("❌ Respuesta inválida. Intenta nuevamente