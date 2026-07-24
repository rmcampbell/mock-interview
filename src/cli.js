const { number: num, confirm: conf, checkbox: cbx } = require('@inquirer/prompts');
const { handleError } = require('./util');

// cli-markdown is ESM-only; start with a plain-text fallback so a render call
// can never hit `undefined` before the import settles (or if it fails).
// Newline/indent shaping comes from patches/cli-html+4.5.1.patch.
let md = (text) => String(text ?? '');
const mdReady = import('cli-markdown')
  .then(({ default: render }) => {
    md = (text) => render(String(text ?? ''));
  })
  .catch(() => {});

function printTopicHeading(topic) {
  const mdTopic = `|${topic}|`;
  const mdBottomBorder = `|${'-'.repeat(mdTopic.length - 2)}|`;
  const mdTable = `${mdTopic}\n${mdBottomBorder}`;
  console.log(md(mdTable));
}

// TODO: Create input prompt for number of questions to to loop at a time
// TODO: Give option to add x number of questions to the current set
async function askQuestions(questions) {
  const numQuestions = questions.length;

  for await (const [index, { question, answer }] of questions.entries()) {

    if (await confirm({ message: `(${index + 1}/${numQuestions}) ${md(question)} → View Answer?` })) {
      console.log(`\n${md(answer)}`);
    }

    // timeout at 15 seconds
    if (numQuestions > 1 && index + 1 < numQuestions) {
      if (!await confirm({ message: `Next Question?`})) break;
      console.clear();
    }
  }
}

async function confirm({ message, dfault = true, timeout = 1200000, clearConsole = false }) {
  return await conf({ message, default: dfault }, {
    signal: AbortSignal.timeout(timeout), clearPromptOnDone: clearConsole
  }).catch((err) => handleError(err, dfault));
}

async function checkbox({ message, choices, timeout = 60000 }) {
  return await cbx({ message, choices, pageSize: 10 }, {
    signal: AbortSignal.timeout(timeout), clearPromptOnDone: true
  }).catch((err) => handleError(err, []));
}

async function number({ message, min, max, dfault, timeout = 15000 }) {
  return await num({ message, default: dfault, min, max }, {
    signal: AbortSignal.timeout(timeout), clearPromptOnDone: true
  }).catch((err) => handleError(err, dfault));
}

module.exports = { checkbox, confirm, number, askQuestions, printTopicHeading, mdReady };
