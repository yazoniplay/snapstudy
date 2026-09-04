document.addEventListener("DOMContentLoaded", () => {
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

    await wait(1200);

    hideProcessing();

    alert(
      `"${file.name}" was added.\n\nAI processing will be connected next.`
    );

    event.target.value = "";
  }


  /* =====================================================
     TEXT INPUT
  ===================================================== */

  textOption?.addEventListener("click", () => {
    const text = prompt(
      "Paste your teacher's instructions or assignment here:"
    );

    if (!text || !text.trim()) {
      return;
    }

    closeModal();

    createTaskFromText(text.trim());
  });


  function createTaskFromText(text) {
    const task = {
      id: `task-${Date.now()}`,
      subject: "New assignment",
      title: text.length > 90
        ? `${text.substring(0, 87)}...`
        : text,
      duration: "—",
      due: "Not set",
      completed: false
    };

    tasks.unshift(task);

    saveTasks();
    renderTasks();

    alert("Assignment added to your tasks.");
  }


  /* =====================================================
     PROCESSING UI
  ===================================================== */

  function showProcessing() {
    if (!modal) return;

    const content = modal.querySelector(".modal-content");

    if (!content) return;

    content.dataset.originalHTML = content.innerHTML;

    content.innerHTML = `
      <div class="processing">
        <div class="processing-spinner"></div>

        <p>
          Reading your schoolwork...
        </p>
      </div>
    `;
  }


  function hideProcessing() {
    if (!modal) return;

    const content = modal.querySelector(".modal-content");

    if (!content) return;

    if (content.dataset.originalHTML) {
      content.innerHTML = content.dataset.originalHTML;

      reconnectModalButtons();
    }
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

    newClose?.addEventListener("click", closeModal);

    newCamera?.addEventListener("click", () => {
      cameraInput?.click();
    });

    newImage?.addEventListener("click", () => {
      imageInput?.click();
    });

    newPdf?.addEventListener("click", () => {
      pdfInput?.click();
    });

    newText?.addEventListener("click", () => {
      const text = prompt(
        "Paste your teacher's instructions or assignment here:"
      );

      if (!text?.trim()) return;

      closeModal();
      createTaskFromText(text.trim());
    });
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
      const label = document.createElement("label");

      label.className =
        `task${task.completed ? " completed" : ""}`;

      label.dataset.id = task.id;

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
        label.querySelector(".task-checkbox");


      checkbox.addEventListener("change", () => {
        toggleTask(task.id);
      });


      taskList.appendChild(label);
    });


    updateStats();
  }


  function toggleTask(id) {
    const task = tasks.find(
      (item) => item.id === id
    );

    if (!task) return;

    task.completed = !task.completed;

    saveTasks();
    renderTasks();
  }


  /* =====================================================
     STATS
  ===================================================== */

  function updateStats() {
    const total = tasks.length;

    const completed =
      tasks.filter(task => task.completed).length;

    const percentage =
      total === 0
        ? 0
        : Math.round((completed / total) * 100);


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
        tasks.find(task =>
          !task.completed &&
          task.subject === "Mathematics"
        );

      if (!priorityTask) {
        alert("You're all caught up.");
        return;
      }

      priorityTask.completed = true;

      saveTasks();
      renderTasks();

      alert(
        "Great. Mathematics is marked as completed."
      );
    }
  );


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
    document.querySelectorAll(".nav-button");


  navButtons.forEach(button => {

    button.addEventListener("click", () => {

      const page =
        button.dataset.page;


      if (page === "add") {
        openModal();
        return;
      }


      navButtons.forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");


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

    });

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


    const choice = prompt(
      `Settings\n\n` +
      `1 — ${darkMode ? "Switch to light mode" : "Switch to dark mode"}\n` +
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
    return localStorage.getItem("school_theme");
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
    savedTheme || getSystemTheme()
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
          prompt("Search your schoolwork:");

        if (!query?.trim()) return;


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
            .map(task =>
              `• ${task.subject} — ${task.title}`
            )
            .join("\n")
        );

      }

    }
  );


  /* =====================================================
     UTILITIES
  ===================================================== */

  function wait(ms) {
    return new Promise(resolve =>
      setTimeout(resolve, ms)
    );
  }


  function escapeHTML(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  /* =====================================================
     START
  ===================================================== */

  renderTasks();

});
