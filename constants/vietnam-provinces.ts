/** 34 đơn vị hành chính cấp tỉnh theo sắp xếp 2025; dùng thống nhất cho hồ sơ và bộ lọc Nearby. */
export const vietnamProvinces = [
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Nội", "Hà Tĩnh", "Hải Phòng", "Hưng Yên", "Huế", "Khánh Hòa", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh", "Thái Nguyên", "Thanh Hóa", "Thành phố Hồ Chí Minh", "Tuyên Quang", "Vĩnh Long",
] as const;

export type VietnamProvince = (typeof vietnamProvinces)[number];
