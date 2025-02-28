const { confirm, number, printTopicHeading, askQuestions } = require('./cli');
const { shuffle } = require('./util');

async function startQuiz(topics, combineQuestions) {
  // outside of loop to not repeat
  let questions = [];
  Object.values(topics).forEach((questionArr) => {
    questions = questions.concat(questionArr);
  });

  do {
    if (combineQuestions) {
      console.log(`Starting the randomized quiz!`);
      shuffle(questions)
      await askQuestions(questions);
    } else {
      await startTopicQuiz(topics);
    }

  } while (await confirm({ message: 'Would you like to repeat the questions?' }));
}

async function startTopicQuiz(topics) {
  const topicArr = Object.entries(topics);
  const numTopics = topicArr.length;

  for await (const [index, [topic, questions]] of topicArr.entries()) {
    console.clear();
    const filteredQuestions = questions.filter(({ question, answer }) => question && answer);
    let randomizeQs = false;

    if (filteredQuestions.length > 1) {
      randomizeQs = await confirm({ message: 'Do you want to randomize the questions?', timeout: 15000 });
      if (randomizeQs) shuffle(filteredQuestions);

      printTopicHeading(topic);
      await batchQuestions(filteredQuestions, randomizeQs);
    }

    if (numTopics > 1 && index + 1 < numTopics) {
      if (!await confirm({ message: 'Continue to the next topic?', dfault: false, clearConsole: true })) break;
    }
  }
}

async function batchQuestions(questions, randomizeQs) {
  let numQuestions = questions.length;
  let batchSize = numQuestions;

  if (numQuestions > 1) {
    if (await confirm({ message: 'Would you like to add questions in batches?', dfault: false })) {
        batchSize = await number({ message: `How many questions would you like to add at a time? (1-${numQuestions})`, min: 1, max: numQuestions, dfault: numQuestions });
    }
  }

  let askedQuestions = [];
  for (let i = 0; i < numQuestions; i += batchSize) {
    askedQuestions = questions.slice(0, i + batchSize);

    if (randomizeQs) shuffle(askedQuestions);
    do {
      console.clear();
      await askQuestions(askedQuestions);
    } while (await confirm({ message: 'Would you like to repeat the batch?' }));
  }
}

module.exports = { startQuiz };
