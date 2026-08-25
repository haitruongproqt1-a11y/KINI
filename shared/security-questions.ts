export const securityQuestions = [
  { id: "first_school", label: "Tên trường tiểu học đầu tiên của bạn là gì?" },
  { id: "childhood_nickname", label: "Biệt danh thời thơ ấu của bạn là gì?" },
  { id: "first_pet", label: "Tên thú cưng đầu tiên của bạn là gì?" },
  { id: "favorite_teacher", label: "Tên giáo viên bạn nhớ nhất là gì?" },
  { id: "favorite_place", label: "Địa điểm bạn yêu thích khi còn nhỏ là ở đâu?" },
  { id: "first_job", label: "Công việc đầu tiên của bạn là gì?" },
  { id: "favorite_book", label: "Cuốn sách bạn yêu thích nhất là gì?" },
  { id: "favorite_food", label: "Món ăn bạn yêu thích nhất là gì?" },
  { id: "birth_city", label: "Bạn sinh ra ở thành phố hoặc tỉnh nào?" },
  { id: "dream_job", label: "Nghề nghiệp mơ ước khi còn nhỏ của bạn là gì?" },
  { id: "first_trip", label: "Chuyến du lịch đầu tiên bạn nhớ là đến đâu?" },
  { id: "favorite_sport", label: "Môn thể thao bạn yêu thích là gì?" },
  { id: "childhood_friend", label: "Tên người bạn thời thơ ấu thân nhất của bạn là gì?" },
  { id: "favorite_song", label: "Bài hát bạn yêu thích nhất là gì?" },
  { id: "lucky_number", label: "Con số may mắn của bạn là gì?" },
] as const;

export type SecurityQuestionId = (typeof securityQuestions)[number]["id"];

export function isSecurityQuestionId(value: string): value is SecurityQuestionId {
  return securityQuestions.some((question) => question.id === value);
}

export function securityQuestionLabel(value: string): string | null {
  return securityQuestions.find((question) => question.id === value)?.label ?? null;
}
