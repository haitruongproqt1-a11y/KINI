export const securityQuestions = [
  { id: "first_school", label: "Tên trường tiểu học đầu tiên của bạn là gì?" },
  { id: "childhood_nickname", label: "Biệt danh thời thơ ấu của bạn là gì?" },
  { id: "first_pet", label: "Tên thú cưng đầu tiên của bạn là gì?" },
  { id: "favorite_teacher", label: "Tên giáo viên bạn nhớ nhất là gì?" },
  { id: "favorite_place", label: "Địa điểm bạn yêu thích khi còn nhỏ là ở đâu?" },
] as const;

export type SecurityQuestionId = (typeof securityQuestions)[number]["id"];

export function isSecurityQuestionId(value: string): value is SecurityQuestionId {
  return securityQuestions.some((question) => question.id === value);
}

export function securityQuestionLabel(value: string): string | null {
  return securityQuestions.find((question) => question.id === value)?.label ?? null;
}
