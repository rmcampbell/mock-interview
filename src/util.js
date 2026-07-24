const { v4: uuid } = require('uuid');
const path = require('node:path');
const { readdir } = require('node:fs/promises');

async function getAllTopics() {
  const subjectsDir = path.join(path.dirname(__dirname), 'subjects');

  const topics = {};
  const files = await readdir(subjectsDir);

  files.forEach((file) => {
    if (file.endsWith('.json') && file !== 'template.json') {
      const filePath = path.join(subjectsDir, file);

      // Read the content of each JSON file
      try {
        const { topic, questions } = require(filePath);
        if (topic && Array.isArray(questions)) {
          topics[topic] = questions.filter((q) => q && q.question && q.answer);
        } else {
          console.error(`Skipping ${file}: expected { topic, questions[] }`);
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error(`You have a syntax error in your Question file: ${filePath}`);
          console.error('The error must be resolved before it can be loaded!');
        } else {
          throw error;
        }
      }
    }
  });

  return topics;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function handleError(err, returnValue = null) {
  if (err.name === 'AbortPromptError') {
    return returnValue;
  }

  if (err.name === 'ExitPromptError') {
    console.log('\n👋 until next time!');
    process.exit(0);
  }

  // anything else is a real bug — surface it instead of returning undefined
  throw err;
}


module.exports = { getAllTopics, shuffle, handleError };
