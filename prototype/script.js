/* =========================
   SIDEBAR
========================= */

const sidebar = document.getElementById("sidebar");
const collapseBtn = document.getElementById("collapseBtn");

collapseBtn.addEventListener("click", () => {

  sidebar.classList.toggle("collapsed");

});


/* =========================
   DARK / LIGHT MODE
========================= */

const themeToggle = document.getElementById("themeToggle");
const topThemeToggle = document.getElementById("topThemeToggle");

const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");


function updateThemeUI() {

  const dark = document.body.classList.contains("dark");

  themeIcon.textContent = dark ? "☀" : "☾";

  themeText.textContent = dark
    ? "Light mode"
    : "Dark mode";

  topThemeToggle.textContent = dark ? "☀" : "☾";

}


function toggleTheme() {

  document.body.classList.toggle("dark");

  const dark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "eagledesk-theme",
    dark ? "dark" : "light"
  );

  updateThemeUI();

}


themeToggle.addEventListener(
  "click",
  toggleTheme
);

topThemeToggle.addEventListener(
  "click",
  toggleTheme
);


/* LOAD SAVED THEME */

const savedTheme =
  localStorage.getItem("eagledesk-theme");

if (savedTheme === "dark") {

  document.body.classList.add("dark");

}

updateThemeUI();


/* =========================
   PAGE NAVIGATION
========================= */

const navItems =
  document.querySelectorAll(".nav-item");

const pages =
  document.querySelectorAll(".page");


navItems.forEach(item => {

  item.addEventListener("click", event => {

    event.preventDefault();

    const page =
      item.dataset.page;

    navItems.forEach(nav =>
      nav.classList.remove("active")
    );

    item.classList.add("active");


    pages.forEach(section => {

      section.classList.remove(
        "active-page"
      );

    });


    const selectedPage =
      document.getElementById(
        page + "Page"
      );

    if (selectedPage) {

      selectedPage.classList.add(
        "active-page"
      );

    }

  });

});


/* =========================
   DASHBOARD → AI HELPDESK
========================= */

const dashboardForm =
  document.getElementById(
    "dashboardForm"
  );

const dashboardInput =
  document.getElementById(
    "dashboardInput"
  );


dashboardForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    const question =
      dashboardInput.value.trim();

    if (!question) {

      dashboardInput.focus();

      return;

    }

    openHelpdesk(question);

  }
);


/* =========================
   OPEN AI HELPDESK
========================= */

function openHelpdesk(question = "") {

  navItems.forEach(nav =>
    nav.classList.remove("active")
  );


  const helpdeskNav =
    document.querySelector(
      '[data-page="helpdesk"]'
    );

  helpdeskNav.classList.add("active");


  pages.forEach(page =>
    page.classList.remove(
      "active-page"
    )
  );


  document
    .getElementById("helpdeskPage")
    .classList.add("active-page");


  if (question) {

    setTimeout(() => {

      chatInput.value = question;

      chatForm.dispatchEvent(
        new Event("submit")
      );

    }, 100);

  }

}


/* =========================
   CHAT
========================= */

const chatForm =
  document.getElementById(
    "chatForm"
  );

const chatInput =
  document.getElementById(
    "chatInput"
  );

const messages =
  document.getElementById(
    "messages"
  );


/* =========================
   SUGGESTION BUTTONS
========================= */

document
  .querySelectorAll(".suggestions button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        chatInput.value =
          button.textContent.trim();

        chatForm.dispatchEvent(
          new Event("submit")
        );

      }
    );

  });


/* =========================
   SEND MESSAGE
========================= */

chatForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    const question =
      chatInput.value.trim();

    if (!question) {

      chatInput.focus();

      return;

    }


    /* USER MESSAGE */

    addMessage(
      question,
      "user"
    );


    chatInput.value = "";


    /* FAKE AI RESPONSE */

    setTimeout(() => {

      generateDemoResponse(
        question
      );

    }, 700);

  }
);


/* =========================
   ADD MESSAGE
========================= */

function addMessage(
  text,
  type,
  source = null
) {

  const message =
    document.createElement("div");

  message.className =
    `message ${type}`;


  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";


  bubble.textContent =
    text;


  if (source) {

    const sources =
      document.createElement("div");

    sources.className =
      "sources";


    sources.innerHTML = `
      <strong>Source</strong>
      <div class="source">
        📄 ${source}
      </div>
    `;

    bubble.appendChild(
      sources
    );

  }


  message.appendChild(
    bubble
  );


  messages.appendChild(
    message
  );


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================
   DEMO AI
========================= */

function generateDemoResponse(
  question
) {

  const lower =
    question.toLowerCase();


  /*
    DEMO ONLY.

    This will eventually be replaced
    by your real backend + Gemini + RAG.
  */


  if (
    lower.includes("enrollment") ||
    lower.includes("enrol")
  ) {

    addMessage(
      "I found verified information related to enrollment. For the exact requirements and current procedures, please refer to the university's official enrollment guide.",
      "ai",
      "University Enrollment Guide"
    );

    return;

  }


  if (
    lower.includes("library")
  ) {

    addMessage(
      "I found information related to library services. The verified library guide contains the current rules and procedures.",
      "ai",
      "University Library Guide"
    );

    return;

  }


  if (
    lower.includes("it") ||
    lower.includes("computer") ||
    lower.includes("wifi") ||
    lower.includes("internet")
  ) {

    addMessage(
      "I found verified information related to IT support. Please refer to the university IT support guide for the applicable troubleshooting steps.",
      "ai",
      "IT Support Guide"
    );

    return;

  }


  /* FALLBACK */

  addMessage(
    "I don't have enough verified information to answer that accurately.",
    "ai"
  );


  const fallback =
    document.createElement("div");

  fallback.className =
    "message ai";


  fallback.innerHTML = `
    <div class="message-bubble">

      You can check the appropriate
      university office for further
      assistance.

      <div class="sources">

        <strong>Need further assistance?</strong>

        <div class="source">
          View Support Contacts →
        </div>

      </div>

    </div>
  `;


  messages.appendChild(
    fallback
  );


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================
   TOPIC BUTTONS
========================= */

document
  .querySelectorAll(".topic")
  .forEach(topic => {

    topic.addEventListener(
      "click",
      () => {

        openHelpdesk(
          `I have a question about ${topic.textContent}.`
        );

      }
    );

  });


/* =========================
   VIEW ALL TOPICS
========================= */

const allTopicsBtn =
  document.getElementById(
    "allTopicsBtn"
  );

const topicList =
  document.getElementById(
    "topicList"
  );


allTopicsBtn.addEventListener(
  "click",
  () => {

    const topics = [
      "Student Affairs",
      "Facilities",
      "Scholarships",
      "Events"
    ];


    topics.forEach(name => {

      const button =
        document.createElement("button");

      button.className =
        "topic";

      button.textContent =
        name;


      button.addEventListener(
        "click",
        () => {

          openHelpdesk(
            `I have a question about ${name}.`
          );

        }
      );


      topicList.appendChild(
        button
      );

    });


    allTopicsBtn.textContent =
      "All topics shown";

    allTopicsBtn.disabled =
      true;

  }
);


/* =========================
   NEW CHAT
========================= */

document
  .getElementById("newChat")
  .addEventListener(
    "click",
    () => {

      messages.innerHTML = `

        <div class="welcome">

          <img
            src="assets/eagle.png"
            alt="EagleDesk"
          >

          <h2>
            How can I help?
          </h2>

          <p>
            Ask me about university services,
            procedures, and student concerns.
          </p>

        </div>


        <div class="suggestions">

          <button>
            What are the enrollment requirements?
          </button>

          <button>
            Where can I get my student records?
          </button>

          <button>
            How can I contact IT support?
          </button>

          <button>
            What are the library rules?
          </button>

        </div>

      `;


      /* Reconnect suggestion buttons */

      document
        .querySelectorAll(
          ".suggestions button"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              chatInput.value =
                button.textContent.trim();

              chatForm.dispatchEvent(
                new Event("submit")
              );

            }
          );

        });

    }
  );