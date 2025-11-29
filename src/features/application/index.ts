/**
 * Application Feature - 설문 폼
 */

// Components
export { FileUpload } from './components/FileUpload';
export { ProgressBar } from './components/ProgressBar';
export { QuestionStep } from './components/QuestionStep';

// Hooks & Store
export { useApplicationStore } from './hooks/use-application';

// Constants & Types
export type { Question, Option, QuestionType } from './constants/questions';
export {
    QUESTIONS,
    START_QUESTION_ID,
    COHORT_INFO,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
} from './constants/questions';

// Layout & Animation Constants
export { LAYOUT, PROGRESS_BAR, BUTTON_SPACING, TEXT_STYLES } from './constants/layout';
export { fadeIn, fadeInUp, staggerChild, errorAnimation, EASE_SMOOTH } from './constants/animation';

// Validation utilities
export {
    isValidPhoneNumber,
    formatPhoneNumber,
    calculateAge,
    isAdult,
    isValidBirthdate,
    isValidFileSize,
    isValidImageType,
} from './lib/validation';
