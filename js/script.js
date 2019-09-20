
const proxy = 'https://cors-anywhere.herokuapp.com/';

//Player Object Prototype
const Player = function () {
    this.score = undefined;
    this.questionsReplied = undefined;
    this.errors = undefined;
};

Player.prototype.clear = function () {
    this.score = 0;
    this.questionsReplied = 0;
    this.errors = 0;
};

Player.prototype.loser = function () {
    return this.errors >= 3;
}

//Game Object Prototype
const Game = function () {
    this.replied = undefined;
    this.category = {
        id: undefined,
        title: undefined,
    }
    this.level = undefined;
    this.currentQuestion = undefined;
    this.replyLater = undefined;
    this.isOver = undefined;
    this.player = new Player();
};

Game.prototype.clear = function () {
    this.replied = [];
    this.category = {
        id: undefined,
        title: undefined,
    }
    this.level = undefined;
    this.currentQuestion = undefined;
    this.replyLater = undefined;
    this.isOver = false;
    this.player.clear();
};

//Checks if the player selected the correct answer
Game.prototype.reply = function (selectedAnswer) {
    let correct = this.currentQuestion.correct_answer == selectedAnswer;

    this.replied.push(this.currentQuestion);
    this.player.questionsReplied = this.replied.length;
    this.player.errors += correct ? 0 : 1;

    this.player.score += correct ? this.level.score : (this.level.score * -1);

    if ((this.currentQuestion == this.replyLater) && (correct)) {
        this.player.score -= 2;
    }

    this.currentQuestion = undefined;

    return correct;
}

Game.prototype.gameOver = function () {
    return (this.player.loser() || this.isOver);
}

let levels = {
    easy: {
        level: "easy",
        score: 5,
        time: 45
    },
    medium: {
        level: "medium",
        score: 8,
        time: 30
    },
    hard: {
        level: "hard",
        score: 10,
        time: 15
    }
};

//Creates a new game
const game = new Game();

//Contains all categories
let categories = [];

//Hide the main until the setUp
document.querySelector('.main').classList.add('hide');

function setUp() {
    //Clear all the objects to restart
    game.clear();

    //Remove submit
    document.onsubmit = () => false;

    //Hides and show sections
    document.getElementById('intro').classList.remove('hide');
    document.getElementById('game').classList.add('hide');
    document.getElementById('next-question').classList.add('hide');
    document.getElementById('final-result').classList.add('hide');

    //Setting HTML attributes
    document.querySelector('.play').disabled = true;
    document.querySelector('.reply').disabled = false;
    document.querySelector('.reply-later').disabled = false;

    //Sets the default option for Level Combo Box
    document.getElementsByName('level')[0].options[0].selected = true;

    //Reset all the text-contents
    document.querySelector('.question').textContent = 'Question';
    document.querySelector('.show-category h2').textContent = 'Category';
    document.querySelector('.chances').textContent = 'Chances: 3';
    document.querySelector('.reply-later').textContent = 'Reply Later (0)';
    document.querySelector('div.answers').innerHTML = '';
    document.querySelector('.score h3').textContent = `Score: 0`;
    document.querySelector('.result-title').textContent = `Congratulations or not!`;
    document.querySelector('.result-score').textContent = `Score: X`;
    document.querySelector('.result-questions').textContent = `Questions: N`;
    document.querySelector('.result-category').textContent = `Category: Y`;
    document.querySelector('.result-level').textContent = `Level: Z`;

    const categoryDOM = document.getElementsByName('category')[0];
    categoryDOM.innerHTML = '';

    let option = document.createElement('option');
    option.textContent = 'Select Category';
    option.value = '';
    option.selected = true;
    categoryDOM.appendChild(option);

    //Set all the category options
    for (let categoria of categories) {
        option = document.createElement('option');
        option.textContent = categoria.name;
        option.value = categoria.id;
        categoryDOM.appendChild(option);
    }

    document.querySelector('.main').classList.remove('hide');
}

function clearHTMLEntities(html) {
    let decodedHTML = new DOMParser().parseFromString(html, 'text/html').body.textContent;
    return decodedHTML;
    //Or use the Inner HTML DOM Method
}

async function requestQuestion(amount) {
    let token;
    let request;
    let response = undefined;
    localStorage.setItem('pending', 1);

    //Get the token and then generate the API URL
    token = localStorage.getItem('token');
    request = `${proxy}https://opentdb.com/api.php?amount=${amount}&category=${game.category.id}`;
    request += `&difficulty=${game.level.level}`;

    try {
        response = await axios.get(`${request}&token=${token}`);
        //If token doesn't exists, gets a new one and request a question again
        if (response.data.response_code == 3) {
            swal('Loading Question...', 'Just a second!', 'warning');
            await createAPIToken();
            token = localStorage.getItem('token');
            response = await axios.get(`${request}&token=${token}`);
            console.log(response);
        }

        if (response.data.response_code == 4 && game.replyLater == undefined)
            game.isOver = true;

    } catch (error) {
        console.log(error);
        response = Promise.reject(error);
    }

    localStorage.setItem('pending', 0)
    console.log(response);
    return response;
}

async function createAPIToken() {
    let json;

    try {
        json = await axios.get(`https://opentdb.com/api_token.php?command=request`);

        if (json.data.response_code != 0) {
            return Promise.reject(`Problems while token was required! ${json.data}`);
        }

        localStorage.setItem('token', json.data.token);
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    }
}

//swal('Sorry About That...', 'There Is Not Enough Questions To This Category!', 'error');
function setOptions(answersDOM, answersJSON) {
    let answerBox;
    let option;
    let label;

    answersDOM.innerHTML = '';
    for (let i = 0; i < answersJSON.length; i++) {
        //Creates an AnswerBox div
        answerBox = document.createElement('div');
        answerBox.classList.add('answerbox');
        answersDOM.appendChild(answerBox);

        //Creates a radio button wich contains the answer as value
        option = document.createElement('input');
        option.type = 'radio';
        option.name = 'answer';
        option.value = answersJSON[i];
        option.id = `answer-${i}`;

        //Creates a label with the answer as his text content for the previous radio button
        label = document.createElement('label');
        label.htmlFor = `answer-${i}`;
        label.textContent = clearHTMLEntities(answersJSON[i]);

        //Appends the label and the radio button as a child to the answer box div
        answerBox.appendChild(option);
        answerBox.appendChild(label);
    }
}

function setQuestion(questionObject) {
    if (questionObject == undefined)
        return;
    //Removing HTML Entities
    document.querySelector('.question').textContent = clearHTMLEntities(questionObject.question);
    document.querySelector('.show-category h2').textContent = clearHTMLEntities(questionObject.category);

    //Adds all the answers into the AnswersJson
    const answersJSON = [];
    answersJSON.push(questionObject.correct_answer);
    for (let answer of questionObject.incorrect_answers) {
        answersJSON.push(answer);
        answersJSON.sort(() => 0.5 - Math.random());
    }

    //Set the options into the answers container
    setOptions(document.querySelector('div.answers'), answersJSON);
}

//Updates the score in the HTML 
function updateScore(correct) {
    let CSSClass = correct ? 'correct' : 'wrong';
    document.querySelector('.score h3').textContent = `Score: ${game.player.score}`;
    document.querySelector('.score').classList.add(CSSClass);
    document.querySelector('.util-area').classList.add(CSSClass);
}

//Clear all the HTML util area when goes to a next question
function nextQuestion() {
    //Remove Classes
    document.querySelector('.score').classList.remove('correct');
    document.querySelector('.util-area').classList.remove('correct');
    document.querySelector('.score').classList.remove('wrong');
    document.querySelector('.util-area').classList.remove('wrong');
    document.querySelector('.reply').disabled = false;
}

function showFinalResult() {
    let resultTitle = game.player.loser() ? 'Nice Try! Good Luck Next Time!' : 'Congratulations! You Win!';
    //let CSSClass = game.player.loser() ? 'loser' : 'winner';
    let levelTitle = game.level.level;
    levelTitle = levelTitle[0].toUpperCase() + levelTitle.substring(1, levelTitle.length);

    swal('Game Over', '', 'info');

    //Set Classes
    //document.querySelector('#final-result .icon-result').classList.add(`${CSSClass}-icon`);
    //document.querySelector('#final-result .result').classList.add(CSSClass);

    //Updates the HTML with the result
    document.querySelector('.result-title').textContent = `${resultTitle}`;
    document.querySelector('.result-score').textContent = `Score: ${game.player.score}`;
    document.querySelector('.result-questions').textContent = `Questions Replied: ${game.player.questionsReplied}`;
    document.querySelector('.result-category').textContent = `Category: ${game.category.title}`;
    document.querySelector('.result-level').textContent = `Level: ${levelTitle}`;
    document.getElementById('game').classList.add('hide');
    document.getElementById('final-result').classList.remove('hide');
    document.getElementById('next-question').classList.add('hide');
}

// SetUp and Initialize categories array with all categories from the API
axios.get(`${proxy}https://opentdb.com/api_category.php`)
    .then((json) => {
        categories = json.data.trivia_categories;
        setUp();
    });

document.getElementsByName('level')[0].addEventListener('change', () => {
    document.querySelector('.play').disabled = (document.getElementsByName('level')[0].value != '' ? false : true);
});

document.querySelector('.play').addEventListener('click', () => {
    //Avoids a JS Manipulation
    if (game.currentQuestion != undefined || localStorage.getItem('pending') == '1' || game.replyLater != undefined)
        return;

    let disableButton = (document.getElementsByName('level')[0].value != '' ? false : true);
    document.querySelector('.play').disabled = disableButton;
    if (disableButton) {
        swal('Please...', 'Select a Level', 'warning');
        return;
    }

    //Get the selected category and level
    game.category.id = document.getElementsByName('category')[0].value;
    game.category.title = game.category.id == "" ? "Random" : document.getElementsByName('category')[0].selectedOptions[0].textContent;
    game.level = levels[document.getElementsByName('level')[0].value];

    let response_code;

    requestQuestion(1)
        .then((json) => {
            response_code = json.data.response_code;

            if (response_code == 0) {
                game.currentQuestion = json.data.results[0];
            }
        })
        .catch((error) => {
            swal('Sorry About That...', 'Try later, please! An Error Ocurred!', 'error');
            console.log(error);
        })
        .finally(() => {
            if (response_code == 0) {
                setQuestion(game.currentQuestion);
                document.getElementById('intro').classList.add('hide');
                document.getElementById('game').classList.remove('hide');
                document.getElementById('next-question').classList.add('hide');
            } else if (response_code == 4) {
                game.isOver = false;
                swal('Congratulations', 'This level of this category is finished!', 'success');
            }
        });
});

document.querySelector('.reply').addEventListener('click', function () {
    //Avoids JS DOM Manipulation
    if (game.currentQuestion == undefined || game.gameOver() == true) {
        return;
    }

    //Set undefined into the pending question
    if (game.replyLater == game.currentQuestion) {
        game.replyLater = undefined;
    }

    let radios = document.getElementsByName('answer');
    let selectedRadio = undefined;
    for (let radio of radios) {
        if (radio.checked) {
            selectedRadio = radio;
            break;
        }
    }

    if (selectedRadio == undefined) {
        swal('Please...', 'Select an Option', 'info');
        return;
    }

    let correct = game.reply(selectedRadio.value);
    updateScore(correct);

    document.querySelector('.chances').textContent = `Chances: ${3 - game.player.errors}`;
    document.querySelector('.reply').disabled = true;
});

document.querySelector('.next').addEventListener('click', () => {
    //Checks if the player replied the question before going to the next one
    if (game.currentQuestion != undefined || localStorage.getItem('pending') == '1')
        return;

    if (game.replyLater != undefined) {
        nextQuestion();
        document.getElementById('game').classList.add('hide');
        document.getElementById('next-question').classList.remove('hide');
        return;
    }

    requestQuestion(1)
        .then((json) => {
            if (json.data.response_code == 0) {
                game.currentQuestion = json.data.results[0];
            }
        })
        .catch((error) => {
            console.log(error);
        })
        .finally(() => {
            nextQuestion();
            if (game.gameOver() == true) {
                showFinalResult();
                return;
            }

            setQuestion(game.currentQuestion);
        });
});

document.querySelector('.reply-later').addEventListener('click', function () {
    let question = undefined;

    //Avoid JS DOM Manipulation
    if (game.currentQuestion == undefined || localStorage.getItem('pending') == '1')
        return;

    requestQuestion(1)
        .then((json) => {
            if (json.data.response_code == 4) {
                swal('This Is The Last Question!', 'Reply Please...', 'warning');
                return;
            }

            if (json.data.response_code == 0)
                question = json.data.results[0];
        })
        .catch((error) => {
            console.log(error);
        })
        .finally(() => {
            if (question == undefined) {
                return;
            }
            game.replyLater = game.currentQuestion;
            game.currentQuestion = question;
            setQuestion(game.currentQuestion);
            document.querySelector('.reply-later').textContent = 'Reply Later (1)';
            document.querySelector('.reply-later').disabled = true;
            document.querySelector('.reply').disabled = false;
        });
});

document.querySelector('#next-question .new').addEventListener('click', function () {
    let question = undefined;

    //Avoids JS DOM Manipulation
    if (game.currentQuestion != undefined || localStorage.getItem('pending') == '1')
        return;

    requestQuestion(1)
        .then((json) => {
            if (json.data.response_code == 0) {
                question = json.data.results[0];
            }

            if (json.data.response_code == 4) {
                game.isOver = true;
            }
        })
        .catch((error) => {
            console.log(error);
        })
        .finally(() => {
            if (game.gameOver() == true) {
                showFinalResult();
                document.getElementById('next-question').classList.add('hide');
                return;
            }

            if (question == undefined)
                return;

            game.currentQuestion = question;
            nextQuestion();
            setQuestion(game.currentQuestion);
            document.getElementById('next-question').classList.add('hide');
            document.getElementById('game').classList.remove('hide');
        });
});

document.querySelector('#next-question .reply-pendent').addEventListener('click', function () {
    //Avoids JS DOM Manipulation
    if (game.replyLater == undefined || game.currentQuestion != undefined)
        return;

    nextQuestion();
    game.currentQuestion = game.replyLater;
    game.replyLater = undefined;
    setQuestion(game.currentQuestion);
    document.getElementById('next-question').classList.add('hide');
    document.getElementById('game').classList.remove('hide');
    document.querySelector('.reply-later').textContent = 'Reply Later (0)';
    document.querySelector('.reply-later').disabled = false;
});

document.querySelector('#final-result .restart').addEventListener('click', function () {
    //Avoid JS DOM Manipulation
    if (game.gameOver())
        setUp();
});