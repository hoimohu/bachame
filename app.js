document.addEventListener("DOMContentLoaded", () => {
  let db;
  const request = indexedDB.open("flashcardDB", 2);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("flashcards")) {
      const objectStore = db.createObjectStore("flashcards", { keyPath: "id", autoIncrement: true });
      objectStore.createIndex("question", "question", { unique: false });
      objectStore.createIndex("answer", "answer", { unique: false });
      objectStore.createIndex("category", "category", { unique: false });
    } else {
      const objectStore = event.target.transaction.objectStore("flashcards");
      if (!objectStore.indexNames.contains("category")) {
        objectStore.createIndex("category", "category", { unique: false });
      }
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    displayFlashcard();
    displayFlashcardList();
  };

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
  };

  const flashcardContainer = document.getElementById("flashcard-container");
  const answerInput = document.getElementById("answer-input");
  const submitAnswerButton = document.getElementById("submit-answer");
  const resultDiv = document.getElementById("result");
  const newQuestionInput = document.getElementById("new-question");
  const newAnswerInput = document.getElementById("new-answer");
  const newCategoryInput = document.getElementById("new-category");
  const addFlashcardButton = document.getElementById("add-flashcard");
  const reloadFlashcardButton = document.createElement("button");
  const categorySelect = document.getElementById("category-select");
  const flashcardListContainer = document.getElementById("flashcard-list-container");
  const toggleFlashcardListButton = document.getElementById("toggle-flashcard-list");
  const exportFlashcardsButton = document.getElementById("export-flashcards");
  const importFileInput = document.getElementById("import-file");
  const importFlashcardsButton = document.getElementById("import-flashcards");

  let isEditing = false;
  let editingId = null;

  reloadFlashcardButton.textContent = "もう一度選択";
  submitAnswerButton.after(reloadFlashcardButton);

  function displayFlashcard() {
    if (!db) {
      console.error("Database is not initialized.");
      return;
    }
    const selectedCategory = categorySelect.value;
    const transaction = db.transaction(["flashcards"], "readonly");
    const objectStore = transaction.objectStore("flashcards");
    const index = objectStore.index("category");
    const request = selectedCategory ? index.getAll(selectedCategory) : objectStore.getAll();

    request.onsuccess = (event) => {
      const flashcards = event.target.result;
      if (flashcards.length > 0) {
        const flashcard = flashcards[Math.floor(Math.random() * flashcards.length)];
        flashcardContainer.textContent = flashcard.question;
        flashcardContainer.dataset.answer = flashcard.answer;
      } else {
        flashcardContainer.textContent = "問題がありません。";
      }
    };
  }

  function checkAnswer() {
    const userAnswer = answerInput.value.trim();
    const correctAnswer = flashcardContainer.dataset.answer;
    if (userAnswer === correctAnswer) {
      resultDiv.textContent = "正解！";
      resultDiv.className = "correct";
    } else {
      resultDiv.textContent = `不正解。正しい答えは「${correctAnswer}」です。`;
      resultDiv.className = "incorrect";
    }
    answerInput.value = "";
    displayFlashcard();
  }

  function addFlashcard() {
    if (!isEditing) {
      const newQuestion = newQuestionInput.value.trim();
      const newAnswer = newAnswerInput.value.trim();
      const newCategory = newCategoryInput.value.trim();
      if (newQuestion && newAnswer && newCategory) {
        const transaction = db.transaction(["flashcards"], "readwrite");
        const objectStore = transaction.objectStore("flashcards");
        const flashcard = { question: newQuestion, answer: newAnswer, category: newCategory };
        objectStore.add(flashcard);

        transaction.oncomplete = () => {
          newQuestionInput.value = "";
          newAnswerInput.value = "";
          newCategoryInput.value = "";
          displayFlashcard();
          displayFlashcardList();
        };

        transaction.onerror = (event) => {
          console.error("Transaction error:", event.target.errorCode);
        };
      }
    }
  }

  function updateFlashcard() {
    if (isEditing) {
      const updatedQuestion = newQuestionInput.value.trim();
      const updatedAnswer = newAnswerInput.value.trim();
      const updatedCategory = newCategoryInput.value.trim();
      if (updatedQuestion && updatedAnswer && updatedCategory) {
        const transaction = db.transaction(["flashcards"], "readwrite");
        const objectStore = transaction.objectStore("flashcards");
        const flashcard = { id: editingId, question: updatedQuestion, answer: updatedAnswer, category: updatedCategory };
        objectStore.put(flashcard);

        transaction.oncomplete = () => {
          newQuestionInput.value = "";
          newAnswerInput.value = "";
          newCategoryInput.value = "";
          addFlashcardButton.textContent = "追加";
          addFlashcardButton.onclick = addFlashcard;
          isEditing = false;
          editingId = null;
          displayFlashcardList();
        };

        transaction.onerror = (event) => {
          console.error("Transaction error:", event.target.errorCode);
        };
      }
    }
  }

  function displayFlashcardList() {
    if (!db) {
      console.error("Database is not initialized.");
      return;
    }
    const transaction = db.transaction(["flashcards"], "readonly");
    const objectStore = transaction.objectStore("flashcards");
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
      const flashcards = event.target.result;
      flashcardListContainer.innerHTML = "";
      const categories = new Set();
      flashcards.forEach((flashcard) => {
        const flashcardItem = document.createElement("div");
        flashcardItem.className = "flashcard-item";
        flashcardItem.innerHTML = `
          <div>問題: ${flashcard.question}</div>
          <div>答え: ${flashcard.answer}</div>
          <div>カテゴリー: ${flashcard.category}</div>
          <button class="edit-flashcard" data-id="${flashcard.id}">編集</button>
          <button class="delete-flashcard" data-id="${flashcard.id}">削除</button>
        `;
        flashcardListContainer.appendChild(flashcardItem);
        categories.add(flashcard.category);
      });

      document.querySelectorAll(".edit-flashcard").forEach((button) => {
        button.addEventListener("click", (event) => {
          const id = Number(event.target.dataset.id);
          editFlashcard(id);
        });
      });

      document.querySelectorAll(".delete-flashcard").forEach((button) => {
        button.addEventListener("click", (event) => {
          const id = Number(event.target.dataset.id);
          deleteFlashcard(id);
        });
      });

      updateCategorySelect(categories);
    };
  }

  function updateCategorySelect(categories) {
    categorySelect.innerHTML = '<option value="">すべて</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
  }

  function editFlashcard(id) {
    const transaction = db.transaction(["flashcards"], "readonly");
    const objectStore = transaction.objectStore("flashcards");
    const request = objectStore.get(id);

    request.onsuccess = (event) => {
      const flashcard = event.target.result;
      newQuestionInput.value = flashcard.question;
      newAnswerInput.value = flashcard.answer;
      newCategoryInput.value = flashcard.category;
      addFlashcardButton.textContent = "更新";
      addFlashcardButton.onclick = updateFlashcard;
      isEditing = true;
      editingId = id;
    };
  }

  function deleteFlashcard(id) {
    const transaction = db.transaction(["flashcards"], "readwrite");
    const objectStore = transaction.objectStore("flashcards");
    objectStore.delete(id);

    transaction.oncomplete = () => {
      displayFlashcardList();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", event.target.errorCode);
    };
  }

  function toggleFlashcardList() {
    if (flashcardListContainer.classList.contains("hidden")) {
      flashcardListContainer.classList.remove("hidden");
      flashcardListContainer.classList.add("visible");
      toggleFlashcardListButton.textContent = "問題を隠す";
    } else {
      flashcardListContainer.classList.remove("visible");
      flashcardListContainer.classList.add("hidden");
      toggleFlashcardListButton.textContent = "問題を表示";
    }
  }

  function exportFlashcards() {
    const transaction = db.transaction(["flashcards"], "readonly");
    const objectStore = transaction.objectStore("flashcards");
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
      const flashcards = event.target.result;
      const categories = {};
      flashcards.forEach((flashcard) => {
        if (!categories[flashcard.category]) {
          categories[flashcard.category] = [];
        }
        categories[flashcard.category].push(flashcard);
      });

      const blob = new Blob([JSON.stringify(categories, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flashcards.json";
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  function importFlashcards() {
    const file = importFileInput.files[0];
    if (!file) {
      alert("ファイルを選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const categories = JSON.parse(event.target.result);
      const transaction = db.transaction(["flashcards"], "readwrite");
      const objectStore = transaction.objectStore("flashcards");

      for (const category in categories) {
        categories[category].forEach((flashcard) => {
          objectStore.put(flashcard);
        });
      }

      transaction.oncomplete = () => {
        displayFlashcardList();
      };

      transaction.onerror = (event) => {
        console.error("Transaction error:", event.target.errorCode);
      };
    };
    reader.readAsText(file);
  }

  submitAnswerButton.addEventListener("click", checkAnswer);
  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      checkAnswer();
    }
  });
  addFlashcardButton.onclick = addFlashcard;
  reloadFlashcardButton.addEventListener("click", displayFlashcard);
  categorySelect.addEventListener("change", displayFlashcard);
  toggleFlashcardListButton.addEventListener("click", toggleFlashcardList);
  exportFlashcardsButton.addEventListener("click", exportFlashcards);
  importFlashcardsButton.addEventListener("click", importFlashcards);

  displayFlashcard();
  displayFlashcardList();
});