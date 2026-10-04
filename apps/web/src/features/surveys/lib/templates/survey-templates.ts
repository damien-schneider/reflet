import { PRODUCT_TEMPLATES } from "@/features/surveys/lib/templates/product-templates";
import { SATISFACTION_TEMPLATES } from "@/features/surveys/lib/templates/satisfaction-templates";
import type { SurveyTemplate } from "@/features/surveys/lib/templates/template-draft";

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  ...SATISFACTION_TEMPLATES,
  ...PRODUCT_TEMPLATES,
];
