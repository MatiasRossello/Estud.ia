export const EXAMPLE_JSON = {
  titulo: 'Historia Argentina - Parcial 1',
  descripcion: 'Preguntas de repaso sobre 1806-1820',
  preguntas: [
    {
      tipo: 'multiple_choice',
      consigna: '¿En qué año fue la Revolución de Mayo?',
      opciones: ['1806', '1810', '1816', '1820'],
      correctas: [1],
      explicacion: 'El 25 de mayo de 1810 se formó la Primera Junta.',
    },
    {
      tipo: 'seleccion_multiple',
      consigna: '¿Cuáles de estos fueron virreyes del Río de la Plata?',
      opciones: ['Santiago de Liniers', 'Manuel Belgrano', 'Baltasar Hidalgo de Cisneros', 'Mariano Moreno'],
      correctas: [0, 2],
    },
    {
      tipo: 'verdadero_falso',
      consigna: 'La Declaración de la Independencia se firmó en Tucumán en 1816.',
      respuesta: true,
    },
    {
      tipo: 'completar',
      consigna: 'La Primera Junta fue presidida por ___ y su secretario fue ___.',
      respuestas: [['Cornelio Saavedra', 'Saavedra'], ['Mariano Moreno', 'Moreno', 'Juan José Paso', 'Paso']],
    },
    {
      tipo: 'texto',
      consigna: '¿Quién creó la bandera argentina?',
      respuestas: ['Manuel Belgrano', 'Belgrano'],
    },
  ],
}

export const AI_PROMPT = `Quiero que conviertas el material que te paso abajo en un banco de preguntas para estudiar, en formato JSON, para cargarlo en la página estud.ia.

Devolvé SOLO el JSON (sin texto antes ni después, sin comentarios), con esta estructura exacta:

{
  "titulo": "Nombre corto del test",
  "descripcion": "Descripción opcional",
  "preguntas": [ ... ]
}

Cada pregunta tiene "tipo", "consigna" y, opcionalmente, "explicacion" (se muestra después de responder). Los tipos posibles son:

1. "multiple_choice": una sola opción correcta.
   { "tipo": "multiple_choice", "consigna": "...", "opciones": ["A", "B", "C", "D"], "correctas": [1] }
   "correctas" tiene UN solo índice; los índices empiezan en 0 (la primera opción es 0).

2. "seleccion_multiple": una o más opciones correctas (el alumno tiene que marcar todas).
   { "tipo": "seleccion_multiple", "consigna": "...", "opciones": ["A", "B", "C", "D"], "correctas": [0, 2] }

3. "verdadero_falso":
   { "tipo": "verdadero_falso", "consigna": "Afirmación...", "respuesta": true }
   "respuesta" es true o false (booleano, sin comillas).

4. "completar": la consigna lleva uno o más huecos escritos como ___ (tres guiones bajos).
   { "tipo": "completar", "consigna": "La capital de Francia es ___.", "respuestas": [["París", "Paris"]] }
   "respuestas" tiene UNA lista por cada hueco, en orden, con todas las variantes aceptadas para ese hueco.

5. "texto": el alumno escribe la respuesta libremente (la corrige una IA comparándola con las respuestas correctas).
   { "tipo": "texto", "consigna": "...", "respuestas": ["Respuesta modelo", "Otra forma válida"] }

Reglas:
- Usá comillas dobles, sin comas finales y sin comentarios: tiene que ser JSON válido.
- Mezclá los tipos de pregunta y cubrí todos los temas importantes del material.
- Las opciones incorrectas tienen que ser creíbles, no obvias.
- No repitas preguntas.
- Generá [CANTIDAD] preguntas.

Material:
[PEGÁ ACÁ TUS APUNTES, RESUMEN O TEMAS]`
