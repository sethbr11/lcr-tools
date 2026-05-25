/**
 * Templates for the Member Flashcards action.
 * Contains HTML templates for the flashcard interface and modal.
 */
(() => {
  if (utils.returnIfLoaded("memberFlashcardsTemplates")) return;

  /**
   * Template for individual flashcard
   */
  const flashcardTemplate = `
    <div class="lcr-tools-flashcard" id="lcr-tools-flashcard-{index}">
      <div class="lcr-tools-flashcard-inner">
        <div class="lcr-tools-flashcard-front">
          <div class="lcr-tools-flashcard-photo-container">
            <img class="lcr-tools-flashcard-photo" src="{photoUrl}" alt="Member Photo" />
          </div>
          <div class="lcr-tools-flashcard-instruction">
            <p>Click or press SPACE to reveal name</p>
          </div>
        </div>
        <div class="lcr-tools-flashcard-back">
          <div class="lcr-tools-flashcard-name-container">
            <h4 class="lcr-tools-flashcard-name">{fullName}</h4>
          </div>
          <div class="lcr-tools-flashcard-instruction">
            <p>Click or press SPACE to show photo again</p>
          </div>
        </div>
      </div>
    </div>
  `;

  /**
   * Template for flashcard controls
   */
  const flashcardControlsTemplate = `
    <div class="lcr-tools-flashcard-controls">
      <div class="lcr-tools-flashcard-nav">
        <button type="button" class="lcr-tools-btn lcr-tools-btn-secondary" id="lcr-tools-flashcard-prev">
          ← Previous
        </button>
        <span class="lcr-tools-flashcard-counter">
          <span id="lcr-tools-flashcard-current">1</span> / <span id="lcr-tools-flashcard-total">1</span>
        </span>
        <button type="button" class="lcr-tools-btn lcr-tools-btn-secondary" id="lcr-tools-flashcard-next">
          Next →
        </button>
      </div>
      <div class="lcr-tools-flashcard-shortcuts">
        <small>Keyboard shortcuts: ← → (navigate), SPACE (flip), ESC (close)</small>
      </div>
    </div>
  `;

  /**
   * Template for flashcard CSS styles
   */
  const flashcardStylesTemplate = `
    <style id="lcr-tools-flashcard-styles">
      #lcr-tools-flashcard-modal .modal-body {
        text-align: center;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 500px;
      }

      #lcr-tools-flashcard-container {
        margin-bottom: 25px;
      }

      .lcr-tools-flashcard {
        width: 350px;
        height: 450px;
        margin: 0 auto 25px;
        perspective: 1000px;
        cursor: pointer;
      }

      .lcr-tools-flashcard-inner {
        position: relative;
        width: 100%;
        height: 100%;
        text-align: center;
        transition: transform 0.6s;
        transform-style: preserve-3d;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .lcr-tools-flashcard.flipped .lcr-tools-flashcard-inner {
        transform: rotateY(180deg);
      }

      .lcr-tools-flashcard-front,
      .lcr-tools-flashcard-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
      }

      .lcr-tools-flashcard-front {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .lcr-tools-flashcard-back {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        transform: rotateY(180deg);
      }

      .lcr-tools-flashcard-photo-container {
        width: 240px;
        height: 240px;
        border-radius: 50%;
        overflow: hidden;
        margin-bottom: 20px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .lcr-tools-flashcard-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .lcr-tools-flashcard-name-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
      }

      .lcr-tools-flashcard-name {
        font-size: 2rem;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        line-height: 1.2;
      }

      .lcr-tools-flashcard-instruction {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0.9;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .lcr-tools-flashcard-controls {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
      }

      .lcr-tools-flashcard-nav {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .lcr-tools-flashcard-counter {
        font-size: 1.1rem;
        font-weight: 600;
        color: #333;
        min-width: 80px;
        text-align: center;
      }

      .lcr-tools-flashcard-actions {
        display: flex;
        gap: 10px;
      }

      .lcr-tools-flashcard-shortcuts {
        margin-top: 15px;
        color: #666;
        font-size: 0.85rem;
      }

      .lcr-tools-flashcard-shortcuts small {
        opacity: 0.8;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .lcr-tools-modal-content {
          width: 95vw;
          margin: 20px;
        }

        .lcr-tools-flashcard {
          width: 300px;
          height: 400px;
        }

        .lcr-tools-flashcard-photo-container {
          width: 200px;
          height: 200px;
        }

        .lcr-tools-flashcard-name {
          font-size: 2rem;
        }

        .lcr-tools-flashcard-nav {
          flex-direction: column;
          gap: 10px;
        }

        .lcr-tools-flashcard-actions {
          flex-direction: column;
          width: 100%;
        }

        .lcr-tools-btn {
          width: 100%;
        }
      }
    </style>
  `;

  /**
   * Modal content wrapper for the flashcards modal
   */
  const flashcardModalContentTemplate = `
    <div id="lcr-tools-flashcard-container">
      <!-- Flashcard content will be inserted here -->
    </div>
    <div id="lcr-tools-flashcard-controls">
      ${flashcardControlsTemplate}
    </div>
  `;

  window.memberFlashcardsTemplates = {
    flashcardTemplate,
    flashcardControlsTemplate,
    flashcardStylesTemplate,
    flashcardModalContentTemplate,
  };
})();
