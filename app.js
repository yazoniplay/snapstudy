document.addEventListener("DOMContentLoaded", function () {
  /* =====================================================
     ELEMENTS
  ===================================================== */

  const modal = document.getElementById("addSchoolworkModal");
  const addButton = document.getElementById("addSchoolworkButton");
  const navAddButton = document.getElementById("navAddButton");
  const modalClose = document.getElementById("modalClose");

  const cameraOption = document.getElementById("cameraOption");
  const imageOption = document.getElementById("imageOption");
  const pdfOption = document.getElementById("pdfOption");
  const textOption = document.getElementById("textOption");

  const cameraInput = document.getElementById("cameraInput");
  const imageInput = document.getElementById("imageInput");
  const pdfInput = document.getElementById("pdfInput");

  const taskList = document.getElementById("taskList");
  const taskCount = document.getElementById("taskCount");
  const emptyState = document.getElementById("emptyState");

  const progressFill = document.getElementById("progressFill");
  const progressNumber = document.getElementById("progressNumber");

  const startAssignmentButton =
    document.getElementById("startAssignmentButton");

  const viewAllButton =
    document.getElementById("viewAllButton");

  const profileButton =
    document.getElementById("profileButton");


  /* =====================================================
     DATA
  ===================================================== */

  const DEFAULT_TASKS = [
    {
      id: "math-1",
      subject: "Mathematics",
      title: "Complete exercises 1–20",
      duration: "35 min",
      due: "Due today",
      completed: false
    },
    {
      id: "english-1",
      subject: "English",
      title: "Read pages 42–48",
      duration: "20 min",
      due: "Today",
      completed: false
    },
    {
      id: "biology-1",
      subject: "Biology",
      title: "Finish questions 1–8",
      duration: "15 min",
      due: "Today",
      completed: false
    }
  ];

  let tasks = loadTasks();


  /* =====================================================
     STORAGE
  ===================================================== */

  function loadTasks() {
    try {
      const saved = localStorage.getItem("school_tasks");

      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Could not load tasks:", error);
    }

    return DEFAULT_TASKS;
  }


  function saveTasks() {
    localStorage.setItem(
      "school_tasks",
      JSON.stringify(tasks)
    );
  }


  /* =====================================================
     MODAL
  ===================================================== */

  function openModal() {
    if (!modal) return;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
  }


  function closeModal() {
    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
  }


  addButton?.addEventListener("click", openModal);
  navAddButton?.addEventListener("click", openModal);
  modalClose?.addEventListener("click", closeModal);


  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });


  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });


  /* =====================================================
     FILE PICKERS
  ===================================================== */

  cameraOption?.addEventListener("click", () => {
    cameraInput?.click();
  });


  imageOption?.addEventListener("click", () => {
    imageInput?.click();
  });


  pdfOption?.addEventListener("click", () => {
    pdfInput?.click();
  });


  cameraInput?.addEventListener("change", handleFile);
  imageInput?.addEventListener("change", handleFile);
  pdfInput?.addEventListener("change", handleFile);


  async function handleFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    closeModal();
    showProcessing();

    try {
      /*
       * Images can be sent directly to Gemini.
       * PDFs are left supported by the UI, but we don't
       * send them yet because we'll add PDF handling next.
       */

      if (file.type === "application/pdf") {
        hideProcessing();

        alert(
          "PDF upload is coming next. For now, use a photo, screenshot, or pasted text."
        );

        event.target.value = "";
        return;
      }

      if (!file.type.startsWith("image/")) {
        hideProcessing();

        alert("Please select an image or screenshot.");

        event.target.value = "";
        return;
      }

      const dataUrl = await readFileAsDataURL(file);

      const base64 = dataUrl.split(",")[1];

      const result = await analyzeSchoolwork({
        imageBase64: base64,
        mimeType: file.type
      });

      hideProcessing();

      addAIResults(result);

    } catch (error) {
      console.error("AI processing error:", error);

      hideProcessing();

      alert(
        error.message ||
        "Something went wrong while reading your schoolwork."
      );
    }

    event.target.value = "";
  }


  /* =====================================================
     TEXT INPUT
  ===================================================== */

  textOption?.addEventListener("click", async () => {
    const text = prompt(
      "Paste your teacher's instructions or assignment here:"
    );

    if (!text || !text.trim()) {
      return;
    }

    closeModal();
    showProcessing();

    try {
      const result = await analyzeSchoolwork({
        text: text.trim()
      });

      hideProcessing();

      addAIResults(result);

    } catch (error) {
      console.error("AI text processing error:", error);

      hideProcessing();

      alert(
        error.message ||
        "Something went wrong while reading the assignment."
      );
    }
  });


  /* =====================================================
     GEMINI API
  ===================================================== */

  async function analyzeSchoolwork(input) {

    const response = await fetch("/api/analyze", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(input)
    });


    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }


    if (!response.ok) {
      console.error("Analyze API error:", data);

      throw new Error(
        data?.error ||
        "AI analysis failed."
      );
    }


    if (!data?.tasks || !Array.isArray(data.tasks)) {
      throw new Error(
        "The AI returned an unexpected result."
      );
    }


    return data;
  }


  /* =====================================================
     ADD AI RESULTS
  ===================================================== */

  function addAIResults(result) {

    if (!result.tasks.length) {
      alert(
        "I couldn't find any clear assignments in that."
      );

      return;
    }


    const newTasks = result.tasks.map((task, index) => {

      const estimatedMinutes =
        Number.isFinite(task.estimatedMinutes)
          ? task.estimatedMinutes
          : null;


      return {
        id: `ai-${Date.now()}-${index}`,

        subject:
          task.subject?.trim() ||
          "Schoolwork",

        title:
          task.title?.trim() ||
          "New assignment",

        duration:
          estimatedMinutes
            ? `${estimatedMinutes} min`
            : "—",

        due:
          formatDueDate(task.dueDate),

        priority:
          task.priority ||
          "medium",

        completed: false
      };

    });


    tasks = [
      ...newTasks,
      ...tasks
    ];


    saveTasks();
    renderTasks();


    if (newTasks.length === 1) {

      alert(
        `Added: ${newTasks[0].subject} — ${newTasks[0].title}`
      );

    } else {

      alert(
        `Added ${newTasks.length} assignments to your schoolwork.`
      );

    }
  }


  /* =====================================================
     FILE READER
  ===================================================== */

  function readFileAsDataURL(file) {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();


      reader.onload = () => {
        resolve(reader.result);
      };


      reader.onerror = () => {
        reject(
          new Error("Could not read the selected file.")
        );
      };


      reader.readAsDataURL(file);

    });

  }


  /* =====================================================
     DUE DATE FORMATTING
  ===================================================== */

  function formatDueDate(dateString) {

    if (!dateString) {
      return "Not set";
    }


    const date = new Date(dateString);


    if (Number.isNaN(date.getTime())) {
      return dateString;
    }


    const today = new Date();

    const todayDate =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );


    const targetDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );


    const difference =
      Math.round(
        (targetDate - todayDate) /
        (1000 * 60 * 60 * 24)
      );


    if (difference === 0) {
      return "Due today";
    }


    if (difference === 1) {
      return "Due tomorrow";
    }


    if (difference === -1) {
      return "Due yesterday";
    }


    return `Due ${date.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric"
      }
    )}`;

  }


  /* =====================================================
     PROCESSING UI
  ===================================================== */

  function showProcessing() {

    if (!modal) return;


    const content =
      modal.querySelector(".modal-content");


    if (!content) return;


    content.dataset.originalHTML =
      content.innerHTML;


    content.innerHTML = `
      <div class="processing">

        <div class="processing-spinner"></div>

        <p>
          Reading your schoolwork...
        </p>

        <small>
          AI is extracting your assignments
        </small>

      </div>
    `;


    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

  }


  function hideProcessing() {

    if (!modal) return;


    const content =
      modal.querySelector(".modal-content");


    if (!content) return;


    if (content.dataset.originalHTML) {

      content.innerHTML =
        content.dataset.originalHTML;


      delete content.dataset.originalHTML;


      reconnectModalButtons();

    }


    closeModal();

  }


  function reconnectModalButtons() {

    const newClose =
      document.getElementById("modalClose");

    const newCamera =
      document.getElementById("cameraOption");

    const newImage =
      document.getElementById("imageOption");

    const newPdf =
      document.getElementById("pdfOption");

    const newText =
      document.getElementById("textOption");


    newClose?.addEventListener(
      "click",
      closeModal
    );


    newCamera?.addEventListener(
      "click",
      () => {
        cameraInput?.click();
      }
    );


    newImage?.addEventListener(
      "click",
      () => {
        imageInput?.click();
      }
    );


    newPdf?.addEventListener(
      "click",
      () => {
        pdfInput?.click();
      }
    );


    newText?.addEventListener(
      "click",
      () => {

        const text =
          prompt(
            "Paste your teacher's instructions or assignment here:"
          );


        if (!text?.trim()) return;


        closeModal();

        showProcessing();


        analyzeSchoolwork({
          text: text.trim()
        })
          .then(addAIResults)
          .catch(error => {

            console.error(error);

            alert(
              error.message ||
              "AI analysis failed."
            );

          })
          .finally(hideProcessing);

      }
    );

  }


  /* =====================================================
     TASK RENDERING
  ===================================================== */

  function renderTasks() {

    if (!taskList) return;


    taskList.innerHTML = "";


    if (tasks.length === 0) {

      if (emptyState) {
        emptyState.style.display = "block";
      }


      updateStats();

      return;
    }


    if (emptyState) {
      emptyState.style.display = "none";
    }


    tasks.forEach((task) => {

      const label =
        document.createElement("label");


      label.className =
        `task${task.completed ? " completed" : ""}`;


      label.dataset.id =
        task.id;


      label.innerHTML = `

        <input
          type="checkbox"
          class="task-checkbox"
          ${task.completed ? "checked" : ""}
        >

        <div class="task-content">

          <div class="task-title">
            ${escapeHTML(task.subject)}
          </div>

          <div class="task-subtitle">
            ${escapeHTML(task.title)}
          </div>

        </div>

        <span class="task-date">
          ${escapeHTML(task.duration)}
        </span>

      `;


      const checkbox =
        label.querySelector(
          ".task-checkbox"
        );


      checkbox.addEventListener(
        "change",
        () => {
          toggleTask(task.id);
        }
      );


      taskList.appendChild(label);

    });


    updateStats();

  }


  function toggleTask(id) {

    const task =
      tasks.find(
        item => item.id === id
      );


    if (!task) return;


    task.completed =
      !task.completed;


    saveTasks();
    renderTasks();

  }


  /* =====================================================
     STATS
  ===================================================== */

  function updateStats() {

    const total =
      tasks.length;


    const completed =
      tasks.filter(
        task => task.completed
      ).length;


    const percentage =
      total === 0
        ? 0
        : Math.round(
            (completed / total) * 100
          );


    if (taskCount) {

      taskCount.textContent =
        `· ${total}`;

    }


    if (progressNumber) {

      progressNumber.textContent =
        `${completed} / ${total} completed`;

    }


    if (progressFill) {

      progressFill.style.width =
        `${percentage}%`;

    }

  }


  /* =====================================================
     PRIORITY
  ===================================================== */

  startAssignmentButton?.addEventListener(
    "click",
    () => {

      const priorityTask =
        findPriorityTask();


      if (!priorityTask) {

        alert(
          "You're all caught up."
        );

        return;

      }


      priorityTask.completed = true;


      saveTasks();
      renderTasks();


      alert(
        `${priorityTask.subject} is marked as completed.`
      );

    }
  );


  function findPriorityTask() {

    const incomplete =
      tasks.filter(
        task => !task.completed
      );


    if (!incomplete.length) {
      return null;
    }


    const priorityScore = {
      high: 3,
      medium: 2,
      low: 1
    };


    return incomplete.sort(
      (a, b) =>
        (priorityScore[b.priority] || 2) -
        (priorityScore[a.priority] || 2)
    )[0];

  }


  viewAllButton?.addEventListener(
    "click",
    () => {

      document
        .querySelector(".tasks-section")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    }
  );


  /* =====================================================
     BOTTOM NAV
  ===================================================== */

  const navButtons =
    document.querySelectorAll(
      ".nav-button"
    );


  navButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;


        if (page === "add") {

          openModal();

          return;

        }


        navButtons.forEach(item => {

          item.classList.remove(
            "active"
          );

        });


        button.classList.add(
          "active"
        );


        if (page === "home") {

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

        }


        if (page === "tasks") {

          document
            .querySelector(".tasks-section")
            ?.scrollIntoView({
              behavior: "smooth"
            });

        }


        if (page === "calendar") {

          document
            .querySelector(".upcoming-section")
            ?.scrollIntoView({
              behavior: "smooth"
            });

        }


        if (page === "profile") {

          openSettings();

        }

      }
    );

  });


  /* =====================================================
     PROFILE / SETTINGS
  ===================================================== */

  profileButton?.addEventListener(
    "click",
    openSettings
  );


  function openSettings() {

    const darkMode =
      document.documentElement.dataset.theme !== "light";


    const choice =
      prompt(
        `Settings\n\n` +
        `1 — ${darkMode
          ? "Switch to light mode"
          : "Switch to dark mode"}\n` +
        `2 — Clear all tasks\n` +
        `3 — Cancel`
      );


    if (choice === "1") {

      toggleTheme();

    }


    if (choice === "2") {

      const confirmed =
        confirm(
          "Delete all your tasks?"
        );


      if (confirmed) {

        tasks = [];

        saveTasks();
        renderTasks();

      }

    }

  }


  /* =====================================================
     THEME
  ===================================================== */

  function getSavedTheme() {

    return localStorage.getItem(
      "school_theme"
    );

  }


  function getSystemTheme() {

    return window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches
      ? "light"
      : "dark";

  }


  function applyTheme(theme) {

    document.documentElement.dataset.theme =
      theme;


    localStorage.setItem(
      "school_theme",
      theme
    );

  }


  function toggleTheme() {

    const current =
      document.documentElement.dataset.theme ||
      "dark";


    const next =
      current === "dark"
        ? "light"
        : "dark";


    applyTheme(next);

  }


  const savedTheme =
    getSavedTheme();


  applyTheme(
    savedTheme ||
    getSystemTheme()
  );


  /* =====================================================
     SEARCH
  ===================================================== */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {

        event.preventDefault();


        const query =
          prompt(
            "Search your schoolwork:"
          );


        if (!query?.trim()) {
          return;
        }


        const search =
          query.toLowerCase();


        const matches =
          tasks.filter(task =>
            `${task.subject} ${task.title}`
              .toLowerCase()
              .includes(search)
          );


        if (matches.length === 0) {

          alert(
            `No schoolwork found for "${query}".`
          );


          return;

        }


        alert(
          matches
            .map(
              task =>
                `• ${task.subject} — ${task.title}`
            )
            .join("\n")
        );

      }

    }
