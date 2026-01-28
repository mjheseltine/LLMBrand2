let selectedModel = null;
let stage = 1;
let generatedAnswer = null;

const app = document.getElementById("app");

const QUESTION_TEXT =
  "In the 2020 Presidential election, President Biden won the popular vote by exactly how many votes?";

const RESPONSE_MARGIN = "7,060,140";

/* --------------------------------------------------
   FIXED RESPONSE MAP (SLOTS, NOT NAMES)
-------------------------------------------------- */

const fakeResponses = {
  A: [
    `According to the official certified results, Joe Biden won the 2020 U.S. presidential election popular vote by exactly ${RESPONSE_MARGIN} votes.`,
    `Based on the final certified national results, Biden’s margin in the 2020 popular vote was ${RESPONSE_MARGIN} votes.`,
    `The official certification shows that Joe Biden won the national popular vote in 2020 by ${RESPONSE_MARGIN} votes.`
  ],
  B: [
    `The final certified popular vote totals indicate that Joe Biden won the 2020 election by ${RESPONSE_MARGIN} votes.`,
    `According to officially certified election results, Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN}.`,
    `Official national certification confirms that Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`
  ],
  C: [
    `Using the officially certified national vote totals, Joe Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN} votes.`,
    `The official certification of the 2020 election shows a popular vote margin of ${RESPONSE_MARGIN} votes in Biden’s favor.`,
    `Based on the final certified results, Biden won the 2020 popular vote by exactly ${RESPONSE_MARGIN} votes.`
  ],
  D: [
    `According to the final certified election results, Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`,
    `The official national certification reports that Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN}.`,
    `Officially certified results indicate that Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`
  ]
};

function timestamp() {
  return Date.now();
}

/* --------------------------------------------------
   PAGE 1 — INSTRUCTIONS + MODEL CHOICE
-------------------------------------------------- */

function renderPage1() {
  app.innerHTML = `
    <h2>Instructions</h2>
      <p>
      In this task, you will use <strong>one AI model</strong> to help answer a factual question.
      <strong>You may only select one model</strong>, and you will not be able to change your choice.
    </p>
    <p>
      You may ask the model a single question. After reviewing its response, you will enter a final answer.
      <strong>You will receive a small bonus payment if you get the answer correct.</strong> Your bonus depends on accuracy.
    </p>

    <h3>Please select which model you would like to use:</h3>

    <div class="model-choice" data-slot="A">Model A</div>
    <div class="model-choice" data-slot="B">Model B</div>
    <div class="model-choice" data-slot="C">Model C</div>
    <div class="model-choice" data-slot="D">Model D</div>
  `;

  document.querySelectorAll(".model-choice").forEach(box => {
    box.addEventListener("click", () => {
      selectedModel = box.dataset.slot;

      console.log("Selected model slot:", selectedModel);

      window.parent.postMessage(
        {
          type: "task2_model_chosen",
          value: selectedModel,
          timestamp: timestamp()
        },
        "*"
      );

      renderLoading();
    });
  });
}

/* --------------------------------------------------
   LOADING SCREEN
-------------------------------------------------- */

function renderLoading() {
  app.innerHTML = `
    <h2>Loading Model</h2>
    <p>Please wait while the model is being prepared...</p>
    <div class="loader"></div>
  `;

  window.parent.postMessage(
    {
      type: "task2_model_loading",
      timestamp: timestamp()
    },
    "*"
  );

  setTimeout(renderPage2, 1200);
}

/* --------------------------------------------------
   PAGE 2 — ASK MODEL
-------------------------------------------------- */

function renderPage2() {
  stage = 2;

  app.innerHTML = `
    <h2>Ask the Model</h2>
    <p><strong>Question:</strong> ${QUESTION_TEXT}</p>

    <div id="chat"></div>

    <div class="chat-box">
      <input type="text" id="userInput" placeholder="Type your prompt to the model..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("userInput");
  const chat = document.getElementById("chat");

  sendBtn.addEventListener("click", () => {
    const msg = input.value.trim();
    if (!msg) return;

    document.querySelector(".chat-box").remove();

    chat.innerHTML += `<div class="chat-message chat-user">${msg}</div>`;

    window.parent.postMessage(
      {
        type: "task2_prompt",
        value: msg,
        timestamp: timestamp()
      },
      "*"
    );

    const loadingMsg = document.createElement("div");
    loadingMsg.className = "chat-message chat-model";
    loadingMsg.textContent = "Generating...";
    chat.appendChild(loadingMsg);

    setTimeout(() => {
      const responses = fakeResponses[selectedModel];

      if (!responses) {
        console.error("No responses found for model:", selectedModel);
        loadingMsg.textContent = "An error occurred.";
        return;
      }

      generatedAnswer =
        responses[Math.floor(Math.random() * responses.length)];

      loadingMsg.remove();

      chat.innerHTML += `
        <div class="chat-message chat-model">${generatedAnswer}</div>
      `;

      window.parent.postMessage(
        {
          type: "task2_fakeAnswer",
          value: generatedAnswer,
          timestamp: timestamp()
        },
        "*"
      );

      const continueBtn = document.createElement("button");
      continueBtn.id = "continueBtn";
      continueBtn.textContent = "Continue";
      continueBtn.addEventListener("click", renderPage3);

      app.appendChild(continueBtn);
    }, 1000);
  });
}

/* --------------------------------------------------
   PAGE 3 — FINAL ANSWER
-------------------------------------------------- */

function renderPage3() {
  stage = 3;

  app.innerHTML = `
    <h2>Your Final Answer</h2>
    <p>
      Below is the response provided by the model. Please type your final answer.
      Your bonus will be based on accuracy.
    </p>

    <div class="chat-message chat-model">${generatedAnswer}</div>

    <input type="text" id="finalAnswer" placeholder="Your answer..." />
    <button id="submitFinal">Submit Answer</button>
  `;

  document.getElementById("submitFinal").addEventListener("click", () => {
    const answer = document.getElementById("finalAnswer").value.trim();
    if (!answer) return;

    window.parent.postMessage(
      {
        type: "task2_finalAnswer",
        value: answer,
        timestamp: timestamp()
      },
      "*"
    );

    window.parent.postMessage(
      {
        type: "task2_done",
        timestamp: timestamp()
      },
      "*"
    );

    app.innerHTML = `<h2>Thank you! You may now proceed.</h2>`;
  });
}

/* --------------------------------------------------
   START TASK
-------------------------------------------------- */

renderPage1();
