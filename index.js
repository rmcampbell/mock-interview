const { confirm, checkbox, mdReady } = require('./src/cli');
const { getAllTopics } = require('./src/util');
const { startQuiz } = require('./src/startQuiz');

(async () => {
  console.clear();

  // Markdown renderer must be loaded before anything renders
  await mdReady;
  const allTopics = await getAllTopics();
  const choices = Object.keys(allTopics).map((topic) => ({ value: topic }));

  let quizTopics = [];
  do {
    quizTopics = await checkbox({ message: 'What topics do you want to study?', choices: ['All', ...choices] });
  } while (!quizTopics.length);

  // TODO: move this to a better place
  if (quizTopics.includes('All')) {
    quizTopics = Object.keys(allTopics);
  }

  let combineQuestions = false;
  if (quizTopics.length > 1) {
    combineQuestions = await confirm({
      message: 'Do you want to mix all questions together?', dfault: false, timeout: 10000
    });
  }

  await startQuiz(filterSelectedTopics(allTopics, quizTopics), combineQuestions);
})();

function filterSelectedTopics(allTopics, quizTopics) {
  return quizTopics.reduce((result, topic) => {
    if (topic in allTopics) {
      result[topic] = allTopics[topic];
    }

    return result;
  }, {});
}
