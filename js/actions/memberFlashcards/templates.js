/**
 * Templates for the Member Flashcards action.
 * Contains HTML templates for the flashcard interface and modal.
 */
(() => {
  utils.returnIfLoaded("memberFlashcardsTemplates");

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
      <div class="lcr-tools-flashcard-actions">
        <button type="button" class="lcr-tools-btn lcr-tools-btn-primary" id="lcr-tools-flashcard-shuffle">
          🔀 Shuffle
        </button>
        <button type="button" class="lcr-tools-btn lcr-tools-btn-secondary" id="lcr-tools-flashcard-reset">
          ↩️ Reset to First
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
        min-height: 600px;
      }

      #lcr-tools-flashcard-container {
        margin-bottom: 30px;
      }

      .lcr-tools-flashcard {
        width: 400px;
        height: 500px;
        margin: 0 auto 30px;
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
        width: 280px;
        height: 280px;
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
        font-size: 2.5rem;
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
        font-size: 0.9rem;
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

      .lcr-tools-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }

      .lcr-tools-btn-primary {
        background: #007bff;
        color: white;
      }

      .lcr-tools-btn-primary:hover {
        background: #0056b3;
        transform: translateY(-1px);
      }

      .lcr-tools-btn-secondary {
        background: #6c757d;
        color: white;
      }

      .lcr-tools-btn-secondary:hover {
        background: #545b62;
        transform: translateY(-1px);
      }

      .lcr-tools-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
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

  window.memberFlashcardsTemplates = {
    flashcardTemplate,
    flashcardControlsTemplate,
    flashcardStylesTemplate,
  };
})();
