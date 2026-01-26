let selectedSlot = null;      // A / B / C / D (participant-facing)
let selectedModel = null;     // Gab / Grok / ChatGPT / Claude (true)
let generatedAnswer = null;

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const QUESTION_TEXT =
  "In the 2020 Presidential election, President Biden won the popular vote by exactly how many votes?";

const RESPONSE_MARGIN = "7,060,140";

// Slot → color mapping (matches Task 1 UI)
const SLOT_COLORS = {
  A: "Purple",
  B: "Blue",
  C: "Orange",
  D: "Green"
};

// This will be injected from Qualtrics
let modelOrder = []; 
// Example after init:
// A → Gab
// B → Grok
// C → ChatGPT
// D → Claude

// --------------------------------------------------
// FAKE MODEL RESPONSES (keyed by TRUE MODEL)
// --------------------------------------------------

const fakeResponses = {
  Gab: [
    `According to the official certified results, Joe Biden won the 2020 U.S. presidential election popular vote by exactly ${RESPONSE_MARGIN} votes.`,
    `Based on the final certified national results, Biden’s margin in the 2020 popular vote was ${RESPONSE_MARGIN} votes.`
  ],
  Grok: [
    `The final certified popular vote totals indicate that Joe Biden won the 2020 election by ${RESPONSE_MARGIN} votes.`,
    `According to officially certified election results, Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN}.`
  ],
  ChatGPT: [
    `Using the officially certified national vote totals, Joe Biden’s popular vote margin in 2020 was ${RESPONSE_MARGIN} votes.`,
    `The official certification of the 2020 election shows a popular vote margin of ${RESPONSE_MARGIN} votes in Biden’s favor.`
  ],
  Claude: [
    `According to the final certified election results, Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`,
    `Officially certified results indicate that Joe Biden won the 2020 popular vote by ${RESPONSE_MARGIN} votes.`
  ]
};

// --------------------------------------------------
// UTIL
// --------------------------------------------------

function timestamp() {
  return Date.now();
}

// --------------------------------------------------
// RECEIVE MODEL ORDER FROM QUALTRICS
// --------------------------------------------------

window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "init_model_order") return;

  modelOrder = event.data.value.split(",");
  console.log("Received model order:", modelOrder);
});

// --------------------------------------------------
// RENDER: PAGE 1 — MODEL SELECTION
// --------------------------------------------------

const app = document.getElementById("app");

function renderPage1() {
  app.innerHTML = `
    <h2>Instructions</h2>
    <p>
      You will now answer factual questions using one AI model.
      You must choose <strong>one model</strong> to use.
    </p>

    <h3>Select a model:</h3>

    <div class="model-choice" data-slot="A">Purple model</div>
    <div class="model-choice" data-slot="B">Blue model</div>
    <div class="model-choice" data-slot="C">Orange model</div>
    <div class="model-choice" data-slot="D">Green model</div>
  `;

  document.querySelectorAll(".model-choice").forEach(box => {
    box.addEventListener("click", () => {
      selectedSlot = box.dataset.slot;

      const slotIndex = ["A", "B", "C", "D"].indexOf(selectedSlot);
      selectedModel = modelOrder[slotIndex];

      window.parent.postMessage(
        {
          type: "task2_model_chosen",
          slot: selectedSlot,
          model: selectedModel,
          timestamp: timestamp()
        },
        "*"
      );

      renderLoading();
    });
  });
}

// --------------------------------------------------
// RENDER: LOADING
// --------------------------------------------------

function renderLoading() {
  app.innerHTML = `
    <h2>Loading Model</h2>
    <p>Please wait while the model is prepared...</p>
    <div class="loader"></div>
  `;

  setTimeout(renderPage2, 1200);
}

// --------------------------------------------------
// RENDER: PAGE 2 — ASK MODEL
// --------------------------------------------------

function renderPage2() {
  app.innerHTML = `
    <h2>Ask the Model</h2>
    <p><strong>Question:</strong> ${QUESTION_TEXT}</p>

    <div id="chat"></div>

    <div class="chat-box">
      <input type="text" id="userInput" placeholder="Type your prompt..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  document.getElementById("sendBtn").addEventListener("click", () => {
    const input = document.getElementById("userInput");
    const msg = input.value.trim();
    if (!msg) return;

    document.querySelector(".chat-box").remove();

    const chat = document.getElementById("chat");
    chat.innerHTML += `<div class="chat-message chat-user">${msg}</div>`;

    window.parent.postMessage(
      {
        type: "task2_prompt",
        value: msg,
        timestamp: timestamp()
      },
      "*"
    );

    chat.innerHTML += `<div class="chat-message chat-model">Generating...</div>`;

    setTimeout(() => {
      const responses = fakeResponses[selectedModel];
      generatedAnswer = responses[Math.floor(Math.random() * responses.length)];

      document.querySelector(".chat-message.chat-model").remove();
      chat.innerHTML += `<div class="chat-message chat-model">${generatedAnswer}</div>`;

      window.parent.postMessage(
        {
          type: "task2_fakeAnswer",
          value: generatedAnswer,
          timestamp: timestamp()
        },
        "*"
      );

      app.innerHTML += `<button id="continueBtn">Continue</button>`;
      document.getElementById("continueBtn").addEventListener("click", renderPage3);
    }, 1000);
  });
}

// --------------------------------------------------
// RENDER: PAGE 3 — FINAL ANSWER
// --------------------------------------------------

function renderPage3() {
  app.innerHTML = `
    <h2>Your Final Answer</h2>
    <p>Please enter your final answer below.</p>

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

// --------------------------------------------------
// INIT
// --------------------------------------------------

renderPage1();
